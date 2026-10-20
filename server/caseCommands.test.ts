// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { openDatabase } from './db.ts'
import { ProjectStore } from './projectStore.ts'
import { CaseCommands } from './caseCommands.ts'
import { authorizedProject } from './testProject.ts'

describe('server case commands', () => {
  it('quarantines existing approvals as legacy assertions without losing their history', () => {
    const db = openDatabase(':memory:')
    db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').run('alice', 'alice@example.test', 1)
    const projects = new ProjectStore(db, null)
    const { project, findingId } = authorizedProject('legacy', { vendor: 'Acme', invoice: 'INV-1', amount: 100, requested: 100 })
    projects.upsert('alice', project)
    const commands = new CaseCommands(db, projects)
    expect(commands.migrateLegacy()).toBe(1)
    const state = ((projects.get('alice', 'legacy')!.environment as { caseStates: Record<string, { approvedAt: number | null; legacyApprovedAt?: number; requiresRevalidation?: boolean }> }).caseStates[findingId])
    expect(state).toMatchObject({ approvedAt: null, legacyApprovedAt: 100, requiresRevalidation: true })
    expect(commands.migrateLegacy()).toBe(0)
    expect(db.prepare('SELECT action, actor FROM case_events').all()).toEqual([{ action: 'legacy_assertion', actor: null }])
    db.close()
  })

  it('refuses a fresh approval or request while a case still needs revalidation', () => {
    const db = openDatabase(':memory:')
    db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').run('alice', 'alice@example.test', 1)
    const projects = new ProjectStore(db, null)
    const commands = new CaseCommands(db, projects)
    const { project, findingId } = authorizedProject('stale', { vendor: 'Acme', invoice: 'INV-1', amount: 100, requested: 100 })
    Object.assign(project.environment.caseStates[findingId], { requiresRevalidation: true, decision: 'confirmed', reason: null, decidedAt: 100 })
    projects.upsert('alice', project)
    const send = (type: 'approve' | 'request', input: unknown) => commands.execute('alice', 'alice@example.test', 'stale', {
      commandId: randomUUID(), expectedRevision: 1, findingId, type, input,
    })
    const pkg = { subject: 'Duplicate payment', body: 'Please review the payments.', recipientEmail: 'supplier@example.test', requestedAmount: 100, method: 'refund' }
    expect(() => send('approve', { package: pkg, knownBeforeReclaim: false, knownBeforeNote: null })).toThrow(/revalidat/i)
    expect(() => send('request', { requestedAmount: 100 })).toThrow(/revalidat/i)
    db.close()
  })

  it('owns transitions and amounts, rejects stale and cross-account writes, and replays a command once', () => {
    const db = openDatabase(':memory:')
    const addUser = db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)')
    addUser.run('alice', 'alice@example.test', 1)
    addUser.run('bob', 'bob@example.test', 1)
    const projects = new ProjectStore(db, null)
    const commands = new CaseCommands(db, projects)
    const { project, findingId } = authorizedProject('audit1', { vendor: 'Acme', invoice: 'INV-1', amount: 100, requested: 100 })
    const evidence = project.environment.result.findings[0].evidence
    delete (project.environment.result.findings[0] as { evidence?: unknown }).evidence
    project.environment.caseStates = {}
    expect(projects.upsert('alice', project)).toBe(1)
    const send = (type: string, input: unknown, expectedRevision: number, commandId = randomUUID()) =>
      commands.execute('alice', 'alice@example.test', 'audit1', { commandId, expectedRevision, findingId, type, input })

    const decision = send('decision', { decision: 'confirmed', reason: 'I reviewed the two rows.' }, 1)
    expect(decision.revision).toBe(2)
    const evidenceSaved = send('evidence', evidence, 2)
    expect(evidenceSaved.revision).toBe(3)
    const pkg = { subject: 'Duplicate payment', body: 'Please review the two payments.', recipientEmail: 'supplier@example.test', requestedAmount: 100, method: 'refund' }
    expect(() => send('approve', { package: { ...pkg, requestedAmount: 101 }, knownBeforeReclaim: false, knownBeforeNote: null }, 3)).toThrow(/evidenced|within/i)
    const approval = send('approve', { package: pkg, knownBeforeReclaim: false, knownBeforeNote: null }, 3)
    expect(approval.revision).toBe(4)
    const id = randomUUID()
    const request = send('request', { requestedAmount: 100 }, 4, id)
    expect(request.revision).toBe(5)
    expect(send('request', { requestedAmount: 100 }, 4, id)).toMatchObject({ revision: 5, replayed: true })
    expect(() => send('settlement', { amount: 10, method: 'refund', source: 'manual', reference: 'RETURN-1', settledAt: Date.now() }, 4)).toThrow(/another device/i)
    expect(() => commands.execute('bob', 'bob@example.test', 'audit1', { commandId: randomUUID(), expectedRevision: 5, findingId, type: 'settlement', input: { amount: 100, method: 'refund', source: 'manual', reference: 'RETURN-1', settledAt: Date.now() } })).toThrow(/not in this account/i)
    const paid = send('settlement', { amount: 100, method: 'refund', source: 'manual', reference: 'RETURN-1', settledAt: Date.now() }, 5)
    expect(paid.revision).toBe(6)
    expect(((paid.project.environment as { caseStates: Record<string, { recoveredAmount?: number }> }).caseStates[findingId]).recoveredAmount).toBe(100)
    expect(() => send('settlement', { amount: 100, method: 'refund', source: 'manual', reference: 'RETURN-1', settledAt: Date.now() }, 6)).toThrow()
    expect(db.prepare('SELECT action, actor, prior_revision, revision FROM case_events ORDER BY revision').all()).toEqual([
      { action: 'decision', actor: 'alice@example.test', prior_revision: 1, revision: 2 },
      { action: 'evidence', actor: 'alice@example.test', prior_revision: 2, revision: 3 },
      { action: 'approve', actor: 'alice@example.test', prior_revision: 3, revision: 4 },
      { action: 'request', actor: 'alice@example.test', prior_revision: 4, revision: 5 },
      { action: 'settlement', actor: 'alice@example.test', prior_revision: 5, revision: 6 },
    ])
    db.close()
  })
})

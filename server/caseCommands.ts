import { createHash } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import { HttpError } from './http.ts'
import type { ProjectStore } from './projectStore.ts'
import { confirmCase, markExpected, markNeedsInfo, reopenDecision, reopenOutcome, updateRecoveryPackage, withHistory, type CaseState, type RecoveryVerification, type VendorUpdate } from '../src/ledger/caseState.ts'
import { approveRecovery, closeWithoutRecovery, recordEmailSent, recordFollowUpSent, recordVendorUpdate, reconcileRecovery, reopenRemainingBalance, setContactHold, setFollowUpAfterDays, setNextFollowUp, startRecoveryRequest, verifyRecovery } from '../src/recovery/model.ts'
import { assertRecoveryEligible, evaluateEligibility, type RecoveryEvidence } from '../src/recovery/eligibility.ts'
import type { Finding } from '../src/types.ts'

const text = z.string().trim().max(5000)
const money = z.number().finite().positive().refine((n) => Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001)
const method = z.enum(['refund', 'credit', 'offset'])
const packageSchema = z.object({ subject: text.max(300), body: text, recipientEmail: z.email().max(320), requestedAmount: money, method })
const reference = z.object({ reference: text.min(1).max(300) })
const evidenceSchema = z.object({
  entity: reference.extend({ entityId: text.min(1).max(150) }),
  supplier: reference.extend({ supplierId: text.min(1).max(150) }),
  payments: z.array(reference.extend({ recordId: text.min(1).max(150), paymentId: text.min(1).max(150), obligationId: text.min(1).max(150), amountMinor: z.number().int().positive(), currency: z.string().length(3), settled: z.boolean() })).min(2).max(30),
  obligation: reference.extend({ obligationId: text.min(1).max(150), amountMinor: z.number().int().positive(), currency: z.string().length(3) }),
  checks: z.record(z.string(), z.object({ reference: text, confirmed: z.boolean() })),
  contradictions: z.array(text.max(300)).max(30),
  notes: text,
})
const commandSchema = z.object({
  commandId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  findingId: z.string().min(1).max(150),
  type: z.enum(['decision', 'evidence', 'approve', 'approve_and_request', 'request', 'email_sent', 'followup_sent', 'followup_days', 'contact_hold', 'followup', 'vendor_update', 'settlement', 'close', 'reconcile', 'reopen', 'reopen_balance']),
  input: z.unknown(),
})
type Command = z.infer<typeof commandSchema>
type StoredEnvironment = { records?: Array<Record<string, unknown> & { id: string }>; result?: { findings?: Array<Record<string, unknown> & { id: string }> }; caseStates?: Record<string, CaseState>; historicalFindings?: unknown[] }
type EventRow = { command_hash: string; revision: number }

function factFinding(env: StoredEnvironment, findingId: string): Finding | null {
  const row = env.result?.findings?.find((f) => f.id === findingId)
  if (!row) return null
  const records = new Map((env.records ?? []).map((record) => [record.id, record]))
  return { ...row, relatedRecords: ((row.relatedRecords as Array<{ id: string }>) ?? []).map((ref) => records.get(ref.id) ?? ref) } as unknown as Finding
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw new HttpError(400, 'The case command is malformed.', 'validation')
  return result.data
}

function applyCommand(db: DatabaseSync, userId: string, projectId: string, project: Record<string, unknown>, cmd: Command, actor: string, at: number): { project: Record<string, unknown>; sourceRefs: string[] } {
  const env = project.environment as StoredEnvironment | undefined
  const finding = env && factFinding(env, cmd.findingId)
  if (!env || !finding) throw new HttpError(404, 'That case is not in this account.')
  const states = env.caseStates ?? {}
  const prior = states[cmd.findingId] ?? { decision: null, reason: null, decidedAt: null, recoveryStage: null }
  if (prior.requiresRevalidation && (cmd.type === 'approve' || cmd.type === 'approve_and_request' || cmd.type === 'request')) {
    throw new HttpError(409, 'Revalidate the case evidence before approving or recording another request.', 'revalidation_required')
  }
  let next: CaseState = prior
  let revisedFinding: Finding | null = null
  const all = (env.result?.findings ?? []).map((row) => factFinding(env, row.id)!).filter(Boolean)
  try {
    switch (cmd.type) {
      case 'decision': {
        if (prior.recoveryStage === 'requested' || prior.recoveryStage === 'recovered' || prior.recoveryStage === 'not_recovered') throw new Error('A sent request must be resolved before changing the review decision.')
        const data = parse(z.object({ decision: z.enum(['confirmed', 'needs_info', 'expected']), reason: text.nullable() }), cmd.input)
        next = data.decision === 'confirmed' ? confirmCase(data.reason) : data.decision === 'needs_info' ? markNeedsInfo(data.reason) : markExpected(data.reason)
        next.decidedAt = at
        break
      }
      case 'evidence': {
        if (prior.recoveryStage === 'requested' || prior.recoveryStage === 'recovered' || prior.recoveryStage === 'not_recovered') throw new Error('Resolve the open request before replacing its evidence.')
        const raw = parse(evidenceSchema, cmd.input)
        const sourceIds = finding.relatedRecords.map((record) => record.id).sort()
        if (raw.payments.map((payment) => payment.recordId).sort().join('|') !== sourceIds.join('|')) throw new Error('Payment evidence must refer to exactly the source rows in this check.')
        const stamp = <T extends { reference: string }>(entry: T): T & { confirmedBy: string; confirmedAt: number } => ({ ...entry, confirmedBy: actor, confirmedAt: at })
        const evidence: RecoveryEvidence = {
          entity: stamp(raw.entity), supplier: stamp(raw.supplier),
          payments: raw.payments.map(stamp), obligation: stamp(raw.obligation),
          checks: Object.fromEntries(Object.entries(raw.checks).map(([key, value]) => [key, { ...stamp(value), confirmed: value.confirmed }])),
          contradictions: raw.contradictions, notes: raw.notes,
        }
        const candidate = { ...finding, evidence, contradictoryEvidence: [] }
        const gate = evaluateEligibility(candidate, evidence, all)
        revisedFinding = { ...candidate, ...gate, classification: gate.eligible ? 'recovery_candidate' : 'review_needed', class: gate.eligible ? 'recoverable' : 'review', requiresRevalidation: !gate.eligible }
        next = { ...prior, requiresRevalidation: !gate.eligible, approvedAt: null }
        break
      }
      case 'approve':
      case 'approve_and_request': {
        const data = parse(z.object({ package: packageSchema, knownBeforeReclaim: z.boolean(), knownBeforeNote: text.nullable() }), cmd.input)
        if (prior.decision !== 'confirmed' || prior.recoveryStage !== 'confirmed') throw new Error('Review the case before approval.')
        assertRecoveryEligible(finding, all, data.package.requestedAmount)
        const approved = approveRecovery(updateRecoveryPackage(prior, { ...data.package, requestedResolution: data.package.method, requestedAmount: data.package.requestedAmount, recipientEmail: data.package.recipientEmail }), { at, knownBeforeReclaim: data.knownBeforeReclaim, knownBeforeNote: data.knownBeforeNote })
        next = cmd.type === 'approve_and_request' ? startRecoveryRequest(approved, data.package.requestedAmount, at, finding.dollarImpact) : approved
        break
      }
      case 'request': {
        const data = parse(z.object({ requestedAmount: money }), cmd.input)
        assertRecoveryEligible(finding, all, data.requestedAmount)
        if (Math.round((prior.requestedAmount ?? 0) * 100) !== Math.round(data.requestedAmount * 100)) throw new Error('The amount must match the approved request.')
        next = startRecoveryRequest(prior, data.requestedAmount, at, finding.dollarImpact)
        break
      }
      case 'vendor_update': {
        const data = parse(z.object({ status: z.string().min(1).max(50), note: text.min(1), at: z.number().finite(), amount: money.optional(), method: method.optional(), expectedAt: z.number().finite().optional() }), cmd.input)
        next = recordVendorUpdate(prior, data as VendorUpdate, at)
        break
      }
      case 'email_sent':
      case 'followup_sent': {
        const data = parse(z.object({ messageId: text.min(1).max(300) }), cmd.input)
        const table = cmd.type === 'email_sent' ? 'gmail_sends' : 'gmail_follow_ups'
        const sent = db.prepare(`SELECT message_id, from_email, to_email, cc, sent_at FROM ${table} WHERE user_id = ? AND project_id = ? AND finding_id = ? AND message_id = ? AND status = 'sent'`)
          .get(userId, projectId, cmd.findingId, data.messageId) as { message_id: string; from_email: string; to_email: string; cc: string; sent_at: number } | undefined
        if (!sent) throw new Error('This Gmail send is not recorded for this account and case.')
        const receipt = { channel: 'gmail' as const, messageId: sent.message_id, from: sent.from_email, to: sent.to_email, cc: sent.cc ? sent.cc.split(',') : [], sentAt: sent.sent_at }
        next = cmd.type === 'email_sent' ? recordEmailSent(prior, receipt, prior.requestedAmount ?? 0) : recordFollowUpSent(prior, receipt)
        break
      }
      case 'followup_days': {
        const data = parse(z.object({ days: z.number().int().min(1).max(90) }), cmd.input)
        next = setFollowUpAfterDays(prior, data.days)
        break
      }
      case 'contact_hold': {
        const data = parse(z.object({ reason: text.nullable() }), cmd.input)
        next = setContactHold(prior, data.reason)
        break
      }
      case 'followup': {
        const data = parse(z.object({ at: z.number().finite().positive().nullable() }), cmd.input)
        next = setNextFollowUp(prior, data.at)
        break
      }
      case 'settlement': {
        const data = parse(z.object({ amount: money, method, source: z.enum(['bank', 'accounting', 'document', 'manual']), reference: text.min(1).max(300), settledAt: z.number().finite().positive(), appliedToBill: text.optional() }), cmd.input)
        if (data.settledAt > at + 60_000) throw new Error('A return cannot be dated in the future.')
        const key = `${data.method}|${data.reference.toLowerCase()}|${data.appliedToBill?.toLowerCase() ?? ''}`
        const allStates = Object.entries(states)
        if (allStates.some(([id, state]) => id !== cmd.findingId && (state.recoverySettlements ?? []).some((entry) => `${entry.method}|${entry.reference.toLowerCase()}|${entry.appliedToBill?.toLowerCase() ?? ''}` === key))) throw new Error('This return reference is already used by another case in this project.')
        next = verifyRecovery(prior, data as RecoveryVerification)
        break
      }
      case 'reconcile': {
        const data = parse(z.object({ note: text.min(1), rootCause: text }), cmd.input)
        next = reconcileRecovery(prior, { ...data, at })
        break
      }
      case 'close': {
        const data = parse(z.object({ reason: text.min(1) }), cmd.input)
        next = closeWithoutRecovery(prior, data.reason, at)
        break
      }
      case 'reopen': {
        next = prior.recoveryStage === 'recovered' || prior.recoveryStage === 'not_recovered' ? reopenOutcome(prior) : reopenDecision(prior)
        break
      }
      case 'reopen_balance': {
        next = reopenRemainingBalance(prior, at)
        break
      }
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(409, error instanceof Error ? error.message : 'Invalid case transition.', 'invalid_transition')
  }
  const changed = JSON.stringify(next) !== JSON.stringify(prior) || Boolean(revisedFinding)
  if (!changed) throw new HttpError(409, 'This command did not change the case.', 'no_change')
  const nextState = withHistory(prior, next, actor)
  const findingRows = env.result?.findings ?? []
  const nextEnv = { ...env, caseStates: { ...states, [cmd.findingId]: nextState }, result: { ...env.result, findings: findingRows.map((row) => row.id === cmd.findingId ? { ...(revisedFinding ?? row), relatedRecords: (revisedFinding ?? finding).relatedRecords.map((record) => ({ id: record.id })), customerDecision: nextState.decision } : row) }, updatedAt: at }
  return { project: { ...project, environment: nextEnv, updatedAt: at }, sourceRefs: finding.relatedRecords.map((record) => record.id) }
}

export class CaseCommands {
  private readonly db: DatabaseSync
  private readonly projects: ProjectStore

  constructor(db: DatabaseSync, projects: ProjectStore) {
    this.db = db
    this.projects = projects
  }

  migrateLegacy(): number {
    const rows = this.db.prepare('SELECT user_id, id, updated_at, revision FROM projects').all() as Array<{ user_id: string; id: string; updated_at: number; revision: number }>
    const insert = this.db.prepare("INSERT OR IGNORE INTO case_events (user_id, project_id, finding_id, command_id, command_hash, action, actor, at, prior_revision, revision, source_refs) VALUES (?, ?, ?, ?, ?, 'legacy_assertion', NULL, ?, ?, ?, ?)")
    let count = 0
    for (const row of rows) {
      const already = this.db.prepare('SELECT 1 FROM case_events WHERE user_id = ? AND project_id = ? LIMIT 1').get(row.user_id, row.id)
      if (already) continue
      const project = this.projects.get(row.user_id, row.id)
      const env = project?.environment as StoredEnvironment | undefined
      if (!project || !env || !Object.keys(env.caseStates ?? {}).length) continue
      this.db.exec('BEGIN IMMEDIATE')
      try {
      const migratedStates = Object.fromEntries(Object.entries(env.caseStates ?? {}).map(([id, state]) => [id, {
        ...state,
        ...(state.approvedAt ? { legacyApprovedAt: state.approvedAt } : {}),
        ...((state.recoveredAmount ?? 0) > 0 ? { legacyRecoveredAmount: state.recoveredAmount } : {}),
        requiresRevalidation: true,
        approvedAt: state.recoveryStage === 'confirmed' ? null : state.approvedAt,
      }]))
      const revision = this.projects.upsert(row.user_id, { ...project, environment: { ...env, caseStates: migratedStates } })
      for (const findingId of Object.keys(env?.caseStates ?? {})) {
        const finding = factFinding(env!, findingId)
        const result = insert.run(row.user_id, row.id, findingId, `legacy:${findingId}`, '', row.updated_at, row.revision, revision, JSON.stringify(finding?.relatedRecords.map((record) => record.id) ?? []))
        count += Number(result.changes)
      }
      this.db.exec('COMMIT')
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }
    return count
  }

  execute(userId: string, actor: string, projectId: string, untrusted: unknown): { revision: number; project: Record<string, unknown>; replayed: boolean } {
    const cmd = parse(commandSchema, untrusted)
    const hash = createHash('sha256').update(JSON.stringify(cmd)).digest('hex')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const duplicate = this.db.prepare('SELECT command_hash, revision FROM case_events WHERE user_id = ? AND project_id = ? AND command_id = ?').get(userId, projectId, cmd.commandId) as EventRow | undefined
      if (duplicate) {
        if (duplicate.command_hash !== hash) throw new HttpError(409, 'A command ID was reused with different content.', 'command_reused')
        const project = this.projects.get(userId, projectId)!
        this.db.exec('COMMIT')
        return { revision: this.projects.revision(userId, projectId)!, project, replayed: true }
      }
      const project = this.projects.get(userId, projectId)
      const revision = this.projects.revision(userId, projectId)
      if (!project || revision === null) throw new HttpError(404, 'That project is not in this account.')
      if (cmd.expectedRevision !== revision) throw new HttpError(409, 'This project changed on another device. Reload and review the newer version before retrying.', 'revision_conflict', { revision: String(revision) })
      const result = applyCommand(this.db, userId, projectId, project, cmd, actor, Date.now())
      const nextRevision = this.projects.upsert(userId, result.project)
      this.db.prepare('INSERT INTO case_events (user_id, project_id, finding_id, command_id, command_hash, action, actor, at, prior_revision, revision, source_refs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(userId, projectId, cmd.findingId, cmd.commandId, hash, cmd.type, actor, Date.now(), revision, nextRevision, JSON.stringify(result.sourceRefs))
      this.db.exec('COMMIT')
      return { revision: nextRevision, project: result.project, replayed: false }
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}

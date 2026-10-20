import { describe, expect, it } from 'vitest'
import type { Finding } from '../types'
import { evaluateEligibility, EVIDENCE_CHECKS, type RecoveryEvidence } from './eligibility'

export function supportedFinding(id = 'a'): Finding {
  return { id, type: 'exact_duplicate', class: 'review', severity: 'high', vendor: 'Acme', dollarImpact: 100, title: 'Repeated payment', explanation: 'Review', relatedRecords: ['r1','r2'].map(id => ({id, importBatchId:'b',vendor:'Acme',invoiceNumber:'i',invoiceDate:null,paymentDate:new Date(),invoiceAmount:100,amountPaid:100,terms:null,bankAccountLast4:null,category:null,rowIndex:1,currency:'USD',company:'Test company'})) }
}
export function completeEvidence(): RecoveryEvidence {
  const stamp = { reference: 'Accounting search 123', confirmedBy:'Customer', confirmedAt:123 }
  return { entity:{...stamp,entityId:'Test company'},supplier:{...stamp,supplierId:'TEST-VENDOR-1'},payments: ['r1','r2'].map((recordId,i) => ({...stamp,recordId,paymentId:`p${i}`,amountMinor:10000,currency:'USD',settled:true,obligationId:'invoice-1'})), obligation:{...stamp,obligationId:'invoice-1',amountMinor:10000,currency:'USD'}, checks:Object.fromEntries(EVIDENCE_CHECKS.map(([key])=>[key,{...stamp,confirmed:true}])), contradictions:[], notes:'' }
}
describe('deterministic recovery eligibility', () => {
 it('keeps CSV-only signals under review', () => expect(evaluateEligibility(supportedFinding()).eligible).toBe(false))
 it('calculates the excess above the supported obligation in minor units', () => expect(evaluateEligibility(supportedFinding(),completeEvidence())).toMatchObject({eligible:true,potentialAmountMinor:10000,currency:'USD'}))
 for (const [key] of EVIDENCE_CHECKS) it(`requires recorded ${key}`,()=>{const e=completeEvidence(); delete e.checks[key]; expect(evaluateEligibility(supportedFinding(),e).eligible).toBe(false)})
 it('rejects mismatched currency, unsettled payment, and duplicate payment identity',()=>{for(const patch of [{currency:'EUR'},{settled:false},{paymentId:'p0'}]) {const e=completeEvidence();Object.assign(e.payments[1],patch);expect(evaluateEligibility(supportedFinding(),e).eligible).toBe(false)}})
 it('requires reference, actor and time on every fact',()=>{const e=completeEvidence();e.payments[0].confirmedBy='';expect(evaluateEligibility(supportedFinding(),e).eligible).toBe(false)})
 it('does not establish an amount without an identified entity and stable supplier',()=>{const e=completeEvidence();delete e.entity;delete e.supplier;expect(evaluateEligibility(supportedFinding(),e)).toMatchObject({eligible:false,potentialAmountMinor:null});expect(evaluateEligibility(supportedFinding(),e).missingEvidence).toEqual(expect.arrayContaining([expect.stringMatching(/company/i),expect.stringMatching(/supplier ID/i)]))})
 it('rejects conflicting companies and source supplier IDs',()=>{const f=supportedFinding();f.relatedRecords[1].company='Other company';expect(evaluateEligibility(f,completeEvidence()).eligible).toBe(false);f.relatedRecords[1].company='Test company';f.relatedRecords[0].quickbooks={vendorId:'a'} as typeof f.relatedRecords[0]['quickbooks'];f.relatedRecords[1].quickbooks={vendorId:'b'} as typeof f.relatedRecords[1]['quickbooks'];expect(evaluateEligibility(f,completeEvidence()).eligible).toBe(false)})
 it('matches an attested supplier ID to a stable CSV supplier ID',()=>{const f=supportedFinding();f.relatedRecords.forEach((record)=>{record.stableSupplierId='CSV-42'});const e=completeEvidence();expect(evaluateEligibility(f,e).eligible).toBe(false);e.supplier!.supplierId='CSV-42';expect(evaluateEligibility(f,e).eligible).toBe(true)})
 it('suppresses contradictory evidence',()=>{const e=completeEvidence();e.contradictions=['Refund found'];expect(evaluateEligibility(supportedFinding(),e)).toMatchObject({eligible:false,evidenceState:'contradicted',potentialAmountMinor:null})})
 it('counts overlapping candidates only once deterministically',()=>{const a={...supportedFinding('a'),evidence:completeEvidence(),classification:'recovery_candidate' as const};const b={...supportedFinding('b'),evidence:completeEvidence(),classification:'recovery_candidate' as const};expect(evaluateEligibility(a,a.evidence,[a,b]).eligible).toBe(true);expect(evaluateEligibility(b,b.evidence,[a,b]).eligible).toBe(false)})
 it('never promotes security or savings checks',()=>{expect(evaluateEligibility({...supportedFinding(),type:'bank_account_change'},completeEvidence()).eligible).toBe(false)})
})

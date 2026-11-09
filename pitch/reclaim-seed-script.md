# Reclaim pitch: speaker script

10 slides, about 4:47. The formatted recording version is Reclaim_Georgia_AI_Pitch_Recording_Script_v2.docx.

## 1. Title (JAGAN · 0:00–0:15)

Hi, we're Reclaim. We help small businesses recover money they paid vendors by mistake: duplicate payments, overpayments and unused credits. Accounting software can flag a problem. Reclaim owns the work after the flag, until the money is actually back.

## 2. Problem (JAGAN · 0:15–0:47)

Imagine a business pays the same invoice twice, like the $4,280 one on this export. The error may be visible in the books, but a flag is not a refund. Someone still has to prove what happened, find the right vendor contact, make the claim, follow up, confirm the refund, and close it in the books. At the median company, 1.5% of payments go out wrong, and in a small finance team nobody owns that follow-up, so the money stays lost.

## 3. Who it's for (JAGAN · 0:47–1:13)

We start with supplier-heavy businesses on QuickBooks or Xero, where even a small team processes hundreds of vendor payments, and we scale through accountants, because one firm brings many clients. Bottom-up: 6.4 million US small businesses with employees, times about $1,000 recovered each year, times our 20% fee, is roughly $1.3 billion a year, before subscriptions. That $1,000 is our assumption; our pilots will measure it.

## 4. Competition (SIDHANTH · 1:13–1:36)

The competition validates the problem. QuickBooks, Xero and Xenett keep the books and surface issues, then stop at the alert. PRGX, AP Impact, AppZen and Xelix serve large companies with audit teams. Rocket Money only helps consumers. Reclaim takes the underserved space between them: low-friction recovery for smaller business claims, across accounting platforms, from evidence to verified closeout.

## 5. How it works (SIDHANTH · 1:36–2:03)

Here is the workflow. A customer uploads the payment export they already have; no bank login required. Deterministic checks identify a possible error and show the exact source rows as evidence. The customer reviews and approves it before any vendor is contacted. Reclaim prepares the claim, tracks the response and follow-up, and only counts a recovery when cash settles or a vendor credit is applied to a real bill.

## 6. Demo (SIDHANTH · 2:03–2:38 · Play the product recording. Keep it labeled as sample data.)

This example uses sample data, and no real vendor was contacted. Here, two payments point to the same invoice, INV-3305, for six thousand eight hundred dollars. Reclaim flags the exact duplicate and shows the rows behind the finding. The customer confirms the evidence, and Reclaim prepares a factual, non-accusatory claim for approval. The case then moves through vendor response and follow-up. We do not count a promise as recovered money. The case closes only when the refund is matched or the credit is actually used.

## 7. How we use AI (SIDHANTH · 2:38–3:07)

Because this is financial software, it must be explainable. Rules calculate every dollar, every match and every case state, so the same evidence gives the same answer. AI handles the messy work: today it drafts claims from approved facts, and next it will read invoices and sort vendor replies. People approve every finding and every message. AI never decides that a vendor owes money, moves funds, or changes the books on its own.

## 8. Traction (ADITYA · 3:07–3:38)

We have already shown that we execute. This summer, Reclaim won first place at an AI fintech hackathon. By September, we had built a working prototype supported by nearly 500 automated tests. This month, we gained an industry mentor, and we are scheduled to meet with the Governor of Georgia after November fourteenth. Our next milestone is controlled pilots with real businesses. We do not yet claim a real customer recovery; that is the proof those pilots are designed to produce.

## 9. Business model (ADITYA · 3:38–4:09)

Our revenue follows the customer's result. In the pilot there's no upfront fee; we propose about twenty percent of verified recovery only, so on a $6,800 refund the customer keeps $5,440. After the pilots, self-serve customers pay a subscription, around $79 to $199 a month, plus a lower fee only when Reclaim manages the recovery. Accounting firms pay per client. The pilots will set final pricing from three measured inputs: recovered value, false alarms and human time per case.

## 10. The ask (ADITYA · 4:09–4:47)

We are asking for AWS proof-of-concept support to cross the gap from a tested prototype to real, secure customer use. The first twenty-five-thousand-dollar phase would fund encrypted uploads, source-cited invoice reading, AI-assisted claims and reply classification, and a controlled pilot whose goal is our first verified recovery. The larger award would help us replace uploads with QuickBooks and Xero integrations, add recovery types such as missed credits and rebates, and give accounting firms one dashboard across all their clients.

Detection creates an alert. Reclaim completes the recovery: from evidence, to authorization, to money actually back. Thank you.

---

# Backup answers (if asked)

## What counts as recovered, and when we charge

"Recovered" has a strict contractual definition: settled cash, or a vendor credit actually applied to an eligible invoice and verified in the ledger. We never charge on a detected anomaly, a theoretical discount, a vendor's promise, an unapplied credit, a claim being sent, or a case the customer marked confirmed.

We'd require about $1,000 in aggregated claims before doing labor-intensive recovery work, because at 20% a $250 recovery is only $50 of revenue. For very large recoveries we'd offer a declining rate.

## Accountants, QuickBooks and Xero

For accountants, subscription pricing is the default. Accountants get a portfolio dashboard, separate client workspaces, permissions, approval queues, co-branded reports, evidence packages and recovery status.

The safest structure: the firm pays Reclaim a portfolio subscription, and Reclaim contracts directly with each business for managed recovery. We don't give accountants a percentage during the pilot, because CPA rules can restrict contingent fees; in Georgia, for example, contingent fees and commissions are restricted when a CPA does audits, reviews or certain compilations, and permitted referral fees must be disclosed in writing.

QuickBooks and Xero are how we get data and customers, not who pays us. We go CSV first, then read-only QuickBooks Online, then Xero, then recurring sync and marketplace listings. No automatic accounting changes or automatic vendor contact at the start. Being listed on a marketplace isn't the same as a partnership with Intuit or Xero.

## Later revenue, and where we sit on price

These are later revenue lines, and none of them should distract from proving recovery first. One-time onboarding only when custom mappings or multiple entities create real work; never a setup fee for pilot businesses. White labelling for accounting firms. And eventually an embedded or API version of our checking and recovery for AP automation companies, bookkeeping platforms and fractional CFO firms.

On price, we sit between inexpensive review tools like Xenett, at about $7.50 per client a month, and enterprise recovery platforms like AuditRes, at $995 to $3,995 a month.

## Where the market numbers come from

6.4 million: US small businesses with employees (6,395,635), SBA Office of Advocacy 2025 Small Business Profile. $1,000 per business per year is our assumption (about $500,000 of vendor spend × 0.2% recovered); first-time AP audits are commonly cited as recovering 0.05% to 0.5% of spend. 6.4M × $1,000 × 20% ≈ $1.3B a year in fees, before subscriptions.

/* Reclaim film — one GSAP master timeline on a 1920×1080 stage, driven by a video-style player.
   Shot times are written in the reference recording's clock (rt, seconds) so every beat can be
   checked against it; T() shifts them to film time (the recording's play click lands at 0.62 s). */
(() => {
'use strict'

const OFFSET = 0.62
const END_RT = 42.4
const DUR = +(END_RT - OFFSET).toFixed(3)
const T = rt => Math.max(0, +(rt - OFFSET).toFixed(3))

const player = document.getElementById('player')
const stage = document.getElementById('stage')
const tl = gsap.timeline({ paused: true })

/* ---------------- helpers ---------------- */
const h = (tag, cls, html, parent) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  if (parent) parent.appendChild(e)
  return e
}
const css = (e, o) => { Object.assign(e.style, o); return e }
const px = v => v + 'px'
const FT = (t, from, to, rt, dur, ease = 'power2.out', x = {}) => tl.fromTo(t, from, { ...to, duration: dur, ease, immediateRender: false, ...x }, T(rt))
const FT1 = (t, from, to, rt, dur, ease = 'power2.out', x = {}) => tl.fromTo(t, from, { ...to, duration: dur, ease, immediateRender: true, ...x }, T(rt))
const SET = (t, vars, rt) => tl.set(t, vars, T(rt))
const B = n => `blur(${n}px)`

// deterministic randomness, so every playback (and every scrub) looks identical
let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

function scene(rtIn, rtOut, cls = '') {
  const s = h('div', 'scene ' + cls, null, stage)
  if (rtIn <= OFFSET) s.style.visibility = 'visible'
  else SET(s, { visibility: 'visible' }, rtIn)
  if (rtOut != null) SET(s, { visibility: 'hidden' }, rtOut)
  return s
}
const layer = (parent, cls = '') => css(h('div', 'abs ' + cls, null, parent), { left: '0', top: '0', width: '1920px', height: '1080px' })

/* A line of text split into words and characters.
   anchor: 'center' | 'left' | 'right' (horizontal); vertically centred on y. */
function txt(parent, text, o = {}) {
  const el = h('div', 'line ' + (o.cls || ''), null, parent)
  el.dataset.anchor = o.anchor || 'center'
  css(el, { font: `${o.w || 500} ${o.size || 100}px/${o.lh || 1.05} var(--f)`, letterSpacing: o.ls ?? '-0.015em', color: o.color || '#fff', left: px(o.x ?? 960), top: px(o.y ?? 540) })
  const words = [], chars = []
  text.split(' ').forEach((wd, i) => {
    if (i) el.appendChild(document.createTextNode(' '))
    if (wd === '\n') { el.appendChild(document.createElement('br')); return }
    const ws = h('span', 'w', null, el)
    for (const ch of wd) { const c = h('span', 'c', null, ws); c.textContent = ch; chars.push(c) }
    words.push(ws)
  })
  const anchor = o.anchor || 'center'
  gsap.set(el, { xPercent: anchor === 'center' ? -50 : anchor === 'right' ? -100 : 0, yPercent: -50 })
  return { el, words, chars }
}
// one continuous gradient painted across split characters
const leftWithin = (el, ref) => { let x = 0; while (el && el !== ref) { x += el.offsetLeft; el = el.offsetParent } return x }
function paint(chars, grad, ref) {
  const W = ref.offsetWidth
  for (const c of chars) {
    css(c, { backgroundImage: grad, backgroundSize: `${W}px 100%`, backgroundPosition: `${-leftWithin(c, ref)}px 0`, backgroundRepeat: 'no-repeat' })
    c.classList.add('gt')
  }
}
// visible right edge after n words, for re-centring a line while it grows
const rightOf = w => leftWithin(w, w.closest('.line')) + w.offsetWidth
// keep a line centred on whatever part of it is visible while its units (words or characters) appear in reading order
function centerOn(line, units, times, slide = 0.14, ease = 'power2.out', lag = 0) {
  const W = line.el.offsetWidth, L0 = leftWithin(units[0], line.el)
  const shift = n => { const u = units[n - 1]; return W / 2 - (L0 + leftWithin(u, line.el) + u.offsetWidth) / 2 }
  let prev = shift(1)
  FT1(line.el, { x: prev }, { x: prev }, times[0], 0.001, 'none')
  for (let i = 1; i < units.length; i++) { const nx = shift(i + 1); FT(line.el, { x: prev }, { x: nx }, times[i] + lag, slide, ease); prev = nx }
}

function soft(parent, blobs) {
  const bg = h('div', 'bg-paper', null, parent)
  for (const [x, y, r, color, blur = 60] of blobs) {
    css(h('span', 'soft', null, bg), { left: px(x - r), top: px(y - r), width: px(r * 2), height: px(r * 2), background: `radial-gradient(closest-side, ${color}, rgba(255,255,255,0))`, filter: B(blur) })
  }
  return bg
}
function mesh(parent, rt0, rt1) {
  const m = h('div', 'bg-mesh', null, parent)
  const blobs = [
    [520, 300, 2300, 1500, 'rgba(10,150,86,.95)', 70, 35],    // top-left field      (reference: royal blue)
    [1080, 800, 1700, 1100, 'rgba(14,142,128,.9)', -90, -45], // middle            (reference: violet)
    [320, 1080, 1250, 760, 'rgba(0,253,116,.9)', 110, -25],    // bottom-left heat  (reference: orange)
    [860, 1120, 1150, 560, 'rgba(0,208,236,.62)', 50, -35],    // bottom glow       (reference: pink)
    [1560, 420, 1000, 860, 'rgba(1,8,5,.97)', -70, 45],        // dark pool, right
    [1880, 980, 900, 760, 'rgba(10,110,80,.7)', -40, -25],
  ]
  for (const [cx, cy, w, hh, col, dx, dy] of blobs) {
    const b = css(h('span', 'blob', null, m), { left: px(cx - w / 2), top: px(cy - hh / 2), width: px(w), height: px(hh), background: `radial-gradient(closest-side, ${col}, rgba(0,0,0,0))` })
    FT1(b, { x: 0, y: 0, scale: 1 }, { x: dx, y: dy, scale: 1.08 }, rt0, rt1 - rt0, 'sine.inOut')
  }
  return m
}

/* ---------------- brand marks & glyphs ---------------- */
let gid = 0
const R_BODY = 'M13 39V9h11.3c6.7 0 10.7 3.4 10.7 9.2 0 4.25-2.15 7.15-5.85 8.42L38 39h-7.1l-7.8-11.35H19.4V39H13Zm6.4-16.42h4.25c3.15 0 4.95-1.5 4.95-4.12 0-2.68-1.8-4.12-4.95-4.12H19.4v8.24Z'
const R_SPREAD = 'M26.74 32.94 30.9 39H38l-4.01-5.6-7.25-.46Z'
const VB = '12.5 9 26 30'
function markSVG(body = '#0d110f', parts = 'both') {
  const id = 'rg' + (++gid)
  return `<svg viewBox="${VB}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="${id}" x1="26.7" y1="33" x2="38" y2="39" gradientUnits="userSpaceOnUse"><stop stop-color="#00fd74"/><stop offset="1" stop-color="#58d783"/></linearGradient></defs>`
    + (parts !== 'spread' ? `<path class="mk-body" d="${R_BODY}" fill="${body}"/>` : '')
    + (parts !== 'body' ? `<path d="${R_SPREAD}" fill="url(#${id})"/>` : '') + '</svg>'
}
const CHECK = (c = '#000', w = 3.2) => `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const TICK = c => `<svg class="tick" viewBox="0 0 32 32"><path d="M6 17l6.5 6.5L26 9" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const WARN = `<svg viewBox="0 0 48 48"><path d="M24 7 43 40H5Z" fill="none" stroke="#ff6838" stroke-width="3.6" stroke-linejoin="round"/><path d="M24 19v10" stroke="#ff6838" stroke-width="3.6" stroke-linecap="round"/><circle cx="24" cy="34.5" r="2.2" fill="#ff6838"/></svg>`
const CURSOR = `<svg viewBox="0 0 40 40"><path d="M5 3.5 L5 31 L12.4 24.6 L17.4 35.2 L22.6 32.8 L17.7 22.6 L27.6 22.6 Z" fill="#3b403e" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>`
function cursor(parent) {
  const c = h('div', 'cursor', CURSOR, parent)
  css(c, { marginLeft: '-12px', marginTop: '-8.4px', transformOrigin: '12px 8.4px' })
  return c
}
const ICONS = {
  duplicate: '<rect x="8.5" y="3" width="11" height="14" rx="1.6"/><path d="M5 7.5v11.8A1.7 1.7 0 0 0 6.7 21H15"/><path d="M11.5 8h5M11.5 11.5h5"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5M5 10.5v7.5M9.5 10.5v7.5M14.5 10.5v7.5M19 10.5v7.5M3 20.5h18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  over: '<circle cx="10" cy="13" r="6.5"/><path d="M10 10.2v5.6M7.2 13h5.6M17.5 3.5v6M14.5 6.5h6"/>',
  near: '<rect x="4" y="5" width="10" height="13" rx="1.5"/><rect x="10" y="8" width="10" height="13" rx="1.5"/><path d="M13 13.2c1-.8 2-.8 3 0s2 .8 3 0M13 16.2c1-.8 2-.8 3 0s2 .8 3 0"/>',
  tag: '<path d="M3.5 12.3V4.6a1.1 1.1 0 0 1 1.1-1.1h7.7l8.2 8.2-8.8 8.8z"/><circle cx="8.2" cy="8.2" r="1.5"/>',
  chart: '<path d="M4 20h16M6.5 20v-4.5M11 20v-7.5M15.5 20V5.5M20 20v-2.5"/>',
  doc: '<path d="M6 3h8.8L19 7.2V21H6z"/><path d="M14.5 3v4.5H19M9.2 14.2l2.3 2.3 4.2-4.6"/>',
}

/* ---------------- one audit, used by every shot ----------------
   Finding types and what counts as a claim follow the app (src/lib/detection.ts, src/lib/claims.ts):
   a bank-account change is a payment to verify, not money owed; everything else here is a claim. */
const FINDINGS = [
  { type: 'Exact duplicate payment', short: 'Exact duplicate', vendor: 'Acme Industrial Supply', ref: 'INV-28491 paid twice', amount: 8420.00, claim: true, status: 'Credit received' },
  { type: 'Overpayment vs. invoice', short: 'Overpayment', vendor: 'Northwind Freight', ref: 'NF-11874 · paid $9,918.75 on $7,608.75', amount: 2310.00, claim: true, status: 'Request sent' },
  { type: 'Unusually large payment', short: 'Unusual payment', vendor: 'Bayline Utilities', ref: 'BU-5530 · typical $1,012.40', amount: 2073.72, claim: true, status: 'In review' },
  { type: 'Near-duplicate payment', short: 'Near-duplicate', vendor: 'Summit Packaging', ref: 'SP-3810 and SP-3810-1', amount: 1400.00, claim: true, status: 'In review' },
  { type: 'Unclaimed discount', short: 'Unclaimed discount', vendor: 'Keystone Metals', ref: 'KM-2207 · 2/10 net 30', amount: 84.20, claim: true, status: 'Drafted' },
  { type: 'Bank-account change', short: 'Bank-account change', vendor: 'Pioneer Logistics', ref: 'PL-1751 · •••• 4471 → •••• 9038', amount: 2580.00, claim: false, status: 'Verify' },
]
const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CLAIMS = FINDINGS.filter(f => f.claim)
const RECOVERY = CLAIMS.reduce((c, f) => c + Math.round(f.amount * 100), 0) / 100   // $14,287.92

/* ================================================================
   SHOT A · rt 0.62–4.10 · mesh: "Accounts payable" → "errors cost businesses" → "millions"
   ================================================================ */
function shotA() {
  const s = scene(0, 4.1)
  mesh(s, 0.62, 4.1)
  const a = txt(s, 'Accounts payable', { size: 122, w: 500 })
  FT1(a.el, { opacity: 0, scale: 1.04, y: 30, color: '#bff5d8', filter: B(8) }, { opacity: 1, scale: 1, y: 0, color: '#ffffff', filter: B(0) }, 0.62, 0.22)
  FT(a.el, { scale: 1, opacity: 1 }, { scale: 0.74, opacity: 0.8 }, 1.02, 0.18, 'power2.inOut')
  FT(a.el, { opacity: 0.8, filter: B(0) }, { opacity: 0, filter: B(6) }, 1.25, 0.06, 'power1.in')

  const b = txt(s, 'errors cost businesses', { size: 78, w: 500 })
  const bt = [1.3, 1.56, 1.76]
  b.words.forEach((w, i) => FT1(w, { opacity: 0, y: 10, filter: B(6) }, { opacity: 1, y: 0, filter: B(0) }, bt[i], 0.2))
  centerOn(b, b.words, bt)
  FT1(b.el, { scale: 1 }, { scale: 1.03 }, 1.3, 1.45, 'none')
  FT(b.chars, { opacity: 1 }, { opacity: 0 }, 2.72, 0.07, 'none', { stagger: { each: 0.015, from: 'edges' } })

  const m = txt(s, 'millions', { size: 272, w: 600, ls: '-0.025em' })
  FT1(m.el, { opacity: 0, scale: 0.72, filter: B(18) }, { opacity: 1, scale: 1.06, filter: B(0) }, 3.1, 0.36, 'power3.out')
  FT(m.el, { scale: 1.06 }, { scale: 0.95 }, 3.46, 0.36, 'sine.inOut')
  FT(m.el, { scaleX: 0.95, scaleY: 0.95, opacity: 1, filter: B(0) }, { scaleX: 1.22, scaleY: 0.1, opacity: 0, filter: B(14) }, 3.8, 0.26, 'power3.in')
}

/* ================================================================
   SHOT B · rt 4.10–9.08 · paper + wheel of documents; lines stack from the top
   ================================================================ */
const DOCS = [
  { t: 'Receipt', bars: 6 }, { t: 'PO', sub: 'PO-7741', rows: 5 }, { t: 'Statement', rows: 6 },
  { t: 'Invoice', sub: 'NF-11820', amt: '$12,364.00', bars: 4 }, { t: 'CSV', rows: 6 }, { t: 'Remittance', bars: 6 },
  { t: 'Invoice', sub: 'INV-28491<br>Acme Industrial Supply', amt: '$8,420.00', bars: 3, hot: 'dup' },
  { t: 'PDF', bars: 8, fold: true },
  { t: 'Vendor details', sub: 'Pioneer Logistics', bars: 4, seal: true, hot: 'bank' },
  { t: 'Invoice', sub: 'SP-3810', amt: '$1,400.00', bars: 4 }, { t: 'Credit memo', bars: 6 }, { t: 'W-9', bars: 7 }, { t: 'Receipt', bars: 6 },
]
function docCard(d, i, parent) {
  const idx = i - 6
  const el = h('div', 'doc' + (d.fold ? ' fold' : ''), null, parent)
  const a = idx * 10.5 + (d.hot ? 0 : (rnd() - 0.5) * 3), dy = d.hot ? 0 : (rnd() - 0.5) * 34
  css(el, { transform: `rotate(${a}deg) translateY(${dy}px)`, zIndex: 20 - Math.abs(idx) })
  const inner = h('div', 'doc-in', null, el)
  const tint = h('div', 'tint', null, inner)
  h('div', 'doc-t', d.t, inner)
  if (d.sub) h('div', 'doc-sub', d.sub, inner)
  if (d.amt) h('div', 'doc-amt', d.amt, inner)
  if (d.bars) { const b = h('div', 'doc-bars', null, inner); for (let k = 0; k < d.bars; k++) h('i', '', null, b) }
  if (d.rows) { const r = h('div', 'doc-rows', null, inner); for (let k = 0; k < d.rows; k++) h('div', '', '<i></i><i></i>', r) }
  if (d.seal) h('div', 'doc-seal', '$', inner)
  return { el, inner, tint }
}
function shotB() {
  const s = scene(4.1, 9.08)
  soft(s, [[140, 380, 520, 'rgba(90,214,255,.62)', 50], [220, 930, 560, 'rgba(120,250,170,.55)', 60], [560, 700, 420, 'rgba(190,243,255,.5)', 60]])
  const cam = layer(s)
  const wrap = layer(cam)
  const wheel = h('div', 'wheel', null, wrap)
  const cards = DOCS.map((d, i) => docCard(d, i, wheel))
  const dup = cards[6], bank = cards[8]
  const stamp = h('div', 'stamp', 'DUPLICATE', dup.inner)
  const alert = h('div', 'alert', `${WARN}<b>ACCOUNT<br>CHANGED</b><small>•••• 4471 → •••• 9038</small>`, bank.inner)

  // wheel sweeps in from the right, blurred, and keeps turning slowly
  FT1(wheel, { rotation: 34 }, { rotation: 3 }, 4.1, 0.62, 'power3.out')
  FT1(wrap, { filter: B(12) }, { filter: B(0) }, 4.1, 0.55, 'power2.out')
  FT(wheel, { rotation: 3 }, { rotation: 0 }, 4.72, 0.83, 'sine.inOut')
  // beat 1: the invoice lifts and is stamped
  FT1(dup.inner, { y: 0, scale: 1 }, { y: -46, scale: 1.1 }, 5.55, 0.5, 'back.out(1.6)')
  FT1(dup.tint, { opacity: 0 }, { opacity: 1 }, 5.55, 0.35)
  FT1(stamp, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1 }, 5.72, 0.28, 'power4.out')
  // beat 2: camera turns the wheel two cards left; the bank card comes forward and alarms
  FT(wheel, { rotation: 0 }, { rotation: -21 }, 7.33, 0.55, 'power3.inOut')
  FT(wrap, { filter: B(0) }, { filter: B(9) }, 7.33, 0.2, 'power2.in')
  FT(wrap, { filter: B(9) }, { filter: B(0) }, 7.53, 0.35, 'power2.out')
  FT1(bank.inner, { y: 0, scale: 1 }, { y: -14, scale: 1.24 }, 7.42, 0.55, 'power3.out')
  FT1(alert, { opacity: 0 }, { opacity: 1 }, 7.5, 0.4)
  css(bank.el, { zIndex: 40 }); css(dup.el, { zIndex: 30 })

  // the line stack: the newest line lands at the top, older lines slide down, shrink and defocus
  const tg = layer(cam)
  const L = [
    txt(tg, 'All it takes is', { size: 92, w: 500, color: '#2a302d', y: 0 }),
    txt(tg, 'one duplicate invoice', { size: 92, w: 500, y: 0 }),
    txt(tg, 'or a new bank account', { size: 92, w: 500, y: 0 }),
  ]
  paint(L[1].chars, 'var(--grad-ink)', L[1].el); paint(L[2].chars, 'var(--grad-ink)', L[2].el)
  const slot = [{ y: 196, scale: 1, opacity: 1, filter: B(0) }, { y: 316, scale: 0.72, opacity: 0.55, filter: B(3) }, { y: 398, scale: 0.58, opacity: 0.3, filter: B(5) }]
  gsap.set(L.map(l => l.el), { y: slot[0].y })
  const l0t = L[0].words.map((w, i) => 4.6 + i * 0.07)
  L[0].words.forEach((w, i) => FT1(w, { opacity: 0, y: 14, filter: B(8) }, { opacity: 1, y: 0, filter: B(0) }, l0t[i], 0.22, 'power2.out'))
  centerOn(L[0], L[0].words, l0t, 0.2)
  ;[[1, 5.45], [2, 7.33]].forEach(([n, rt]) => {
    FT1(L[n].el, { y: 118, opacity: 0, scale: 0.92, filter: B(10) }, { ...slot[0], opacity: 1 }, rt, 0.4, 'power3.out')
    const wt = L[n].words.map((w, i) => rt + i * 0.1)
    L[n].words.forEach((w, i) => FT1(w, { opacity: 0, y: 14, filter: B(6) }, { opacity: 1, y: 0, filter: B(0) }, wt[i], 0.2, 'power2.out'))
    centerOn(L[n], L[n].words, wt)
    for (let k = 0; k < n; k++) FT(L[k].el, slot[n - 1 - k], slot[n - k], rt, 0.5, 'power3.out')
  })
  FT1(cam, { y: 0 }, { y: -18 }, 4.6, 4.4, 'sine.inOut')
}

/* ================================================================
   SHOT C · rt 9.08–14.30 · "to trigger" + a focus picker
   ================================================================ */
function shotC() {
  const s = scene(9.08, 14.8)
  h('div', 'bg-night', null, s)
  const cam = layer(s)
  const lead = txt(cam, 'to trigger', { size: 104, w: 500, color: '#00fd74', anchor: 'right', x: 0 })
  const list = css(h('div', 'abs', null, cam), { left: 0, top: 0 })
  const items = [['double payments', 0], ['lost margin', 193], ['cash you never<br>get back', 333]].map(([t, y]) => css(h('div', 'pick-item', t, list), { top: px(y - 53) }))
  // lay the group out from measured widths so it sits dead centre
  const leadW = lead.el.offsetWidth, itemW = Math.max(...items.map(i => i.offsetWidth)), padX = 60, gap = 64
  const barW = itemW + padX * 2, left = 960 - (leadW + gap + barW) / 2, barL = left + leadW + gap
  css(lead.el, { left: px(left + leadW) })
  items.forEach(i => css(i, { left: px(barL), width: px(barW), textAlign: 'center' }))
  const lx = left + leadW / 2 - 2
  const top = css(h('div', 'vline', null, cam), { left: px(lx), top: '78px', height: '342px', background: 'linear-gradient(180deg, rgba(0,253,116,0) 0%, #00fd74 40%, #00fd74 100%)', transformOrigin: '50% 100%' })
  const bot = css(h('div', 'vline', null, cam), { left: px(lx), top: '660px', height: '342px', background: 'linear-gradient(0deg, rgba(0,253,116,0) 0%, #00fd74 40%, #00fd74 100%)', transformOrigin: '50% 0%' })
  FT1([top, bot], { scaleY: 0.2 }, { scaleY: 1 }, 9.08, 0.3, 'power3.out')
  FT1(lead.el, { opacity: 0.4, filter: B(4) }, { opacity: 1, filter: B(0) }, 9.08, 0.16)

  const bar = css(h('div', 'pick-bar', null, cam), { left: px(barL), width: px(barW), top: '454px', height: '173px' })
  cam.appendChild(list)
  FT1(bar, { x: 780, opacity: 0 }, { x: 0, opacity: 1 }, 9.12, 0.42, 'power3.out')
  const centers = [0, 193, 386]
  const off = { opacity: 0.88, filter: B(7) }, on = { opacity: 1, filter: B(0) }
  gsap.set(items, off)
  FT1(list, { y: 540 + 290, filter: B(6) }, { y: 540 - centers[0], filter: B(0) }, 9.14, 0.48, 'power3.out')
  FT(items[0], off, on, 9.4, 0.22)
  FT(list, { y: 540 - centers[0] }, { y: 540 - centers[1] }, 10.72, 0.36, 'power3.inOut')
  FT(items[0], on, off, 10.72, 0.3); FT(items[1], off, on, 10.8, 0.3)
  FT(list, { y: 540 - centers[1] }, { y: 540 - centers[2] }, 12.08, 0.4, 'power3.inOut')
  FT(bar, { y: 0, height: 173 }, { y: -59, height: 291 }, 12.08, 0.4, 'power3.inOut')
  FT(items[1], on, off, 12.08, 0.3); FT(items[2], off, on, 12.16, 0.3)
  FT1(cam, { y: 0 }, { y: 14 }, 9.1, 4.3, 'sine.inOut')
  // whip right, then keep drifting out while the logo arrives
  FT(cam, { x: 0, filter: B(0) }, { x: 600, filter: B(16) }, 13.45, 0.16, 'power2.in')
  FT(cam, { x: 600, filter: B(16) }, { x: 1350, filter: B(9) }, 13.61, 0.6, 'power2.out')
}

/* ================================================================
   SHOT D · rt 13.58–17.30 · disc + mark travel in, iris to white, wordmark; morph to the Start pill
   ================================================================ */
function wordmark(parent, color, dot) {
  const wm = h('div', 'wordmark', null, parent)
  css(wm, { left: '960px', top: '540px', color })
  const slot = css(h('span', 'c mslot', markSVG(color === '#fff' ? '#fff' : '#0d110f'), wm), { width: '0.624em', height: '0.72em', marginRight: '-0.02em' })
  const letters = [...'eclaim.'].map(ch => { const c = h('span', 'c', null, wm); c.textContent = ch; return c })
  letters[6].style.color = dot
  gsap.set(wm, { xPercent: -50, yPercent: -50 })
  return { wm, slot, letters }
}
// letters spread symmetrically about the wordmark's centre, so the group stays centred while it gathers
const spreadX = (w, c, k) => (leftWithin(c, w.wm) + c.offsetWidth / 2 - w.wm.offsetWidth / 2) * k
const slotCenter = w => {
  const W = w.wm.offsetWidth, H = w.wm.offsetHeight
  let y = 0, el = w.slot; while (el && el !== w.wm) { y += el.offsetTop; el = el.offsetParent }
  return { x: 960 - W / 2 + leftWithin(w.slot, w.wm) + w.slot.offsetWidth / 2, y: 540 - H / 2 + y + w.slot.offsetHeight / 2 }
}
function travelMark(parent, body) {
  const m = h('div', 'abs mark', markSVG(body), parent)
  css(m, { width: '150px', height: '173px', left: '-75px', top: '-86.5px' })
  return m
}
function shotD() {
  const s = scene(13.58, 17.3)
  const bgw = css(h('div', 'bg-paper', null, s), { visibility: 'hidden' })
  SET(bgw, { visibility: 'visible' }, 14.74)
  const W = wordmark(s, '#0d110f', '#00c75f')
  W.wm.style.zIndex = 2
  const sc = slotCenter(W)
  gsap.set(W.slot, { opacity: 0 })
  const g = css(h('div', 'abs', null, s), { left: 0, top: 0, zIndex: 1 })
  const disc = css(h('div', 'disc', null, g), { left: '-106px', top: '-106px', width: '212px', height: '212px' })
  const mk = travelMark(g, '#0d110f')
  gsap.set(mk, { scale: 0.68 })
  // arc path: drops fast, then glides right into the centre
  FT1(g, { x: 440 }, { x: 960 }, 13.62, 0.56, 'power2.out')
  FT1(g, { y: 236 }, { y: 540 }, 13.62, 0.26, 'power2.out')
  FT1(g, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1 }, 13.62, 0.12)
  FT1(disc, { scale: 1 }, { scale: 13.5 }, 14.28, 0.46, 'power2.in')
  // letters converge from wide tracking, grey → ink, while the mark slides into the R slot
  FT(mk, { x: 0, y: 0, scale: 0.68 }, { x: sc.x - 960, y: sc.y - 540, scale: 1 }, 14.42, 0.48, 'power3.inOut')
  W.letters.forEach((c, i) => FT1(c, { y: 18, opacity: 0, filter: B(6), color: '#a8aeab' }, { y: 0, opacity: 1, filter: B(0), color: i === 6 ? '#00c75f' : '#0d110f' }, 14.62 + i * 0.02, 0.3, 'power3.out'))
  SET(W.slot, { opacity: 1 }, 14.9); SET(mk, { opacity: 0 }, 14.9); SET(disc, { opacity: 0 }, 14.9)
  FT1(W.wm, { scale: 1 }, { scale: 1.035 }, 14.9, 0.85, 'sine.inOut')

  // morph: letters fly wide and blur, the mark stretches into a slanted pill that rights itself
  W.letters.forEach(c => FT(c, { x: 0, opacity: 1, filter: B(0) }, { x: spreadX(W, c, 0.6), opacity: 0, filter: B(10) }, 15.68, 0.16, 'power2.in'))
  FT(W.slot, { scaleX: 1, rotation: 0, opacity: 1 }, { scaleX: 2.2, rotation: -26, opacity: 0 }, 15.76, 0.2, 'power2.in')
  const rings = [[2240, 1330, 'rgba(209,255,220,.55)', 'rgba(190,236,255,.62)'], [1740, 1000, 'rgba(170,246,196,.6)', 'rgba(160,222,250,.66)'], [1332, 678, 'rgba(120,232,165,.62)', 'rgba(110,200,245,.7)']]
    .map(([w, hh, a, b]) => css(h('div', 'ring', null, s), { width: px(w), height: px(hh), background: `linear-gradient(90deg, ${a}, ${b})` }))
  rings.forEach((r, i) => FT1(r, { scale: 0.42, opacity: 0 }, { scale: 1, opacity: 1 }, 15.9 + (2 - i) * 0.05, 0.5, 'power3.out'))
  const pill = h('div', 'pill', null, s)
  const label = txt(pill, 'Start audit', { size: 124, w: 600, color: '#0d110f', x: 470 - 7, y: 133 - 7, ls: '-0.02em' })
  FT1(pill, { x: sc.x - 960, rotation: -24, scaleX: 0.34, scaleY: 0.3, opacity: 0 }, { x: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }, 15.88, 0.44, 'back.out(1.3)')
  FT1(label.el, { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1 }, 16.0, 0.26, 'back.out(1.6)')
  const cur = cursor(s)
  FT1(cur, { x: 1360, y: 1130 }, { x: 1196, y: 702 }, 16.04, 0.46, 'power3.out')
  FT(cur, { x: 1196, y: 702 }, { x: 1236, y: 690 }, 16.5, 0.5, 'sine.inOut')
  FT(cur, { scale: 1 }, { scale: 0.88 }, 17.02, 0.08, 'power2.out')
  FT(pill, { scale: 1 }, { scale: 0.965 }, 17.02, 0.08, 'power2.out')
  FT(cur, { scale: 0.88 }, { scale: 1 }, 17.12, 0.12)
  FT(pill, { scale: 0.965 }, { scale: 1 }, 17.12, 0.14, 'back.out(2)')
  FT(rings, { scale: 1 }, { scale: 1.07 }, 17.1, 0.2)
}

/* ================================================================
   SHOT E · rt 17.30–19.95 · "A payment audit / that lets you" with drawn arcs
   ================================================================ */
function shotE() {
  const s = scene(17.3, 19.95)
  soft(s, [[1420, 1120, 620, 'rgba(0,209,255,.45)', 40], [1150, 1160, 460, 'rgba(0,253,116,.34)', 40]])
  const arcs = layer(s)
  arcs.innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="overflow:visible">
    <defs><linearGradient id="arcA" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#00e56a"/><stop offset=".55" stop-color="#26d9c4"/><stop offset="1" stop-color="#00b8ff"/></linearGradient></defs>
    <path id="pA" d="${arcPath(1000, 1250, 900, 175, 345)}" fill="none" stroke="url(#arcA)" stroke-width="13" stroke-linecap="round"/>
    <path id="pB" d="${arcPath(1640, 1180, 560, 196, 300)}" fill="none" stroke="#7fdcff" stroke-opacity=".85" stroke-width="12" stroke-linecap="round"/></svg>`
  const [pA, pB] = arcs.querySelectorAll('path')
  ;[[pA, 17.98, 1.3], [pB, 18.42, 1.0]].forEach(([p, rt, d]) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; FT1(p, { strokeDashoffset: L }, { strokeDashoffset: 0 }, rt, d, 'power1.inOut') })
  const cam = layer(s)
  const g = layer(cam)
  const l1 = txt(g, 'A payment audit', { size: 102, w: 500, color: '#0d110f', y: 540 })
  const l2 = txt(g, 'that lets you', { size: 102, w: 500, color: '#0d110f', y: 652 })
  paint([...l1.words[1].children], 'var(--grad-word)', l1.words[1])
  centerOn(l1, l1.words, [17.3, 18.0, 18.16])
  FT1(l1.words[0], { scale: 3.3, opacity: 0 }, { scale: 3.3, opacity: 1 }, 17.3, 0.1)
  FT(l1.words[0], { scale: 3.3 }, { scale: 1 }, 17.74, 0.24, 'power3.inOut')
  FT1(l1.words[1], { opacity: 0, filter: B(6) }, { opacity: 1, filter: B(0) }, 18.0, 0.16)
  FT1([...l1.words[2].children], { opacity: 0, y: 26 }, { opacity: 1, y: 0, stagger: 0.015 }, 18.16, 0.14)
  const l2t = l2.words.map((w, i) => 18.72 + i * 0.09)
  l2.words.forEach((w, i) => FT1(w, { opacity: 0, y: 40, filter: B(8) }, { opacity: 1, y: 0, filter: B(0) }, l2t[i], 0.22, 'power2.out'))
  centerOn(l2, l2.words, l2t, 0.2)
  FT1(g, { y: 0 }, { y: -56 }, 18.7, 0.45, 'power2.inOut')
  // camera pans to the product: text whips off left, arcs lag behind (parallax)
  FT(cam, { x: 0, filter: B(0) }, { x: -1900, filter: B(12) }, 19.3, 0.18, 'power2.in')
  FT(arcs, { x: 0 }, { x: -760 }, 19.3, 0.3, 'power2.in')
  FT(arcs, { opacity: 1 }, { opacity: 0 }, 19.3, 0.2, 'power1.in')
}
function arcPath(cx, cy, r, a0, a1) {
  const p = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

/* ================================================================
   SHOT F · rt 19.38–23.00 · "securely upload" + product page → audit result → "instantly find"
   ================================================================ */
function productWindow(parent) {
  const w = h('div', 'win', null, parent)
  w.innerHTML = `
    <div class="win-title">Q3 payables <span>/ acme-ledger-2026-q3.csv</span></div>
    <div class="hero"></div>
    <div class="file-tile"><i style="top:66px"></i><i style="top:86px;right:60px"></i><i style="top:106px"></i><i style="top:126px;right:80px"></i><b>CSV</b></div>
    <div class="hero-txt">
      <div class="lab">Uploaded file</div><h3>acme-ledger-2026-q3.csv</h3>
      <div class="lab">Date of upload</div><div class="val">29 September 2026</div>
      <p>4,812 payments to 312 vendors, 1 Jul – 30 Sep 2026. Columns were matched automatically; nothing in your books is changed.</p>
    </div>
    <div class="side-card">
      <div class="lab">Columns matched</div>
      ${['Vendor', 'Invoice number', 'Amount', 'Payment date', 'Bank account (last 4)'].map(t => `<div class="match">${t}<span class="ok">${CHECK()}</span></div>`).join('')}
      <div class="btn-main">Run audit</div>
      <div class="btn-sec">Download CSV</div><div class="btn-sec">Replace file</div><div class="btn-sec">Remove</div>
      <div class="side-note">Bank numbers are masked to the last 4 digits before anything is stored.</div>
    </div>
    <div class="prev"><h4>PREVIEW</h4>
      <div class="prow head"><span>Paid</span><span>Vendor</span><span>Invoice</span><span>Amount</span></div>
      ${[['04 Aug 2026', 'Acme Industrial Supply', 'INV-28491', '$8,420.00', 1], ['06 Aug 2026', 'Northwind Freight', 'NF-11820', '$12,364.00'], ['09 Aug 2026', 'Summit Packaging', 'SP-3810', '$1,400.00'], ['12 Aug 2026', 'Summit Packaging', 'SP-3810-1', '$1,400.00'], ['13 Aug 2026', 'Acme Industrial Supply', 'INV-28491', '$8,420.00', 1], ['18 Aug 2026', 'Pioneer Logistics', 'PL-1751', '$2,580.00'], ['22 Aug 2026', 'Harbor Office Co.', 'HO-0932', '$615.20'], ['27 Aug 2026', 'Northwind Freight', 'NF-11874', '$9,918.75'], ['02 Sep 2026', 'Keystone Metals', 'KM-2207', '$4,210.00'], ['11 Sep 2026', 'Bayline Utilities', 'BU-5530', '$3,086.12'], ['16 Sep 2026', 'Acme Industrial Supply', 'INV-28733', '$5,960.00']]
        .map(r => `<div class="prow${r[4] ? ' dup' : ''}"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span><span>${r[3]}</span></div>`).join('')}
    </div>
    <div class="shade"></div>
    <div class="modal">
      <div class="modal-h">Audit result</div>
      <div class="modal-top"><span class="big-ok">${CHECK('#00fd74', 3.4)}</span><div><b>Exact duplicate payment</b><small>Potential recovery · $8,420.00</small></div></div>
      ${[['Vendor', 'Acme Industrial Supply'], ['Invoice', 'INV-28491, paid twice'], ['Amount', '$8,420.00 on both payments'], ['Paid', '04 Aug and 13 Aug 2026']]
        .map(([l, v], i) => `<div class="mrow${i ? '' : ' first'}"><div><div class="lab">${l}</div><span>${v}</span></div>${TICK(i < 3 ? '#0fae5c' : '#0d110f')}</div>`).join('')}
      <div class="modal-f"><span>Add to recovery</span></div>
    </div>`
  return w
}
function shotF() {
  const s = scene(19.38, 23.1)
  const bg = soft(s, [[380, 1160, 560, 'rgba(0,209,255,.28)', 50], [1700, 1150, 520, 'rgba(0,253,116,.22)', 50]])
  css(bg, { visibility: 'hidden' }); SET(bg, { visibility: 'visible' }, 19.94)
  const cam = layer(s)
  txt(cam, 'securely', { size: 118, w: 500, color: '#0d110f', anchor: 'left', x: 95, y: 474 })
  const a2 = txt(cam, 'upload', { size: 118, w: 500, anchor: 'left', x: 95, y: 590 })
  paint(a2.chars, 'linear-gradient(90deg, #0b8f4d 0%, #0aa37a 45%, #0891b2 75%, #0d110f 100%)', a2.el)
  const win = productWindow(cam)
  css(win, { left: '719px', top: '131px' })
  const b1 = txt(cam, 'instantly', { size: 118, w: 500, color: '#0d110f', anchor: 'right', x: 1814 + 902, y: 551 })
  const b2 = txt(cam, 'find', { size: 118, w: 500, anchor: 'right', x: 1814 + 902, y: 686 })
  paint(b2.chars, 'linear-gradient(90deg, #0b8f4d 0%, #0891b2 100%)', b2.el)

  FT1(cam, { x: 1700 }, { x: 0 }, 19.4, 0.52, 'power3.out')
  FT1(win, { x: 420, y: 520 }, { x: 0, y: 0 }, 19.4, 0.6, 'power3.out')
  FT(cam, { x: 0 }, { x: -18 }, 19.94, 1.2, 'sine.inOut')

  const btn = win.querySelector('.btn-main'), shade = win.querySelector('.shade'), modal = win.querySelector('.modal')
  const ticks = [...win.querySelectorAll('.tick path')], foot = win.querySelector('.modal-f span')
  const cur = cursor(cam)
  // button centre in cam space: window (719,131) + side card (855,93) + offset inside card
  const posIn = (el, root) => { let x = 0, y = 0; for (let e = el; e && e !== root; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop } return { x, y, w: el.offsetWidth, h: el.offsetHeight } }
  const rb = posIn(btn, cam), bx = rb.x + rb.w - 34, by = rb.y + rb.h - 12
  FT1(cur, { x: 2160, y: by + 250 }, { x: bx + 8, y: by + 6 }, 20.22, 0.4, 'power3.out')
  FT(cur, { x: bx + 8, y: by + 6 }, { x: bx + 2, y: by + 4 }, 20.62, 0.3, 'sine.inOut')
  FT(cur, { scale: 1 }, { scale: 0.88 }, 20.92, 0.08); FT(btn, { scale: 1 }, { scale: 0.95 }, 20.92, 0.08)
  FT(cur, { scale: 0.88 }, { scale: 1 }, 21.02, 0.12); FT(btn, { scale: 0.95 }, { scale: 1 }, 21.02, 0.14)
  FT1(shade, { opacity: 0 }, { opacity: 1 }, 21.06, 0.26)
  FT1(modal, { opacity: 0, scale: 0.9, y: 12 }, { opacity: 1, scale: 1, y: 0 }, 21.08, 0.32, 'back.out(1.6)')
  ticks.forEach((p, i) => FT1(p, { strokeDashoffset: 40 }, { strokeDashoffset: 0 }, 21.34 + i * 0.17, 0.24, 'power2.out'))
  // camera pan: the page slides left, "instantly find" enters from the right
  FT(cam, { x: -18, y: 0 }, { x: -902, y: -13 }, 21.12, 0.36, 'power3.inOut')
  const rf = posIn(foot, cam), mx = rf.x + rf.w - 7, my = rf.y + rf.h + 4
  FT(cur, { x: bx + 2, y: by + 4 }, { x: mx + 90, y: my - 70 }, 21.3, 0.42, 'power2.inOut')
  FT(cur, { x: mx + 90, y: my - 70 }, { x: mx, y: my - 8 }, 21.72, 0.5, 'sine.inOut')
  FT(cur, { scale: 1 }, { scale: 0.88 }, 22.28, 0.08); FT(foot, { scale: 1 }, { scale: 0.93 }, 22.28, 0.08)
  FT(cur, { scale: 0.88 }, { scale: 1 }, 22.38, 0.12); FT(foot, { scale: 0.93 }, { scale: 1 }, 22.38, 0.14)
  FT(b1.el, { opacity: 1 }, { opacity: 0.4 }, 22.58, 0.2); FT(b2.el, { opacity: 1 }, { opacity: 0.45 }, 22.6, 0.2)
  FT(cam, { x: -902, filter: B(0) }, { x: -2500, filter: B(14) }, 22.76, 0.3, 'power3.in')

  // ticks fly out of the modal into the next shot
  const fx = scene(22.5, 23.7)
  fx.style.zIndex = 5
  const rows = [0, 1, 2, 3].map(i => ({ x: 719 - 902 + 420 + 433 - 34, y: 131 - 13 + 248 + 126 + i * 51 }))
  const targets = [[640, 330], [860, 250], [1060, 318], [1250, 262], [760, 420]]
  targets.forEach(([tx, ty], i) => {
    const r = rows[i % 4]
    const f = css(h('div', 'fly', TICK('#0fae5c').replace('class="tick"', 'class="tick" style="width:100%;height:100%"'), fx), { left: 0, top: 0 })
    f.querySelector('path').style.strokeDashoffset = 0
    FT1(f, { x: r.x, y: r.y, opacity: 0, rotation: 0, scale: 0.8 }, { x: tx, y: ty, opacity: 1, rotation: -12 + i * 7, scale: 1 }, 22.6 + i * 0.05, 0.45, 'power3.out')
    FT(f, { opacity: 1 }, { opacity: 0 }, 23.2 + i * 0.06, 0.3)
  })
}

/* ================================================================
   SHOT G · rt 22.85–24.32 · "recover"
   ================================================================ */
function shotG() {
  const s = scene(22.85, 24.32)
  soft(s, [[640, 1170, 640, 'rgba(0,209,255,.5)', 40], [420, 1180, 380, 'rgba(0,253,116,.35)', 40]])
  const r = txt(s, 'recover', { size: 300, w: 600, ls: '-0.03em' })
  paint(r.chars, 'linear-gradient(90deg, #11c265 0%, #0aa88a 38%, #0891b2 68%, #0b3552 100%)', r.el)
  FT1(r.el, { x: 520, opacity: 0, scale: 0.92, filter: B(18) }, { x: 0, opacity: 1, scale: 1, filter: B(0) }, 22.85, 0.34, 'power3.out')
  FT(r.el, { scale: 1 }, { scale: 1.3 }, 23.2, 0.9, 'sine.in')
  FT(r.el, { x: 0, filter: B(0) }, { x: -1800, filter: B(26) }, 24.1, 0.22, 'power2.in')
}

/* ================================================================
   SHOT H · rt 24.30–27.40 · chip → "money you already paid" + stacked dashboards
   ================================================================ */
function dashboard(variant, page) {
  const d = h('div', 'dash ' + variant)
  const dark = variant === '' ? '#fff' : '#0d110f'
  const nav = ['Overview', 'Findings', 'Recoveries', 'Vendors', 'Uploads']
  d.innerHTML = `<div class="dash-side">
      <div class="dash-logo"><span class="mk">${markSVG(dark)}</span><span>Reclaim<span style="color:${variant === 'v-green' ? '#0d110f' : '#00c75f'}">.</span></span></div>
      <div class="dash-user"><span class="av">PN</span><div><b>Priya Nair</b><small>Controller · Acme Co.</small></div></div>
      <div class="dash-sec">WORKSPACE</div>
      ${nav.map((n, i) => `<div class="nav${i === page ? ' on' : ''}"><i></i>${n}</div>`).join('')}
    </div>
    <div class="dash-main"><div class="dash-top"><i></i></div>${dashPage(page)}</div>`
  return d
}
function dashPage(page) {
  if (page === 0) {
    // one bar per claim, its length the share of the total
    const bars = CLAIMS.map(f => `<div class="brow"><span>${f.short}</span><i><b style="width:${(100 * f.amount / CLAIMS[0].amount).toFixed(1)}%"></b></i><em>${money(f.amount)}</em></div>`).join('')
    return `<h5>Overview</h5>
    <div class="metrics"><div class="metric"><div class="lab">Potential recovery</div><b>${money(RECOVERY)}<em>${CLAIMS.length} claims</em></b></div>
    <div class="metric warn"><div class="lab">Payments to verify</div><b>${money(FINDINGS.filter(f => !f.claim).reduce((c, f) => c + f.amount, 0))}<em>1 bank change</em></b></div></div>
    <div class="chart"><div class="t">Potential recovery by type</div>${bars}</div>`
  }
  if (page === 1) return `<h5>Findings · 4,812 payments checked</h5>` + FINDINGS.map(f => `<div class="frow"><div>${f.type}<small>${f.vendor} · ${f.ref}</small></div><span>${f.claim ? money(f.amount) : 'Verify'}</span></div>`).join('')
  return `<h5>Recoveries</h5>` + CLAIMS.map(f => `<div class="frow"><div>${f.status}<small>${f.vendor}</small></div><span>${money(f.amount)}</span></div>`).join('')
    + `<div class="frow"><div>Total potential recovery</div><span>${money(RECOVERY)}</span></div>`
}
function shotH() {
  const s = scene(24.3, 27.45)
  h('div', 'bg-night2', null, s)
  const cam = layer(s)
  const chip = h('div', 'chip', money(RECOVERY), cam)
  gsap.set(chip, { xPercent: -50, yPercent: -50 })
  FT1(chip, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1 }, 24.3, 0.3, 'back.out(2)')
  FT(chip, { scale: 1 }, { scale: 1.12 }, 24.6, 0.85, 'sine.inOut')
  FT(chip, { opacity: 1, y: 0, scale: 1.12 }, { opacity: 0, y: -80, scale: 0.8 }, 25.44, 0.2, 'power2.in')
  const t = txt(cam, 'money you already paid', { size: 92, w: 600, y: 183, ls: '-0.02em' })
  paint(t.chars, 'var(--grad-night)', t.el)
  const tt = t.words.map((w, i) => 24.96 + i * 0.08)
  t.words.forEach((w, i) => FT1(w, { y: -80, filter: B(8) }, { y: 0, filter: B(0) }, tt[i], 0.4, 'power3.out'))
  t.words.forEach((w, i) => FT1(w, { opacity: 0 }, { opacity: 1 }, tt[i], 0.1, 'none'))
  centerOn(t, t.words, tt, 0.14)
  // the three dashboards form one stack, scaled so the whole stack is centred and nothing is cut off at the sides
  const stack = layer(cam)
  const vg = css(dashboard('v-green', 2), { left: '130px', top: '515px' }); stack.appendChild(vg)
  const vl = css(dashboard('v-light', 1), { left: '384px', top: '428px' }); stack.appendChild(vl)
  const main = css(dashboard('', 0), { left: '678px', top: '327px' }); stack.appendChild(main)
  const sL = 130, sR = 678 + 1420, sk = 1700 / (sR - sL)
  gsap.set(stack, { transformOrigin: `${(sL + sR) / 2}px 327px`, scale: sk, x: 960 - (sL + sR) / 2 })
  FT1(main, { y: 720, opacity: 0, filter: B(14) }, { y: 0, opacity: 1, filter: B(0) }, 25.4, 0.46, 'power3.out')
  FT1(vl, { x: -1000, opacity: 0, filter: B(16) }, { x: 0, opacity: 1, filter: B(0) }, 26.1, 0.4, 'power3.out')
  FT1(vg, { x: -1100, opacity: 0, filter: B(16) }, { x: 0, opacity: 1, filter: B(0) }, 26.18, 0.4, 'power3.out')
  FT(cam, { y: 0, filter: B(0) }, { y: -1300, filter: B(18) }, 26.95, 0.42, 'power3.in')
}

/* ================================================================
   SHOT I · rt 27.25–32.45 · globe: "Precise. Traceable. Provable." then orbiting finding types
   ================================================================ */
let LAND = null
function shotI() {
  const s = scene(27.25, 32.45)
  css(h('div', 'abs', null, s), { inset: 0, background: 'linear-gradient(180deg, #010705 0%, #03170d 45%, #05331d 100%)' })
  const cv = h('canvas', 'fill', null, s)
  const g = { r: 1781, cx: 980, cy: 3036, lon: 100, lat: -38, glow: 1 }
  const draw = globeRenderer(cv, g)
  const upd = { onUpdate: draw }
  FT1(g, { cy: 3036 }, { cy: 2336 }, 27.22, 0.42, 'power3.out', upd)
  FT1(g, { lon: 100 }, { lon: 108 }, 27.22, 2.62, 'none', upd)
  FT(g, { r: 1781, cx: 980, cy: 2336, lon: 108, lat: -38 }, { r: 629, cx: 727, cy: 637, lon: 134, lat: -24 }, 29.84, 0.52, 'power2.inOut', upd)
  FT(g, { lon: 134 }, { lon: 142 }, 30.36, 1.9, 'none', upd)
  FT(g, { r: 629, cx: 727 }, { r: 980, cx: 900 }, 32.2, 0.26, 'power2.in', upd)
  FT(cv, { filter: B(0), opacity: 1 }, { filter: B(12), opacity: 0.2 }, 32.2, 0.26, 'power2.in')
  tl.call(draw, null, T(27.25))

  const line = txt(s, 'Precise. Traceable. Provable.', { size: 96, w: 500, y: 345 })
  paint([...line.words[2].children], 'linear-gradient(90deg, #a6f7c8 0%, #62dcff 100%)', line.words[2])
  css(line.words[1], { color: '#d6ffe8' })
  centerOn(line, line.words, [27.45, 28.1, 28.95])
  FT1(line.words[0], { y: 44 }, { y: 0 }, 27.45, 0.34, 'back.out(2)')
  FT1(line.words[0], { opacity: 0 }, { opacity: 1 }, 27.45, 0.12, 'none')
  FT1(line.words[1], { opacity: 0, filter: B(6) }, { opacity: 1, filter: B(0) }, 28.1, 0.14)
  FT1(line.words[2], { y: 46 }, { y: 0 }, 28.95, 0.36, 'back.out(1.8)')
  FT1(line.words[2], { opacity: 0 }, { opacity: 1 }, 28.95, 0.1, 'none')
  FT(line.el, { y: 0, opacity: 1 }, { y: -440, opacity: 0 }, 29.8, 0.42, 'back.in(1.4)')

  // orbits around the settled globe
  const orb = css(h('div', 'abs', null, s), { left: '727px', top: '637px' })
  const spin = h('div', 'abs', null, orb)
  const icons = []
  ;[[800, [-36, -4, 26], ['duplicate', 'near', 'over']], [1010, [-42, -18, 8], ['tag', 'bank', 'chart']]].forEach(([r, angs, keys]) => {
    css(h('div', 'orbit', null, spin), { left: px(-r), top: px(-r), width: px(2 * r), height: px(2 * r) })
    angs.forEach((a, i) => {
      const ic = css(h('div', 'oicon', `<svg viewBox="0 0 24 24">${ICONS[keys[i]]}</svg>`, spin), { left: px(r * Math.cos(a * Math.PI / 180)), top: px(r * Math.sin(a * Math.PI / 180)) })
      icons.push(ic)
    })
  })
  FT1(orb, { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1 }, 30.1, 0.45, 'power3.out')
  ;[0, 3, 1, 4, 2, 5].forEach((k, i) => FT1(icons[k], { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1 }, 30.3 + i * 0.07, 0.4, 'back.out(2)'))
  FT1(spin, { rotation: 4 }, { rotation: -5 }, 30.1, 2.2, 'none')
  FT1(icons, { rotation: -4 }, { rotation: 5 }, 30.1, 2.2, 'none')
  FT(orb, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.25 }, 32.2, 0.25, 'power2.in')
}
function globeRenderer(cv, g) {
  const ctx = cv.getContext('2d')
  let q = 1
  const resize = () => { q = Math.min(2, Math.max(0.6, (window.devicePixelRatio || 1) * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k')) || 0.5))); cv.width = 1920 * q; cv.height = 1080 * q }
  resize(); window.addEventListener('film:resize', () => { resize(); draw() })
  function draw() {
    ctx.setTransform(q, 0, 0, q, 0, 0)
    ctx.clearRect(0, 0, 1920, 1080)
    // atmosphere
    const at = ctx.createRadialGradient(g.cx, g.cy, g.r * 0.96, g.cx, g.cy, g.r * 1.16)
    at.addColorStop(0, 'rgba(0,253,116,.34)'); at.addColorStop(0.35, 'rgba(0,200,120,.14)'); at.addColorStop(1, 'rgba(0,200,120,0)')
    ctx.fillStyle = at; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r * 1.16, 0, Math.PI * 2); ctx.fill()
    // sphere
    const sp = ctx.createRadialGradient(g.cx - g.r * 0.35, g.cy - g.r * 0.45, g.r * 0.1, g.cx, g.cy, g.r)
    sp.addColorStop(0, '#0e5236'); sp.addColorStop(0.7, '#073322'); sp.addColorStop(1, '#0a3f2a')
    ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2); ctx.fill()
    if (LAND && window.d3) {
      const proj = d3.geoOrthographic().scale(g.r).translate([g.cx, g.cy]).rotate([-g.lon, -g.lat]).clipAngle(90).precision(0.6)
      const path = d3.geoPath(proj, ctx)
      ctx.beginPath(); path(LAND)
      ctx.fillStyle = '#93efbd'; ctx.fill()
    }
    // limb shading and rim light
    const lb = ctx.createRadialGradient(g.cx, g.cy, g.r * 0.72, g.cx, g.cy, g.r)
    lb.addColorStop(0, 'rgba(2,20,12,0)'); lb.addColorStop(1, 'rgba(2,20,12,.35)')
    ctx.fillStyle = lb; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r, 0, Math.PI * 2); ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,255,225,.55)'; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.r - 1.5, 0, Math.PI * 2); ctx.stroke()
  }
  return draw
}

/* ================================================================
   SHOT J · rt 32.42–34.64 · mesh: "Reclaim checks" → "every payment"
   ================================================================ */
function shotJ() {
  const s = scene(32.42, 34.62)
  mesh(s, 32.42, 34.64)
  const l = txt(s, 'Reclaim checks', { size: 92, w: 500 })
  const d0 = rightOf(l.words[0]) / 2 - l.el.offsetWidth / 2
  FT1(l.el, { x: -1.5 * d0, scale: 1.5 }, { x: -1.5 * d0, scale: 1.5 }, 32.42, 0.01)
  FT(l.el, { x: -1.5 * d0, scale: 1.5 }, { x: 0, scale: 1 }, 32.9, 0.26, 'power3.out')
  FT1(l.words[0], { opacity: 0, filter: B(12) }, { opacity: 1, filter: B(0) }, 32.42, 0.2)
  FT1([...l.words[1].children], { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.012 }, 32.9, 0.12)
  const mid = (l.chars.length - 1) / 2
  const order = l.chars.map((c, i) => [c, Math.abs(i - mid)]).sort((a, b) => b[1] - a[1]).map(x => x[0])
  FT(order, { opacity: 1 }, { opacity: 0 }, 33.45, 0.07, 'none', { stagger: 0.02 })
  const e = txt(s, 'every payment', { size: 152, w: 700, ls: '-0.03em' })
  FT1(e.el, { opacity: 0, scale: 1.14, filter: B(16) }, { opacity: 1, scale: 1, filter: B(0) }, 33.78, 0.3, 'power3.out')
  FT(e.el, { scale: 1 }, { scale: 1.035 }, 34.08, 0.56, 'sine.out')
}

/* ================================================================
   SHOT K · rt 34.62–36.50 · dotted world + payment arcs: "catching leaks at" → "scale" → dive
   ================================================================ */
function shotK() {
  const s = scene(34.62, 36.5)
  css(h('div', 'abs', null, s), { inset: 0, background: 'linear-gradient(180deg, #010805 0%, #03170d 60%, #05281a 100%)' })
  const map = layer(s)
  const X = lon => (lon + 170) / 350 * 1920, Y = lat => (78 - lat) / 136 * 1080
  const pal = ['#ffffff', '#ffffff', '#00fd74', '#9ff5c0', '#38d6ff', '#d1ffca']
  let dots = ''
  for (let y = 18; y < 1080; y += 36) for (let x = 18; x < 1920; x += 36) {
    const lon = x / 1920 * 350 - 170, lat = 78 - y / 1080 * 136
    const land = LAND && window.d3 ? d3.geoContains(LAND, [lon, lat]) : rnd() < 0.3
    if (!land) continue
    const c = pal[Math.floor(rnd() * pal.length)], big = rnd() < 0.035
    dots += big ? `<circle cx="${x}" cy="${y}" r="16" fill="${c}" opacity=".22"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/>` : `<circle cx="${x}" cy="${y}" r="5" fill="${c}" opacity="${(0.55 + rnd() * 0.45).toFixed(2)}"/>`
  }
  const hub = [X(151.2), Y(-33.9)]
  const cities = [[-74, 40.7], [-0.1, 51.5], [8.7, 50.1], [103.8, 1.35], [139.7, 35.7], [-46.6, -23.5], [-79.4, 43.7], [72.8, 19], [55.3, 25.2], [-122.4, 37.8]]
  const arcs = cities.map(([lo, la], i) => {
    const [x, y] = [X(lo), Y(la)], mx = (x + hub[0]) / 2, my = Math.min(y, hub[1]) - Math.hypot(x - hub[0], y - hub[1]) * 0.28
    return `<path d="M${hub[0].toFixed(1)} ${hub[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${i % 3 === 2 ? 'rgba(255,255,255,.55)' : '#00fd74'}" stroke-width="${i % 3 === 2 ? 2 : 3}" stroke-linecap="round"/><circle class="end" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#00fd74" opacity="0"/>`
  }).join('')
  map.innerHTML = `<svg class="dots" viewBox="0 0 1920 1080">${dots}${arcs}<circle cx="${hub[0]}" cy="${hub[1]}" r="14" fill="#00fd74"/><circle cx="${hub[0]}" cy="${hub[1]}" r="30" fill="#00fd74" opacity=".25"/></svg>`
  ;[...map.querySelectorAll('path')].forEach((p, i) => {
    const L = p.getTotalLength(); p.style.strokeDasharray = L
    FT1(p, { strokeDashoffset: L }, { strokeDashoffset: 0 }, 34.95 + i * 0.06, 0.55, 'power2.out')
  })
  FT1(map.querySelectorAll('.end'), { opacity: 0 }, { opacity: 0.7, stagger: 0.06 }, 35.35, 0.2)
  gsap.set(map, { transformOrigin: '960px 540px' })
  FT1(map, { scale: 1 }, { scale: 1.1 }, 34.62, 0.98, 'none')
  FT(map, { scale: 1.1, filter: B(0), opacity: 1 }, { scale: 3.4, filter: B(7), opacity: 0 }, 35.6, 0.36, 'power2.in')

  const bok = layer(s, 'bokeh')
  const bcol = ['#00fd74', '#9ff5c0', '#38d6ff', '#1f7a52', '#e9fff2', '#0a9d63', '#4b6bff00']
  for (let i = 0; i < 18; i++) {
    const r = 55 + rnd() * 95
    css(h('span', '', null, bok), { left: px(rnd() * 1920 - r), top: px(rnd() * 1080 - r), width: px(2 * r), height: px(2 * r), background: bcol[i % 6], opacity: (0.5 + rnd() * 0.4).toFixed(2), filter: B(6) })
  }
  gsap.set(bok, { transformOrigin: '960px 540px' })
  FT1(bok, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1 }, 35.6, 0.4, 'power2.out')
  FT(bok, { scale: 1 }, { scale: 1.18 }, 36.0, 0.5, 'sine.in')

  const l = txt(s, 'catching leaks at', { size: 102, w: 600, ls: '-0.02em' })
  l.el.style.textShadow = '0 0 18px rgba(1,10,6,.95), 0 0 42px rgba(1,10,6,.9), 0 4px 30px rgba(0,0,0,.6)'
  const plate = css(h('div', 'abs', null, s), { left: '360px', top: '430px', width: '1200px', height: '220px', background: 'radial-gradient(closest-side, rgba(1,12,7,.88), rgba(1,12,7,0))' })
  FT1(plate, { opacity: 0 }, { opacity: 1 }, 34.62, 0.2); FT(plate, { opacity: 1 }, { opacity: 0 }, 35.58, 0.14)
  s.appendChild(l.el)
  centerOn(l, l.words, [34.62, 34.98, 35.14])
  FT1(l.words[0], { opacity: 0, scale: 1.12, filter: B(12) }, { opacity: 1, scale: 1, filter: B(0) }, 34.62, 0.2)
  FT1([...l.words[1].children], { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.012 }, 34.98, 0.12)
  FT1([...l.words[2].children], { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.012 }, 35.14, 0.12)
  FT(l.el, { opacity: 1, filter: B(0) }, { opacity: 0, filter: B(10) }, 35.58, 0.14)

  const sc = txt(s, 'scale', { size: 340, w: 700, ls: '-0.035em' })
  const a = sc.chars[2]
  gsap.set(sc.el, { transformOrigin: `${leftWithin(a, sc.el) + a.offsetWidth * 0.86}px 58%` })
  FT1(sc.el, { scale: 0.5, opacity: 0, filter: B(20) }, { scale: 1, opacity: 1, filter: B(0) }, 35.62, 0.3, 'power3.out')
  FT(sc.el, { scale: 1 }, { scale: 1.12 }, 35.92, 0.3, 'sine.inOut')
  FT(sc.el, { scale: 1.12, filter: B(0) }, { scale: 16, filter: B(8) }, 36.22, 0.3, 'power3.in')
}

/* ================================================================
   SHOT L · rt 36.45–39.00 · "Protect" → "your margin" (then an iris closes on the mark)
   ================================================================ */
function shotL() {
  const s = scene(36.45, 39.02)
  s.style.zIndex = 3
  soft(s, [[110, 300, 520, 'rgba(90,214,255,.6)', 50], [380, 1000, 600, 'rgba(160,255,180,.55)', 60], [720, 1080, 420, 'rgba(236,255,190,.5)', 60]])
  const p = txt(s, 'Protect', { size: 80, w: 600, ls: '-0.02em' })
  paint(p.chars, 'linear-gradient(90deg, #0b8f4d, #0891b2)', p.el)
  FT1(p.el, { opacity: 0, scale: 0.8, filter: B(10) }, { opacity: 1, scale: 1, filter: B(0) }, 36.45, 0.26, 'power3.out')
  FT(p.chars, { opacity: 1 }, { opacity: 0 }, 37.02, 0.08, 'none', { stagger: { each: 0.035, from: 'edges' } })
  const y = txt(s, 'your margin', { size: 102, w: 500, ls: '-0.02em' })
  paint([...y.words[0].children], 'linear-gradient(90deg, #11c265 0%, #0891b2 100%)', y.words[0])
  paint([...y.words[1].children], 'linear-gradient(90deg, #1b211e 0%, #8a918e 100%)', y.words[1])
  centerOn(y, y.words, [37.42, 37.72])
  FT1(y.words[0], { opacity: 0, filter: B(8), scale: 0.9 }, { opacity: 1, filter: B(0), scale: 1 }, 37.42, 0.26)
  FT1([...y.words[1].children], { opacity: 0 }, { opacity: 1, stagger: 0.012 }, 37.72, 0.16)
  FT(y.el, { scale: 1 }, { scale: 1.04 }, 38.0, 0.6, 'sine.out')
  // the words clear before the logo pieces cross the frame
  FT(y.el, { opacity: 1, filter: B(0) }, { opacity: 0, filter: B(8) }, 38.5, 0.14, 'power1.in')
  // iris
  FT1(s, { clipPath: 'circle(1150px at 960px 540px)' }, { clipPath: 'circle(0px at 960px 540px)' }, 38.58, 0.42, 'power1.out')
}

/* ================================================================
   SHOT M · rt 38.58–42.40 · mark pieces converge, wordmark, horizon, tagline
   ================================================================ */
function shotM() {
  const s = scene(38.58)
  h('div', 'bg-night2', null, s)
  const hz = h('div', 'horizon', null, s)
  css(hz, { background: 'radial-gradient(closest-side, rgba(0,190,110,0) 0%, rgba(0,190,110,0) 88%, rgba(0,210,120,.18) 97%, rgba(0,210,120,.35) 100%)', boxShadow: 'inset 0 4px 0 rgba(235,255,245,.92), inset 0 26px 60px rgba(140,255,200,.22), 0 -18px 80px rgba(0,253,116,.22)' })
  FT1(hz, { y: 320, opacity: 0 }, { y: 0, opacity: 1 }, 39.35, 0.7, 'power2.out')
  const W = wordmark(s, '#fff', '#00fd74')
  const sc = slotCenter(W)
  gsap.set(W.slot, { opacity: 0 })
  const top = scene(38.58, 39.4); top.style.zIndex = 4
  const g = css(h('div', 'abs', null, top), { left: '960px', top: '540px' })
  const body = h('div', 'abs mark', markSVG('#0d110f', 'body'), g)
  const spread = h('div', 'abs mark', markSVG('#fff', 'spread'), g)
  css(body, { width: '150px', height: '173px', left: '-75px', top: '-86.5px' }); css(spread, { width: '150px', height: '173px', left: '-75px', top: '-86.5px' })
  FT1(body, { x: -560, y: -430, rotation: -38, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1 }, 38.58, 0.42, 'power2.out')
  FT1(spread, { x: 560, y: 430, rotation: 30, opacity: 0 }, { x: 0, y: 0, rotation: 0, opacity: 1 }, 38.6, 0.42, 'power2.out')
  FT1(body.querySelector('path'), { fill: '#0d110f' }, { fill: '#ffffff' }, 38.8, 0.26)
  FT(g, { x: 0, y: 0 }, { x: sc.x - 960, y: sc.y - 540 }, 39.0, 0.36, 'power3.inOut')
  W.letters.forEach((c, i) => FT1(c, { y: 18, opacity: 0, filter: B(6), color: '#7d8a84' }, { y: 0, opacity: 1, filter: B(0), color: i === 6 ? '#00fd74' : '#ffffff' }, 39.18 + i * 0.02, 0.28, 'power3.out'))
  SET(W.slot, { opacity: 1 }, 39.36); SET(g, { opacity: 0 }, 39.36)
  FT1(W.wm, { scale: 1, y: 0 }, { scale: 0.9, y: -88 }, 39.36, 0.45, 'power2.inOut')
  const tag = txt(s, 'Find money you already paid.', { size: 58, w: 600, y: 624, ls: '-0.01em' })
  paint(tag.chars, 'linear-gradient(90deg, #f1fff7 0%, #b8f9d4 45%, #00fd74 100%)', tag.el)
  FT1(tag.el, { opacity: 0, y: 26, filter: B(8) }, { opacity: 1, y: 0, filter: B(0) }, 40.0, 0.4, 'power3.out')
  FT1(s, { scale: 1 }, { scale: 1.02 }, 39.8, END_RT - 39.8, 'sine.out')
}

/* ---------------- captions ---------------- */
// captions follow the voiceover (Reclaim promo assets/04_film_audio/lines.json), film clock
const CUES = [
  [0.18, 3.96, 'Accounts payable errors cost businesses millions.'],
  [3.96, 8.5, 'All it takes is one duplicate invoice, or a new bank account,'],
  [8.5, 13.2, 'to trigger double payments, lost margin, and cash you never get back.'],
  [14.3, 15.6, 'Reclaim.'],
  [16.7, 22.2, 'A payment audit that lets you securely upload, instantly find,'],
  [22.2, 26.4, 'and recover money you already paid.'],
  [26.76, 29.1, 'Precise. Traceable. Provable.'],
  [29.1, 31.8, 'Duplicates, overpayments, bank changes.'],
  [31.8, 35.85, 'Reclaim checks every payment, catching leaks at scale.'],
  [35.85, 38.0, 'Protect your margin.'],
  [38.6, 42, 'Reclaim. Find money you already paid.'],
]

/* ---------------- soundtrack ----------------
   Voiceover, music and effects in one file (built by Reclaim promo assets/04_film_audio/mix_film.py). It plays through
   Web Audio so it can start anywhere on the timeline, and it is re-locked to the picture whenever they drift apart. */
const sound = (() => {
  let ctx = null, gain = null, buf = null, src = null, loading = null, playing = false, muted = false, startedAt = 0, offset = 0, onstart = null
  const AC = window.AudioContext || window.webkitAudioContext
  // decode ahead of time on an offline context, so no live AudioContext exists before the viewer presses play
  const load = () => loading || (loading = fetch('/film/film-audio.mp4').then(r => r.arrayBuffer())
    .then(ab => new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 1, 48000).decodeAudioData(ab))
    .then(b => { buf = b; if (playing) start(tl.time()) }).catch(() => {}))
  const stop = () => { if (!src) return; try { src.stop() } catch { /* already stopped */ } src.disconnect(); src = null }
  const start = t => {
    stop(); if (!ctx || !buf || t >= buf.duration - 0.05) return
    src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); src.start(0, Math.max(0, t)); startedAt = ctx.currentTime; offset = t
    if (onstart) onstart()
  }
  return {
    load,
    get muted() { return muted },
    play(t) {
      playing = true
      if (!ctx && AC) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = muted ? 0 : 1; gain.connect(ctx.destination) }
      if (!ctx) return
      ctx.resume(); if (buf) start(t); else load()
    },
    pause() { playing = false; stop() },
    seek(t) { if (playing) start(t) },
    set onstart(f) { onstart = f },
    mute(m) { muted = m; if (gain) gain.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.02) },
    // QA: where the sound is, in film seconds (null when silent)
    get position() { return src ? offset + ctx.currentTime - startedAt : null },
    get state() { return ctx ? ctx.state : 'none' },
  }
})()

/* ---------------- player ---------------- */
function mountPlayer() {
  const bigPlay = document.getElementById('bigPlay'), ppBtn = document.getElementById('ppBtn'), ccBtn = document.getElementById('ccBtn'), muteBtn = document.getElementById('muteBtn')
  const scrub = document.getElementById('scrub'), fill = document.getElementById('scrubFill'), knob = document.getElementById('scrubKnob')
  const time = document.getElementById('time'), cap = document.getElementById('captions'), screen = document.getElementById('screen')
  const fmt = sec => { sec = Math.max(0, Math.floor(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }
  let started = false, idleTimer = 0, lastCue = -1

  const sync = () => {
    const t = tl.time(), p = t / DUR
    fill.style.width = (p * 100) + '%'; knob.style.left = (p * 100) + '%'
    time.textContent = fmt(DUR - t)
    scrub.setAttribute('aria-valuenow', t.toFixed(1)); scrub.setAttribute('aria-valuetext', `${Math.floor(t)} of ${Math.floor(DUR)} seconds`)
    const i = CUES.findIndex(([a, b]) => t >= a && t < b)
    if (i !== lastCue) { lastCue = i; cap.textContent = i >= 0 ? CUES[i][2] : ''; cap.classList.toggle('has-text', i >= 0) }
  }
  tl.eventCallback('onUpdate', sync)
  tl.eventCallback('onComplete', () => { if (running) end() })

  const setState = st => {
    player.classList.toggle('is-playing', st === 'playing')
    player.classList.toggle('is-paused', st === 'paused')
    player.classList.toggle('is-ended', st === 'ended')
    ppBtn.setAttribute('aria-label', st === 'playing' ? 'Pause' : 'Play')
    bigPlay.setAttribute('aria-label', st === 'ended' ? 'Replay film' : 'Play film')
  }
  // While the soundtrack plays it is the clock and the picture follows it, as in a video player: if drawing stalls
  // (a background tab, a busy phone) the picture catches up to the sound instead of the two drifting apart.
  let running = false, driven = false
  const drive = () => { const p = sound.position; if (p == null) return; if (p >= DUR) return end(); tl.time(p) }
  const follow = on => { if (on === driven) return; driven = on; if (on) { tl.pause(); gsap.ticker.add(drive) } else gsap.ticker.remove(drive) }
  sound.onstart = () => { if (running) follow(true) }
  const end = () => { running = false; follow(false); sound.pause(); tl.pause(); tl.seek(DUR, false); setState('ended'); sync(); wake() }
  const play = () => {
    if (!started) { started = true; player.classList.remove('is-poster'); player.classList.add('is-leaving'); setTimeout(() => player.classList.remove('is-leaving'), 900) }
    if (tl.progress() >= 1) tl.seek(0)
    running = true; tl.play(); sound.play(tl.time()); setState('playing'); wake()
  }
  const pause = () => { running = false; follow(false); tl.pause(); sound.pause(); setState('paused'); wake() }
  const toggle = () => (running ? pause() : play())
  const wake = () => {
    player.classList.remove('is-idle'); clearTimeout(idleTimer)
    if (running) idleTimer = setTimeout(() => player.classList.add('is-idle'), started && tl.time() < 0.3 ? 700 : 1800)
  }
  const seek = t => { tl.seek(Math.min(DUR, Math.max(0, t)), false); sound.seek(tl.time()); if (!running && started) setState(tl.progress() >= 1 ? 'ended' : 'paused'); sync() }

  bigPlay.addEventListener('click', e => { e.stopPropagation(); play() })
  screen.addEventListener('click', () => (started ? toggle() : play()))
  ppBtn.addEventListener('click', e => { e.stopPropagation(); if (started) toggle(); else play() })
  muteBtn.addEventListener('click', e => { e.stopPropagation(); const m = !sound.muted; sound.mute(m); player.classList.toggle('is-muted', m); muteBtn.setAttribute('aria-pressed', m); muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute') })
  // a hidden tab stops the picture, so stop the sound with it
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause() })
  ccBtn.addEventListener('click', e => { e.stopPropagation(); const on = !player.classList.contains('cc-on'); player.classList.toggle('cc-on', on); ccBtn.setAttribute('aria-pressed', on) })
  player.addEventListener('pointermove', wake)
  player.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') player.classList.add('is-touch') })
  // hover reveal of the poster play button needs a little time on screen for touch/keyboard users too
  setTimeout(() => player.classList.add('show-play'), 1400)

  const at = e => { const r = scrub.getBoundingClientRect(); return (e.clientX - r.left) / r.width * DUR }
  scrub.addEventListener('pointerdown', e => {
    e.stopPropagation(); if (!started) { started = true; player.classList.remove('is-poster') }
    const was = running; pause(); scrub.classList.add('is-drag'); scrub.setPointerCapture(e.pointerId); seek(at(e))
    const move = ev => seek(at(ev))
    const up = () => { scrub.classList.remove('is-drag'); scrub.removeEventListener('pointermove', move); scrub.removeEventListener('pointerup', up); scrub.removeEventListener('pointercancel', up); if (was && tl.progress() < 1) play() }
    scrub.addEventListener('pointermove', move); scrub.addEventListener('pointerup', up); scrub.addEventListener('pointercancel', up)
  })
  scrub.addEventListener('click', e => e.stopPropagation())
  player.addEventListener('keydown', e => {
    const k = e.key
    if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); if (started) toggle(); else play() }
    else if (k === 'ArrowRight' || k === 'l') { e.preventDefault(); seek(tl.time() + 5) }
    else if (k === 'ArrowLeft' || k === 'j') { e.preventDefault(); seek(tl.time() - 5) }
    else if (k === 'Home') { e.preventDefault(); seek(0) }
    else if (k === 'End') { e.preventDefault(); seek(DUR) }
    else if (k === 'c' || k === 'C') ccBtn.click()
    else if (k === 'm' || k === 'M') muteBtn.click()
    else return
    wake()
  })
  sync()

  // debugging / QA: ?t=12.3 opens paused on that film-clock moment, ?rt=12.3 on the reference clock
  const q = new URLSearchParams(location.search)
  const qt = q.has('rt') ? T(+q.get('rt')) : q.has('t') ? +q.get('t') : null
  if (qt != null && !Number.isNaN(qt)) { started = true; player.classList.remove('is-poster'); seek(qt); setState('paused'); player.classList.add('qa') }
  window.__film = { tl, T, DUR, seek, play, pause, sound }
}

/* ---------------- sizing ---------------- */
function fit() {
  const k = player.clientWidth / 1920
  document.documentElement.style.setProperty('--k', k.toFixed(5))
  window.dispatchEvent(new Event('film:resize'))
}

/* ---------------- boot ---------------- */
async function boot() {
  fit()
  new ResizeObserver(fit).observe(player)
  const fonts = Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(`${w} 100px Manrope`))).catch(() => {})
  const land = fetch('/film/land-110m.json').then(r => r.json()).then(topo => { if (window.topojson) LAND = topojson.feature(topo, topo.objects.land) }).catch(() => {})
  await Promise.race([Promise.all([fonts, land]), new Promise(r => setTimeout(r, 4000))])
  ;[shotA, shotB, shotC, shotD, shotE, shotF, shotG, shotH, shotI, shotJ, shotK, shotL, shotM].forEach(f => f())
  tl.set({}, {}, DUR)
  tl.seek(0.001).seek(0)
  mountPlayer()
  sound.load()
  player.classList.add('is-ready')
}
if (window.gsap) boot()
else document.getElementById('stage').textContent = ''
})()

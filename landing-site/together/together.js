/* Reclaim "brings it all together" — a shot-for-shot rebuild of a 12.6-second payments film, recut for Reclaim.
   One paused GSAP timeline drives every layer, so the player can play, pause and scrub any frame.
   Times are the reference video's own clock, in seconds; positions are 1920×1080 stage pixels. */
const gsap = window.gsap

const DUR = 12.61
const player = document.getElementById('player')
const stage = document.getElementById('stage')
const tl = gsap.timeline({ paused: true })
const NS = 'http://www.w3.org/2000/svg'

const h = (tag, cls, html, parent) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  if (parent) parent.appendChild(e)
  return e
}
const at = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; return el }
const B = n => `blur(${n}px)`
// fromTo whose start values wait for the playhead (for a property that is animated more than once)
const FT = (t, from, to, when) => tl.fromTo(t, from, { ...to, immediateRender: false }, when)

function scene(tIn, tOut, cls) {
  const el = h('div', 'scene ' + cls, null, stage)
  tl.set(el, { visibility: 'visible' }, tIn)
  if (tOut != null) tl.set(el, { visibility: 'hidden' }, tOut)
  return el
}

/* Directional motion blur: an SVG gaussian per layer. The timeline tweens {x, y} (stage px); the ticker
   writes the filter, and drops it entirely at rest so idle layers cost nothing. A blurred layer must have
   a real box (the filter region is relative to it), so every one of them is a full 1920×1080 layer. */
const fx = document.createElementNS(NS, 'svg')
fx.setAttribute('class', 'fx-defs'); fx.setAttribute('aria-hidden', 'true')
const defs = document.createElementNS(NS, 'defs')
fx.appendChild(defs); stage.appendChild(fx)
const BLURS = []
function mblur(el) {
  const id = 'mb' + BLURS.length
  const f = document.createElementNS(NS, 'filter')
  f.setAttribute('id', id)
  ;[['x', '-25%'], ['y', '-25%'], ['width', '150%'], ['height', '150%'], ['color-interpolation-filters', 'sRGB']].forEach(([k, v]) => f.setAttribute(k, v))
  const g = document.createElementNS(NS, 'feGaussianBlur')
  g.setAttribute('stdDeviation', '0 0')
  f.appendChild(g); defs.appendChild(f)
  const st = { x: 0, y: 0, el, g, id, last: '' }
  BLURS.push(st)
  return st
}
function paintBlurs() {
  for (const b of BLURS) {
    const on = b.x > 0.08 || b.y > 0.08
    const key = on ? `${b.x.toFixed(2)} ${b.y.toFixed(2)}` : ''
    if (key === b.last) continue
    b.last = key
    if (on) { b.g.setAttribute('stdDeviation', key); b.el.style.filter = `url(#${b.id})` } else b.el.style.filter = ''
  }
}
const layer = (parent, cls = '') => h('div', 'abs ' + cls, null, parent)
const fullLayer = (parent, cls = '') => { const l = layer(parent, cls); l.style.width = '1920px'; l.style.height = '1080px'; return l }

/* Type: a line built of spans, one per character (or per word), each revealed on its own. */
function chars(parent, text, cls = '') {
  return [...text].map(c => h('span', 'ch ' + cls, c === ' ' ? ' ' : c, parent))
}
function words(parent, list) {
  return list.map(([text, cls], i) => {
    if (i) h('span', 'wd', ' ', parent)
    return h('span', 'wd ' + (cls || ''), text, parent)
  })
}
function typeIn(spans, t0, step, { dur = 0.14, blur = 7, x = 0, y = 0, ease = 'power2.out' } = {}) {
  spans.forEach((s, i) => tl.fromTo(s, { opacity: 0, filter: B(blur), x, y }, { opacity: 1, filter: B(0), x: 0, y: 0, duration: dur, ease }, t0 + i * step))
}
// a text line whose box is anchored at a point: 'c' centres it, 'l' hangs it off its left edge
function lineAt(parent, x, y, cls, anchor = 'c') {
  const p = at(h('div', 'pt', null, parent), x, y)
  const inner = h('div', 'abs', null, p)
  const line = h('div', 'abs line ' + cls, null, inner)
  line.style.whiteSpace = 'nowrap'
  line.style.transform = anchor === 'c' ? 'translate(-50%, -50%)' : 'translate(0, -50%)'
  return { p, inner, line }
}

/* The Reclaim mark: the six blocks of #hx-wheel (landing-site/src/partials/sprite.html), viewBox -13 -11.5 26 23. */
const WHEEL = [
  [-2.056, -4.6, -5.751, -11, 5.751, -11, 2.056, -4.6],
  [2.956, -4.081, 6.651, -10.481, 12.402, -0.520, 5.012, -0.520],
  [5.012, 0.520, 12.402, 0.520, 6.651, 10.481, 2.956, 4.081],
  [2.056, 4.6, 5.751, 11, -5.751, 11, -2.056, 4.6],
  [-2.956, 4.081, -6.651, 10.481, -12.402, 0.520, -5.012, 0.520],
  [-5.012, -0.520, -12.402, -0.520, -6.651, -10.481, -2.956, -4.081],
]
const WHEEL_SVG = `<svg viewBox="-13 -11.5 26 23" aria-hidden="true">${WHEEL.map(p => `<path d="M${p[0]},${p[1]} L${p[2]},${p[3]} L${p[4]},${p[5]} L${p[6]},${p[7]} Z"/>`).join('')}</svg>`
const wordmark = () => `<span class="wordmark">${WHEEL_SVG}<span>Reclaim</span></span>`
document.querySelector('.home-mark')?.insertAdjacentHTML('afterbegin', WHEEL_SVG)

/* ============ 1 · 0.00–1.38  "Payables are" → five findings in orbit around "Complex." ============ */
const PILL_ICON = {
  dup: `<svg viewBox="0 0 64 64"><defs><linearGradient id="giDa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa6f2"/><stop offset="1" stop-color="#d63ec7"/></linearGradient><linearGradient id="giDb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dde8ef"/></linearGradient></defs>
    <rect x="21" y="5" width="32" height="40" rx="5" fill="url(#giDa)" transform="rotate(12 37 25)"/>
    <rect x="9" y="13" width="32" height="41" rx="5" fill="url(#giDb)"/>
    <path d="M16 24h18M16 31h18M16 38h11" stroke="#93a3b3" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="46" cy="47" r="12" fill="#ffd43b"/><path d="M40.5 42.5l11 9M51.5 42.5l-11 9" stroke="#7a4300" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  bank: `<svg viewBox="0 0 64 64"><defs><radialGradient id="giBa" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe89a"/><stop offset=".6" stop-color="#f5b52a"/><stop offset="1" stop-color="#c97d06"/></radialGradient></defs>
    <circle cx="32" cy="33" r="21" fill="url(#giBa)"/><circle cx="32" cy="33" r="16" fill="none" stroke="#fff2c2" stroke-width="2" opacity=".7"/>
    <path d="M21 29.5L32 23l11 6.5z" fill="#8a5300"/><path d="M24 31v9M29 31v9M35 31v9M40 31v9" stroke="#8a5300" stroke-width="3" stroke-linecap="round"/><path d="M21.5 42.5h21" stroke="#8a5300" stroke-width="3" stroke-linecap="round"/>
    <path d="M9 22a25 25 0 0 1 14-13" fill="none" stroke="#fff4c7" stroke-width="3.4" stroke-linecap="round"/><path d="M20 5.5l4 3.5-4.8 2.6" fill="none" stroke="#fff4c7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M55 44a25 25 0 0 1-14 13" fill="none" stroke="#fff4c7" stroke-width="3.4" stroke-linecap="round"/><path d="M44 60.5l-4-3.5 4.8-2.6" fill="none" stroke="#fff4c7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  price: `<svg viewBox="0 0 64 64"><defs><linearGradient id="giPa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a6b"/><stop offset="1" stop-color="#e2382a"/></linearGradient></defs>
    <path d="M6 33.5L30.5 9H53a3 3 0 0 1 3 3v22.5L31.5 59a3 3 0 0 1-4.2 0L6 37.7a3 3 0 0 1 0-4.2z" fill="url(#giPa)"/>
    <path d="M8 34L31 11" stroke="#ffc4a8" stroke-width="2" opacity=".7"/><circle cx="45" cy="20" r="4.6" fill="#fff3ea"/>
    <path d="M35.5 30.5c-1-1.6-2.7-2.3-4.4-2-2.1.4-3.3 2-2.7 3.6.9 2.5 6.6 1.3 7.3 4.3.4 1.8-1.1 3.4-3.4 3.6-1.9.2-3.6-.6-4.5-2.1M31.3 26.4v2M32.7 39.9v2" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  anom: `<svg viewBox="0 0 64 64"><defs><linearGradient id="giAa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#d9263a"/></linearGradient></defs>
    <rect x="7" y="38" width="10" height="17" rx="2.5" fill="#bfe9ff"/><rect x="20" y="32" width="10" height="23" rx="2.5" fill="#8fd6ff"/><rect x="33" y="12" width="10" height="43" rx="2.5" fill="url(#giAa)"/><rect x="46" y="35" width="10" height="20" rx="2.5" fill="#bfe9ff"/>
    <path d="M47 5.5l11 19a2 2 0 0 1-1.7 3H34.7a2 2 0 0 1-1.7-3l11-19a2 2 0 0 1 3 0z" fill="#ffd43b" transform="translate(4 -1)"/>
    <path d="M49.5 12v7" stroke="#6b3b00" stroke-width="3.2" stroke-linecap="round"/><circle cx="49.5" cy="23" r="1.9" fill="#6b3b00"/></svg>`,
  disc: `<svg viewBox="0 0 64 64"><defs><linearGradient id="giCa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dfe8ee"/></linearGradient></defs>
    <rect x="7" y="11" width="44" height="44" rx="7" fill="url(#giCa)"/><path d="M7 18a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v6H7z" fill="#ff5252"/>
    <path d="M18 7v9M40 7v9" stroke="#8a97a6" stroke-width="3.6" stroke-linecap="round"/>
    <text x="29" y="46.5" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="17" fill="#2c3a48">2/10</text>
    <circle cx="50" cy="48" r="11" fill="#ffd43b"/><path d="M45.5 52.5l9-9" stroke="#7a4300" stroke-width="2.8" stroke-linecap="round"/><circle cx="46.2" cy="44.2" r="2.1" fill="#7a4300"/><circle cx="53.8" cy="51.8" r="2.1" fill="#7a4300"/></svg>`,
}
// [icon, label, x, y (relative to the cluster centre), scale — nearer pills read larger]
const PILLS = [
  ['dup', 'Duplicates', -262, -298, 0.9],
  ['bank', 'Bank changes', 486, -172, 1.02],
  ['price', 'Pricing', -598, -5, 1.16],
  ['anom', 'Anomalies', 548, 188, 1.05],
  ['disc', 'Missed discounts', -262, 286, 1.05],
]
function shot1() {
  const sc = scene(0, 1.38, 's1')
  const bg = h('div', 'bg', null, sc)
  tl.fromTo(bg, { opacity: 0.55, x: 0 }, { opacity: 1, x: -50, duration: 1.4, ease: 'power1.out' }, 0)

  // "Payables are": the first word resolves in place, the second rises into the line; then the camera pushes through it
  const t = lineAt(sc, 960, 544, 'on-dark title')
  const [w1, w2] = words(t.line, [['Payables'], ['are']])
  tl.fromTo(w1, { opacity: 0, filter: B(14) }, { opacity: 1, filter: B(0), duration: 0.3, ease: 'power2.out' }, 0.04)
  tl.fromTo(w2, { opacity: 0, filter: B(10), y: 48 }, { opacity: 1, filter: B(0), y: 0, duration: 0.24, ease: 'power2.out' }, 0.2)
  tl.fromTo(t.inner, { scale: 0.97 }, { scale: 1.06, duration: 0.46, ease: 'none' }, 0.04)
  FT(t.inner, { scale: 1.06 }, { scale: 1.24, duration: 0.05, ease: 'power1.in' }, 0.515)
  tl.fromTo(t.line, { opacity: 1, filter: B(0) }, { opacity: 0.5, filter: B(8), duration: 0.05, ease: 'power1.in' }, 0.515)
  tl.set(t.p, { autoAlpha: 0 }, 0.565)

  // the cluster cuts in small and soft, snaps into focus, then keeps drifting towards the camera
  const world = fullLayer(sc)
  const mb = mblur(world)
  const g = at(h('div', 'pt', null, world), 960, 544)
  tl.set(world, { autoAlpha: 0 }, 0)
  tl.set(world, { autoAlpha: 1 }, 0.565)
  tl.fromTo(g, { scale: 0.7 }, { scale: 0.97, duration: 0.22, ease: 'power2.out' }, 0.565)
  FT(g, { scale: 0.97 }, { scale: 1.045, duration: 0.5, ease: 'none' }, 0.785)
  tl.fromTo(mb, { x: 9, y: 9 }, { x: 0, y: 0, duration: 0.2, ease: 'power1.out' }, 0.565)

  const rings = h('div', 'pt', `<svg class="rings" viewBox="-620 -620 1240 1240">${[430, 478, 524, 568].map((r, i) => `<circle r="${r}" opacity="${0.55 + i * 0.13}"/>`).join('')}</svg>`, g)
  tl.fromTo(rings, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, 0.62)

  PILLS.forEach(([ic, label, x, y, s], i) => {
    const p = h('div', 'pill', `<span class="ic">${PILL_ICON[ic]}</span><span>${label}</span>`, g)
    gsap.set(p, { xPercent: -50, yPercent: -50, x, y, scale: s })
    const d = (i % 2 ? 1 : -1) * (5 + i * 2)
    tl.fromTo(p, { y: y - d }, { y: y + d, duration: 0.75, ease: 'sine.inOut' }, 0.57)
  })

  const cp = lineAt(g, -7, -15, 'on-dark')
  cp.line.style.fontSize = '118px'
  typeIn(chars(cp.line, 'Complex.'), 0.6, 0.036, { dur: 0.12, blur: 6 })

  // whip up and out
  FT(g, { y: 0 }, { y: -300, duration: 0.08, ease: 'power1.in' }, 1.30)
  FT(mb, { x: 0, y: 0 }, { x: 1, y: 34, duration: 0.05, ease: 'none' }, 1.30)
}

/* ============ 2 · 1.38–2.50  the camera rises past three pedestals: "Different systems." ============ */
function shot2() {
  const sc = scene(1.38, 2.50, 's2')
  h('div', 'bg', null, sc)
  const cam = fullLayer(sc, 'cam')
  const mb = mblur(cam)

  // the pedestals, drawn as they sit at 1.95 s; three boxes turned 45°, lit from the left
  const box = (l, m, r, top) => {
    const dy = 20
    return `<polygon class="fl" points="${l},${top} ${m},${top + dy} ${m},1700 ${l},1700"/>
      <polygon class="fr" points="${m},${top + dy} ${r},${top} ${r},1700 ${m},1700"/>
      <polygon class="tp" points="${l},${top} ${m},${top + dy} ${r},${top} ${l + r - m},${top - dy}"/>`
  }
  h('div', null, `<svg class="peds" viewBox="0 0 1920 1700" aria-hidden="true">
    <defs>
      <linearGradient id="pedL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f3f27"/><stop offset=".25" stop-color="#0a2e1c"/><stop offset=".6" stop-color="#051a10"/><stop offset="1" stop-color="#020a06"/></linearGradient>
      <linearGradient id="pedR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#082a1a"/><stop offset=".3" stop-color="#051c11"/><stop offset="1" stop-color="#010604"/></linearGradient>
      <linearGradient id="pedT" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f9c66"/><stop offset=".5" stop-color="#1f7a4e"/><stop offset="1" stop-color="#155a39"/></linearGradient>
    </defs>
    <style>.fl{fill:url(#pedL)}.fr{fill:url(#pedR)}.tp{fill:url(#pedT);stroke:rgba(170,255,210,.45);stroke-width:2}</style>
    ${box(347, 563, 750, 872)}${box(1191, 1369, 1584, 787)}${box(750, 995, 1191, 703)}
  </svg>`, cam)

  // [kind, centre x, centre y, w, h]
  const TILES = [
    ['xero', 562, 752, 244, 215, '<span class="xero">xero</span>'],
    ['qb', 970, 569, 235, 225, '<span class="qb">qb</span><span class="qb-l">QuickBooks</span>'],
    ['ns', 1360, 659, 243, 216, '<span class="ns">N</span><span class="ns-l">NetSuite</span>'],
  ]
  TILES.forEach(([, x, y, w, hh, glyph], i) => {
    const tile = h('div', 'tile', `<span class="glyph">${glyph}</span>`, cam)
    Object.assign(tile.style, { width: w + 'px', height: hh + 'px' })
    if (i === 1) tile.querySelector('.glyph').style.gap = '14px'
    gsap.set(tile, { xPercent: -50, yPercent: -50, x, y })
    const d = [7, -6, 8][i]
    tl.fromTo(tile, { y: y + d }, { y: y - d, duration: 1.12, ease: 'sine.inOut' }, 1.38)
  })

  // camera: rises fast out of the glow and settles, then keeps drifting up
  tl.fromTo(cam, { y: 560 }, { y: 0, duration: 0.8, ease: 'power2.out' }, 1.38)
  FT(cam, { y: 0 }, { y: -26, duration: 0.25, ease: 'none' }, 2.2)
  tl.fromTo(mb, { x: 0.5, y: 14 }, { x: 0, y: 0, duration: 0.38, ease: 'power1.out' }, 1.38)

  // the line rides a slower layer, so it lags the pedestals
  const t = lineAt(sc, 958, 300, 'on-dark title')
  const [w1, w2] = words(t.line, [['Different'], ['systems.']])
  tl.fromTo(t.inner, { y: 200 }, { y: 0, duration: 0.62, ease: 'power2.out' }, 1.45)
  FT(t.inner, { y: 0 }, { y: -14, duration: 0.38, ease: 'none' }, 2.07)
  tl.fromTo(w1, { opacity: 0, filter: B(10) }, { opacity: 1, filter: B(0), duration: 0.18, ease: 'power2.out' }, 1.54)
  tl.fromTo(w2, { opacity: 0, filter: B(9), y: 54 }, { opacity: 1, filter: B(0), y: 0, duration: 0.2, ease: 'power2.out' }, 1.77)
}

/* ============ the vendor map (Natural Earth 110m land, Mercator) ============ */
let LAND = null
const NA_FALLBACK = [[-168, 65], [-162, 70], [-141, 69.6], [-128, 70], [-115, 68.5], [-95, 68], [-82, 66], [-78, 72], [-68, 70], [-62, 60], [-56, 52], [-66, 45], [-70, 43], [-74, 40.5], [-76, 38], [-76, 35], [-81, 31.5], [-80, 27], [-80.4, 25.1], [-82.7, 28], [-84, 30], [-89, 30.2], [-94, 29.5], [-97.2, 27.5], [-97.5, 24], [-96, 19], [-94, 18.2], [-91, 18.7], [-90.4, 21], [-87, 21.5], [-88, 16], [-83.5, 15], [-83.5, 11], [-79.5, 9], [-77.5, 8], [-80, 7.5], [-85, 10], [-87, 13], [-92, 14.5], [-96, 15.8], [-105, 19.5], [-106, 23], [-109, 24.5], [-112.5, 29], [-114.5, 31], [-112, 27], [-110, 23], [-111.5, 25], [-114, 28], [-117, 32.5], [-120.5, 34.5], [-122.5, 37.5], [-124, 40.5], [-124.5, 43], [-124, 46.5], [-124.7, 48.4], [-127, 50.5], [-130, 54.5], [-134, 58], [-140, 59.8], [-146, 60.8], [-152, 59], [-157, 56.5], [-162, 55], [-158, 58.5], [-162, 60], [-166, 62], [-165, 64.5]]
const LAKES = [
  [[-92.1, 46.7], [-89.5, 48.0], [-86.5, 48.8], [-84.8, 47.9], [-84.6, 46.5], [-86.5, 46.4], [-88.3, 47.2], [-90.5, 46.6]],
  [[-87.8, 41.7], [-87.2, 41.6], [-86.3, 42.4], [-86.2, 43.7], [-85.5, 45.2], [-84.8, 45.8], [-85.9, 45.9], [-87.2, 45.4], [-87.9, 44.5], [-87.8, 43.0]],
  [[-84.7, 45.9], [-83.4, 45.9], [-81.3, 45.9], [-80.0, 45.3], [-80.7, 44.6], [-81.7, 44.0], [-82.4, 43.0], [-83.4, 44.0], [-83.3, 45.0]],
  [[-83.4, 41.7], [-81.6, 41.5], [-79.8, 42.2], [-78.9, 42.9], [-80.4, 42.6], [-82.3, 42.1]],
  [[-79.8, 43.3], [-78.0, 43.4], [-76.2, 43.6], [-76.3, 44.2], [-77.5, 43.9], [-79.3, 43.7]],
  [[-99.3, 53.9], [-97.2, 54.0], [-96.3, 51.6], [-96.9, 50.4], [-98.2, 51.1], [-99.2, 52.6]],
  [[-119, 62.5], [-115, 62.3], [-112, 61.4], [-114, 60.9], [-117, 61.3]],
]
const BORDERS = [
  [[-123.3, 49], [-95.2, 49], [-95.2, 49.4], [-89.6, 48.0], [-84.8, 46.5], [-82.4, 45.3], [-82.5, 43.0], [-79.1, 43.1], [-79.2, 43.5], [-76.3, 44.1], [-74.7, 45.0], [-71.5, 45.0], [-70.7, 45.4], [-69.2, 47.4], [-67.8, 47.1], [-67.1, 45.2]],
  [[-141, 60.3], [-141, 69.6]],
  [[-117.1, 32.5], [-114.7, 32.7], [-111, 31.3], [-108.2, 31.3], [-108.2, 31.8], [-106.5, 31.8], [-104.5, 29.6], [-103, 29], [-101.4, 29.8], [-99.5, 27.5], [-97.1, 25.9]],
  [[-92.2, 14.5], [-91.2, 17.2], [-90.9, 17.8], [-89.1, 17.8]],
]
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI
function landRings() {
  const rings = []
  if (LAND) {
    const geoms = LAND.type === 'FeatureCollection' ? LAND.features.map(f => f.geometry) : [LAND.geometry || LAND]
    geoms.forEach(g => {
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
      polys.forEach(poly => poly.forEach(ring => {
        if (ring.some(([lo, la]) => lo > -172 && lo < -45 && la > 5 && la < 84)) rings.push(ring)
      }))
    })
  }
  return rings.length ? rings : [NA_FALLBACK]
}
function mapSVG({ w, hgt, ox = 0, oy = 0, s, lon0, lat0, cx, cy, dots, dotFill }) {
  const m0 = merc(lat0)
  const P = (lo, la) => [cx + s * (lo - lon0), cy - s * (merc(Math.max(-80, Math.min(84, la))) - m0)]
  const path = (rings, close = true) => rings.map(r => r.map(([lo, la], i) => { const [x, y] = P(lo, la); return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) }).join('') + (close ? 'Z' : '')).join('')
  const land = path(landRings())
  const svg = `<svg class="map" width="${w}" height="${hgt}" viewBox="${ox} ${oy} ${w} ${hgt}" style="left:${ox}px;top:${oy}px" aria-hidden="true">
    <defs>
      <pattern id="${dots}" width="17" height="14.72" patternUnits="userSpaceOnUse"><circle cx="4.25" cy="3.68" r="1.8" fill="${dotFill}"/><circle cx="12.75" cy="11.04" r="1.8" fill="${dotFill}"/></pattern>
      <pattern id="${dots}c" width="46" height="39.8" patternUnits="userSpaceOnUse"><circle cx="11.5" cy="10" r="9" fill="rgba(0,25,12,.16)"/><circle cx="34.5" cy="29.9" r="9" fill="rgba(0,25,12,.12)"/></pattern>
    </defs>
    <path class="land" d="${land}"/><path d="${land}" fill="url(#${dots}c)"/><path class="dots" d="${land}"/>
    <path class="lake" d="${path(LAKES)}"/>
    <path class="border" d="${path(BORDERS, false)}"/>
  </svg>`
  return { svg, P }
}
function pulse(parent, x, y, t0, until, scale = 1) {
  const p = at(h('div', 'pulse', '<i class="r3"></i><i class="r2"></i><i class="r1"></i><i class="d"></i>', parent), x, y)
  gsap.set(p, { scale })
  const [r3, r2, r1, d] = p.children
  tl.fromTo([d, r1, r2], { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)', stagger: 0.04 }, t0)
  const reps = Math.max(0, Math.floor((until - t0 - 0.2) / 0.8) - 1)
  tl.fromTo(r3, { scale: 0.6, opacity: 0.9 }, { scale: 1.7, opacity: 0, duration: 0.8, ease: 'power1.out', repeat: reps }, t0 + 0.2)
  return p
}

/* ============ 3 · 2.50–3.66  "Different vendors." on the light map, then a whip turn ============ */
function shot3() {
  const sc = scene(2.50, 3.66, 's3')
  const world = fullLayer(sc)
  const mb = mblur(world)
  const { svg, P } = mapSVG({ w: 3200, hgt: 2400, ox: -640, oy: -660, s: 21.4, lon0: -80.4, lat0: 25.1, cx: 975, cy: 787, dots: 'mapDots', dotFill: 'rgba(255,255,255,.2)' })
  h('div', null, svg, world)

  const CITIES = [[-111.1, 51.6], [-104.9, 48.8], [-114.1, 43.7], [-97.5, 36.7], [-106.4, 24.5], [-75.5, 49.5], [-88.5, 41.0]]
  CITIES.forEach(([lo, la], i) => { const [x, y] = P(lo, la); pulse(world, x, y, 2.6 + i * 0.05, 3.66, i === 6 ? 0.6 : 1) })

  const t = lineAt(world, 1084, 540, 'on-light title', 'l')
  typeIn(chars(t.line, 'Different vendors.'), 2.57, 0.031, { dur: 0.13, blur: 6, x: 10 })

  gsap.set(world, { transformOrigin: '760px 470px' })
  tl.fromTo(world, { x: -300, scale: 1.22 }, { x: 0, scale: 1, duration: 0.37, ease: 'power3.out' }, 2.50)
  FT(world, { x: 0, scale: 1 }, { x: 22, scale: 1.05, duration: 0.6, ease: 'none' }, 2.82)
  tl.fromTo(mb, { x: 16, y: 0.5 }, { x: 0, y: 0, duration: 0.27, ease: 'power1.out' }, 2.50)
  // the whip: the whole map swings clockwise and blurs out
  FT(world, { rotation: 0 }, { rotation: 48, duration: 0.26, ease: 'none' }, 3.40)
  FT(world, { scale: 1.05, x: 22 }, { scale: 1.34, x: 60, duration: 0.26, ease: 'power1.in' }, 3.40)
  FT(mb, { x: 0, y: 0 }, { x: 20, y: 13, duration: 0.12, ease: 'power1.out' }, 3.42)
}

/* ============ 4 · 3.66–4.62  the same map laid flat in the dark: "Different terms." ============ */
function shot4() {
  const sc = scene(3.66, 4.62, 's4')
  h('div', 'haze', null, sc)
  const view = fullLayer(sc, 'view')
  const mb = mblur(view)
  const plane = h('div', 'plane', null, view)
  const { svg } = mapSVG({ w: 4200, hgt: 3000, ox: -2100, oy: -1900, s: 58, lon0: -89, lat0: 37, cx: 0, cy: 0, dots: 'mapDots2', dotFill: 'rgba(210,255,230,.24)' })
  const mapEl = h('div', null, svg, plane).firstElementChild
  // the far side of the plane dissolves into the dark, which reads as the horizon (svg-local y: plane y + 1900)
  mapEl.style.webkitMaskImage = mapEl.style.maskImage = 'linear-gradient(180deg, transparent 0, transparent 1640px, #000 1860px)'

  // pulses are placed where they sit on screen in the reference's settled frame, projected back onto the plane
  // (perspective 1500, origin 960/380, plane at 960/560 tilted 58°)
  const inv = (X, Y) => {
    const P = 1500, s = Math.sin(58 * Math.PI / 180), c = Math.cos(58 * Math.PI / 180), D = Y - 380
    const y = P * (D - 180) / (P * c + D * s)
    return [(X - 960) * (P - y * s) / P, y]
  }
  ;[[431, 632], [1022, 587], [1335, 615], [1228, 718], [765, 859]].forEach(([X, Y], i) => { const [x, y] = inv(X, Y); pulse(plane, x, y, 3.68 + i * 0.04, 4.62, 1.9) })

  tl.fromTo(plane, { rotationX: 66, rotationZ: -18, y: 150, scale: 1.12 }, { rotationX: 58, rotationZ: 0, y: 0, scale: 1, duration: 0.55, ease: 'power2.out' }, 3.66)
  FT(plane, { scale: 1 }, { scale: 1.035, duration: 0.41, ease: 'none' }, 4.21)
  tl.fromTo(mb, { x: 24, y: 12 }, { x: 0, y: 0, duration: 0.42, ease: 'power1.out' }, 3.66)

  const t = lineAt(sc, 958, 319, 'on-dark title')
  typeIn(chars(t.line, 'Different terms.'), 3.72, 0.031, { dur: 0.13, blur: 6 })
  tl.fromTo(t.inner, { x: -120, filter: B(5) }, { x: 0, filter: B(0), duration: 0.6, ease: 'power2.out' }, 3.7)
  FT(t.inner, { scale: 1, filter: B(0) }, { scale: 1.1, filter: B(8), duration: 0.05, ease: 'power1.in' }, 4.57)
}

/* ============ 5 · 4.62–6.28  rings, the mark and the product: "Reclaim brings it all together." ============ */
const ICO = {
  upload: '<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>',
  sample: '<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4M9 12h6M9 15h6M9 18h4"/>',
  drop: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9.5h17M8 14h3"/>',
  letter: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  credit: '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><path d="M9 9h6M9 12.5h6M9 16h3"/>',
  refund: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5v4h4"/><path d="M12 8v8M14.2 9.6c-.4-.8-1.2-1.2-2.2-1.2-1.2 0-2.1.6-2.1 1.5 0 2.1 4.4 1.1 4.4 3.3 0 .9-.9 1.6-2.2 1.6-1 0-1.9-.4-2.3-1.2"/>',
}
const phoneScreen = () => `<div class="island"></div>
  <div class="status"><span>9:41</span><span class="sig"><i></i><i></i></span></div>
  <div class="hdr"><span class="app">${WHEEL_SVG}</span>Home</div>
  <div class="sec" style="top:118px"><div class="lbl">Today</div></div>
  <div class="sec" style="top:158px"><div class="box"><div><small>Ready to claim</small><b>$31.4K</b></div><div><small>Findings</small><b>28</b></div></div><div class="dots2">● ○</div></div>
  <div class="sec" style="top:318px"><div class="lbl">Recovery overview</div><div class="tabs"><span class="on">1W</span><span>4W</span><span>1Y</span><span>MTD</span><span>QTD</span><span>YTD</span><span>ALL</span></div></div>
  <div class="sec" style="top:448px"><div class="kpi"><div class="g"><small>Recovered</small><b>$12.9K</b><em>Sep 17–Sep 23</em></div><div style="text-align:right"><small class="up">+18%</small><b>$10.9K</b><em>Sep 10–Sep 16</em></div></div></div>
  <div class="chart"><svg viewBox="0 0 598 300" preserveAspectRatio="none">
    <path d="M0 250 L70 190 L140 225 L215 130 L290 205 L360 150 L430 185 L500 120 L598 150" fill="none" stroke="#6f7a76" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0 270 L75 215 L150 250 L225 175 L300 235 L370 120 L445 160 L520 60 L598 30" fill="none" stroke="#35f095" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="520" cy="60" r="8" fill="#35f095"/><rect x="450" y="72" width="116" height="42" rx="10" fill="#1d5a3c"/><text x="508" y="100" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="21" fill="#bfffdc">$12.9K</text>
  </svg></div>`
function shot5() {
  const sc = scene(4.62, 6.28, 's5')
  const world = fullLayer(sc)
  const mb = mblur(world)
  gsap.set(world, { transformOrigin: '960px 560px' })

  const rings = h('div', 'rings', `<svg viewBox="-1200 -1200 2400 2400" aria-hidden="true">
    <defs><filter id="ringBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter></defs>
    <g class="soft" filter="url(#ringBlur)">${[720, 792, 864, 936, 1008, 1080].map(r => `<circle r="${r}"/>`).join('')}</g>
    <g>${[720, 792, 864, 936, 1008, 1080].map(r => `<circle r="${r}"/>`).join('')}</g>
    <g class="core">${[720, 792, 864, 936, 1008, 1080].map(r => `<circle r="${r}"/>`).join('')}</g></svg>`, world)
  tl.fromTo(rings, { opacity: 0.18, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power1.out' }, 4.62)
  FT(rings, { scale: 1 }, { scale: 1.05, duration: 1.16, ease: 'none' }, 5.12)

  const logo = lineAt(world, 956, 236, 'logo')
  logo.line.innerHTML = wordmark()
  tl.fromTo(logo.inner, { opacity: 0.12, y: 118 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 4.64)

  const tag = lineAt(world, 999, 372, 'on-dark tag')
  const ws = words(tag.line, [['brings'], ['it'], ['all'], ['together.']])
  ;[4.9, 5.1, 5.23, 5.37].forEach((t0, i) => tl.fromTo(ws[i], { opacity: 0, filter: B(8), x: -10 }, { opacity: 1, filter: B(0), x: 0, duration: 0.2, ease: 'power2.out' }, t0))

  const phone = at(h('div', 'phone', `<div class="scr">${phoneScreen()}</div>`, world), 637, 450)
  tl.fromTo(phone, { y: 700 }, { y: 0, duration: 0.42, ease: 'power3.out' }, 4.7)

  const left = at(h('div', 'fcard', `<h4>How would you like<br>to start your audit?</h4>
    <div class="opts"><div class="opt"><div class="o"><svg viewBox="0 0 24 24">${ICO.upload}</svg></div><b>Upload export</b><small>QuickBooks, Xero,<br>NetSuite or Bill</small></div>
    <div class="opt"><div class="o"><svg viewBox="0 0 24 24">${ICO.sample}</svg></div><b>Sample ledger</b><small>80 payments,<br>ready to scan</small></div></div>
    <div class="row"><svg viewBox="0 0 24 24">${ICO.drop}</svg><b>Drop a CSV anywhere</b><small>Up to 50 MB · stays in your workspace</small></div>`, world), 262, 469)
  Object.assign(left.style, { width: '460px', height: '412px', padding: '26px 24px' })
  gsap.set(left, { transformPerspective: 1400, rotationY: -15, rotationZ: -1.5, transformOrigin: '100% 50%' })
  const right = at(h('div', 'fcard r', `<h4>Recover payment</h4>
    <div class="opts"><div class="opt"><div class="o"><svg viewBox="0 0 24 24">${ICO.letter}</svg></div><b>Vendor letter</b></div>
    <div class="opt"><div class="o"><svg viewBox="0 0 24 24">${ICO.credit}</svg></div><b>Credit memo</b></div>
    <div class="opt"><div class="o"><svg viewBox="0 0 24 24">${ICO.refund}</svg></div><b>Refund</b></div></div>`, world), 1069, 531)
  Object.assign(right.style, { width: '619px', height: '228px', padding: '22px 30px' })
  gsap.set(right, { transformPerspective: 1600, rotationY: 8, transformOrigin: '0% 50%' })
  tl.fromTo(right, { x: -230, y: 190, opacity: 0, filter: B(9) }, { x: 0, y: 0, opacity: 1, filter: B(0), duration: 0.34, ease: 'power3.out' }, 4.8)
  tl.fromTo(left, { x: 260, opacity: 0, filter: B(9) }, { x: 0, opacity: 1, filter: B(0), duration: 0.34, ease: 'power3.out' }, 5.04)

  // slow push, then a zoom-through into the next shot
  tl.fromTo(world, { scale: 1 }, { scale: 1.03, duration: 0.8, ease: 'none' }, 5.4)
  FT(world, { scale: 1.03 }, { scale: 1.2, duration: 0.08, ease: 'power2.in' }, 6.2)
  tl.fromTo(mb, { x: 0, y: 0 }, { x: 8, y: 12, duration: 0.08, ease: 'power2.in', immediateRender: false }, 6.2)
}

/* ============ 6 · 6.28–8.06  two folded screens of the dashboard: "In one simple experience." ============ */
const ic = (d, s) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}">${d}</svg>`
const I_HELP = '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .8-1 1.5v.6M12 16.8v.2"/>'
const I_BELL = '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
const I_USER = '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6"/>'
const I_TREND = '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'
const I_FIND = '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>'
const markSvg = s => WHEEL_SVG.replace('<svg ', `<svg width="${s}" height="${Math.round(s * 23 / 26)}" `)
const PANEL_NEAR = `
  <div class="brand" style="position:absolute;left:38px;top:36px;font-size:36px">${markSvg(42)}Reclaim</div>
  <div class="tabs" style="position:absolute;left:38px;top:150px;font-size:27px"><span class="on">Overview</span><span>Findings</span><span>Recoveries</span></div>
  <div class="sep" style="position:absolute;left:38px;right:0;top:210px"></div>
  <div class="k" style="position:absolute;left:38px;top:292px;font-size:28px"><small>Ready to claim <i>i</i></small><b style="font-size:44px">$31,420.00</b></div>
  <div class="k" style="position:absolute;left:640px;top:292px;font-size:25px"><small>Recovered <i>i</i></small><b style="font-size:40px">$12,960.00</b></div>
  <div class="note" style="position:absolute;left:38px;top:448px;width:530px;padding:26px 24px;font-size:25px;line-height:1.45"><span class="em" style="width:54px;height:54px">${ic('<circle cx="11" cy="11" r="6" fill="none" stroke="#b7791f" stroke-width="2.2"/><path d="M15.5 15.5L20 20" stroke="#b7791f" stroke-width="2.2" stroke-linecap="round"/>', 30)}</span><span>3 findings need your review before outreach.</span><span class="x">×</span></div>
  <div class="sep" style="position:absolute;left:38px;width:530px;top:622px"></div>
  <div class="vrow" style="position:absolute;left:38px;top:650px;width:530px;font-size:26px"><span class="v"><span class="av" style="width:46px;height:46px;font-size:21px">A</span>Acme Industrial Supply</span><span class="amt">$8,420.00</span></div>
  <div class="vrow" style="position:absolute;left:38px;top:730px;width:530px;font-size:26px"><span class="v"><span class="av" style="width:46px;height:46px;font-size:21px;background:#f0a23a">G</span>Golden Bean Exports</span><span class="amt">$800.00</span></div>
  <div class="vrow" style="position:absolute;left:38px;top:810px;width:530px;font-size:26px"><span class="v"><span class="av" style="width:46px;height:46px;font-size:21px;background:#5a8dee">S</span>Sierra Coffee Supply</span><span class="amt">$6,800.00</span></div>
  <div class="trend" style="position:absolute;left:640px;top:560px;padding:18px 24px;font-size:23px">${ic(I_TREND, 28)}View recoveries over time</div>`
const PANEL_FAR = `
  <div class="brand" style="position:absolute;left:34px;top:40px;font-size:24px">${markSvg(28)}Reclaim</div>
  <div class="tabs" style="position:absolute;left:34px;top:112px;font-size:17px;gap:30px"><span class="on">Overview</span><span>Findings</span><span>Recoveries</span></div>
  <div class="icons" style="position:absolute;right:44px;top:34px">${ic(I_HELP, 34)}${ic(I_BELL, 34)}${ic(I_USER, 34)}</div>
  <div class="k" style="position:absolute;left:34px;top:196px;font-size:19px"><small>Ready to claim <i>i</i></small><b style="font-size:28px">$31,420.00</b></div>
  <div class="note" style="position:absolute;left:34px;top:300px;width:330px;padding:14px;font-size:16px;line-height:1.4"><span class="em" style="width:32px;height:32px">${ic('<circle cx="11" cy="11" r="6" fill="none" stroke="#b7791f" stroke-width="2.4"/><path d="M15.5 15.5L20 20" stroke="#b7791f" stroke-width="2.4" stroke-linecap="round"/>', 18)}</span><span>3 findings need your review before outreach.</span><span class="x">×</span></div>
  <div class="vrow" style="position:absolute;left:34px;top:408px;width:330px;font-size:17px"><span class="v"><span class="av" style="width:30px;height:30px;font-size:14px">A</span>Acme Industrial Supply</span><span class="amt">$8,420.00</span></div>
  <div style="position:absolute;left:34px;top:470px;width:330px;display:grid;gap:16px;font-size:16px">
    <div class="li h"><span>Pipeline</span><span class="muted">cases</span></div>
    <div class="li"><span>To decide</span><span>14</span></div><div class="li"><span>Confirmed</span><span>6</span></div>
    <div class="li"><span>Requested</span><span>5</span></div><div class="li"><span>Recovered</span><span>3</span></div>
  </div>
  <div class="k" style="position:absolute;left:450px;top:196px;font-size:21px"><small>Recovered <i>i</i></small><b style="font-size:31px">$12,960.00</b></div>
  <div class="sel" style="position:absolute;right:48px;top:196px;padding:10px 16px;font-size:18px">Past year <span class="muted">⌄</span></div>
  <div class="trend" style="position:absolute;left:740px;top:370px;padding:12px 18px;font-size:18px">${ic(I_TREND, 22)}View recoveries over time</div>
  <div style="position:absolute;left:450px;top:560px;font-size:26px;font-weight:600;color:#151a20">Findings</div>
  <div style="position:absolute;right:48px;top:554px;display:flex;gap:14px;font-size:16px"><span class="sel" style="padding:9px 14px">Export</span><span class="sel" style="padding:9px 14px">All findings <span class="muted">⌄</span></span><span class="sel" style="padding:9px 14px">All time <span class="muted">⌄</span></span></div>
  <div class="sep" style="position:absolute;left:450px;right:48px;top:624px"></div>
  <div style="position:absolute;left:450px;right:48px;top:650px;display:grid;gap:24px;font-size:17px;color:#3a434d">
    <div class="li"><span>INV-28491 · Acme Industrial Supply · paid twice</span><span>$8,420.00</span></div>
    <div class="li"><span>INV-9016 · Golden Bean Exports · paid over invoice</span><span>$800.00</span></div>
    <div class="li"><span>INV-3305 · Sierra Coffee Supply · paid twice</span><span>$6,800.00</span></div>
  </div>`
function shot6() {
  const sc = scene(6.28, 8.06, 's6')
  const rig = fullLayer(sc, 'rig')
  const mb = mblur(rig)
  const far = at(h('div', 'panel', PANEL_FAR, rig), -368, 431)
  Object.assign(far.style, { width: '1300px', height: '1000px' })
  gsap.set(far, { transformPerspective: 1900, rotationY: -20, transformOrigin: '100% 50%' })
  const near = at(h('div', 'panel', PANEL_NEAR, rig), 960, 343)
  Object.assign(near.style, { width: '1150px', height: '1100px' })
  gsap.set(near, { transformPerspective: 1900, rotationY: 22, transformOrigin: '0% 50%' })

  tl.fromTo(rig, { y: -112 }, { y: 0, duration: 0.2, ease: 'power2.out' }, 6.28)
  FT(rig, { y: 0 }, { y: -22, duration: 1.36, ease: 'none' }, 6.48)
  tl.fromTo(mb, { x: 1, y: 14 }, { x: 0, y: 0, duration: 0.16, ease: 'power1.out' }, 6.28)

  const tLayer = fullLayer(sc)
  const tb = mblur(tLayer)
  const t = lineAt(tLayer, 972, 258, 'on-dark title')
  const ws = words(t.line, [['In'], ['one'], ['simple', 'hi-dark'], ['experience.', 'hi-dark']])
  ;[6.4, 6.57, 6.73, 6.9].forEach((t0, i) => tl.fromTo(ws[i], { opacity: 0, filter: B(8), x: -8 }, { opacity: 1, filter: B(0), x: 0, duration: 0.18, ease: 'power2.out' }, t0))
  tl.fromTo(t.inner, { y: 8 }, { y: -26, duration: 1.44, ease: 'none' }, 6.4)

  // whip up into the light
  FT(t.inner, { y: -26 }, { y: -340, duration: 0.11, ease: 'power1.in' }, 7.82)
  FT(tb, { x: 0, y: 0 }, { x: 1, y: 18, duration: 0.08, ease: 'none' }, 7.82)
  FT(rig, { y: -22 }, { y: -420, duration: 0.24, ease: 'power1.in' }, 7.82)
  FT(mb, { x: 0, y: 0 }, { x: 2, y: 28, duration: 0.1, ease: 'none' }, 7.82)
  const flash = h('div', 'abs', null, sc)
  Object.assign(flash.style, { inset: '0', width: '1920px', height: '1080px', background: '#eef6f2' })
  tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: 'power1.in' }, 7.92)
}
/* ============ 7/8 · 8.06–10.08  "Designed for AP teams" → a whip pan → "of every size." ============ */
const AUDIENCES = [
  ['Accounting firms', 'Run a recovery audit for every client from one AP export, and hand back findings they can act on.', 'See how it works', ['QuickBooks', 'Xero']],
  ['AP teams', 'Catch duplicate invoices and changed bank details before the next payment run goes out.', 'See the checks', ['NetSuite', 'Bill']],
  ['Controllers', 'Every finding is tied to the invoice numbers, dates and amounts your auditors will ask for.', 'See the evidence', ['Xero']],
  ['Multi-entity groups', 'One vendor, five spellings, three entities. Reclaim resolves them before it checks.', 'See vendor matching', ['NetSuite']],
  ['Retail and wholesale', 'High-volume vendor spend is where paid-twice invoices hide. Find them in one upload.', 'See pricing', ['QuickBooks']],
]
// world position (top-left) and scale of each card, nearer cards larger
const CARD_AT = [[493, 15, 1], [761, 60, 1.133], [945, 120, 1.316], [1142, 332, 1.316], [1071, 585, 1.64]]
function shot7() {
  const sc = scene(8.06, 10.08, 's7')
  const world = fullLayer(sc, 'world')
  const mb = mblur(world)

  // a band of a huge circle, drawn on clockwise from off the top-left
  const cx = -240, cy = 1545, r = 1398, a0 = -97, a1 = -8
  const pt = a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1)
  const len = r * (a1 - a0) * Math.PI / 180
  const arc = h('div', null, `<svg class="arc" viewBox="0 0 1920 1080" aria-hidden="true"><path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke-dasharray="${len.toFixed(0)}" /></svg>`, world).firstElementChild.firstElementChild
  tl.fromTo(arc, { attr: { 'stroke-dashoffset': len * 0.93 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.36, ease: 'power2.inOut' }, 8.08)

  const block = h('div', 'block', null, world)
  block.style.width = '2706px'

  const t = at(h('div', 'abs line on-light title', null, world), 150, 558)
  const l1 = h('div', null, null, t)
  const l2 = h('div', 'hi-light', null, t)
  l2.style.fontWeight = '650'
  const [dz, fr] = words(l1, [['Designed'], ['for']])
  const ap = h('span', 'wd', 'AP teams', l2)
  tl.fromTo(dz, { opacity: 0, filter: B(9), x: -30 }, { opacity: 1, filter: B(0), x: 0, duration: 0.24, ease: 'power2.out' }, 8.06)
  tl.fromTo(fr, { opacity: 0, filter: B(8), x: -10 }, { opacity: 1, filter: B(0), x: 0, duration: 0.18, ease: 'power2.out' }, 8.26)
  tl.fromTo(ap, { opacity: 0, filter: B(10), y: 18 }, { opacity: 1, filter: B(0), y: 0, duration: 0.2, ease: 'power2.out' }, 8.39)

  AUDIENCES.forEach(([title, body, more, logos], i) => {
    const c = h('div', 'acard', `<h5>${title}</h5><p>${body}</p><span class="more">${more} ›</span><div class="logos">${logos.map(l => `<span>${l}</span>`).join('')}</div>`, world)
    const [x, y, s] = CARD_AT[i]
    gsap.set(c, { x, y, scale: s })
    tl.fromTo(c, { opacity: 0, filter: B(10), x: x - 70, y: y - 90 }, { opacity: 1, filter: B(0), x, y, duration: 0.3, ease: 'power3.out' }, 8.14 + i * 0.065)
  })

  // drift, then a whip pan right; the frame lands on the cards with a green field behind them
  tl.fromTo(world, { x: 0, y: 0 }, { x: -14, y: -10, duration: 0.55, ease: 'none' }, 8.47)
  FT(world, { x: -14, y: -10 }, { x: -812, y: 100, duration: 0.2, ease: 'power2.inOut' }, 9.02)
  FT(world, { x: -812, y: 100 }, { x: -846, y: 106, duration: 0.86, ease: 'none' }, 9.22)
  tl.fromTo(mb, { x: 0, y: 0 }, { x: 22, y: 1.5, duration: 0.1, ease: 'power1.in', immediateRender: false }, 9.02)
  FT(mb, { x: 22, y: 1.5 }, { x: 0, y: 0, duration: 0.12, ease: 'power1.out' }, 9.12)
  tl.fromTo(block, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: 'none' }, 9.07)

  const ghosts = fullLayer(sc)
  ;[[1090, 575, 830, 46], [1120, 665, 780, 40], [1150, 745, 760, 40], [1590, 860, 330, 30], [1180, 930, 520, 30]].forEach(([x, y, w, hh]) => {
    const gh = at(h('div', 'ghost', null, ghosts), x, y)
    Object.assign(gh.style, { width: w + 'px', height: hh + 'px' })
  })
  tl.fromTo(ghosts, { opacity: 0, x: 300 }, { opacity: 1, x: 0, duration: 0.18, ease: 'power2.out' }, 9.08)

  const t2 = at(h('div', 'abs line on-light title2', null, sc), 1172, 277)
  const m1 = h('div', null, null, t2)
  const [of, every] = words(m1, [['of'], ['every']])
  const size = h('span', 'wd', 'size.', h('div', null, null, t2))
  ;[[of, 9.22], [every, 9.32], [size, 9.43]].forEach(([w, t0]) => tl.fromTo(w, { opacity: 0, filter: B(9), x: -12 }, { opacity: 1, filter: B(0), x: 0, duration: 0.2, ease: 'power2.out' }, t0))
}

/* ============ 9 · 10.08–end  the check comes back green: "Reclaim / Recovery simplified." ============ */
function shot9() {
  const sc = scene(10.08, null, 's9') // the last shot holds to the end
  const cam = fullLayer(sc, 'cam')
  const mb = mblur(cam)
  gsap.set(cam, { transformOrigin: '938px 499px' })

  const sw = h('div', null, `<svg class="swoosh" viewBox="0 0 1920 1080" aria-hidden="true">
    <defs><filter id="swBlur" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="22"/></filter><filter id="swBlur2" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <path d="M-80 330 C 380 650, 760 900, 1180 905 S 1760 800, 2000 735" fill="none" stroke="rgba(0,215,115,.42)" stroke-width="120" filter="url(#swBlur)"/>
    <path d="M-80 330 C 380 650, 760 900, 1180 905 S 1760 800, 2000 735" fill="none" stroke="rgba(90,255,175,.3)" stroke-width="30" filter="url(#swBlur2)"/>
  </svg>`, cam).firstElementChild
  tl.fromTo(sw, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 10.3)

  const card = h('div', 'tapcard', '<span class="chip"></span><div class="nm">Acme Industrial Supply<small>INV-28491</small></div>', cam)
  const phone = h('div', 'handset', `<div class="scr"><span class="cam-hole"></span>
    <div class="disc"><div class="scan"><svg viewBox="0 0 24 24"><path d="M6.5 3.5h7l4 4v5"/><path d="M13.5 3.5v4h4"/><path d="M6.5 3.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h5"/><path d="M8.5 11h5M8.5 14h3"/><circle cx="16" cy="16.5" r="3"/><path d="M18.2 18.7l2.3 2.3"/></svg></div><div class="ok"><span>$</span></div></div>
    <div class="msg"><span class="m1">Checking 1,284 payments</span><span class="m2">$8,420.00 paid twice</span></div>
    <span class="x">×</span></div>`, cam)
  const ok = phone.querySelector('.ok'), dollar = ok.firstElementChild, scan = phone.querySelector('.scan')
  const m1 = phone.querySelector('.m1'), m2 = phone.querySelector('.m2')
  tl.fromTo(ok, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.12, ease: 'power2.out' }, 10.64)
  tl.fromTo(scan, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.7, duration: 0.1, ease: 'power1.in' }, 10.62)
  tl.fromTo(dollar, { scale: 0.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(1.8)' }, 10.7)
  tl.fromTo(m1, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: 'none' }, 10.66)
  tl.fromTo(m2, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: 'none' }, 10.72)

  const logo = lineAt(cam, 1340, 497, 'logo')
  logo.line.innerHTML = wordmark()
  const tag = lineAt(cam, 988, 690, 'on-dark tag', 'l')
  typeIn(chars(tag.line, 'Recovery simplified.'), 10.68, 0.038, { dur: 0.14, blur: 6 })

  // the camera pulls back fast out of the cut, then keeps easing back to the end
  tl.fromTo(cam, { scale: 1.5, x: 60 }, { scale: 1.12, x: 0, duration: 0.28, ease: 'power3.out' }, 10.08)
  FT(cam, { scale: 1.12 }, { scale: 1, duration: 2.25, ease: 'power1.out' }, 10.36)
  tl.fromTo(mb, { x: 16, y: 2 }, { x: 0, y: 0, duration: 0.22, ease: 'power1.out' }, 10.08)
}

/* ============ player ============ */
function mountPlayer() {
  const bigPlay = document.getElementById('bigPlay'), ppBtn = document.getElementById('ppBtn')
  const scrub = document.getElementById('scrub'), fill = document.getElementById('scrubFill'), knob = document.getElementById('scrubKnob')
  const time = document.getElementById('time'), screen = document.getElementById('screen')
  const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }
  let running = false, idleTimer = 0

  const sync = () => {
    const t = tl.time(), p = t / DUR
    fill.style.width = (p * 100) + '%'; knob.style.left = (p * 100) + '%'
    time.textContent = fmt(DUR - t)
    scrub.setAttribute('aria-valuenow', t.toFixed(1)); scrub.setAttribute('aria-valuetext', `${t.toFixed(1)} of 13 seconds`)
  }
  const setState = st => {
    player.classList.toggle('is-playing', st === 'playing')
    player.classList.toggle('is-paused', st === 'paused')
    player.classList.toggle('is-ended', st === 'ended')
    ppBtn.setAttribute('aria-label', st === 'playing' ? 'Pause' : 'Play')
    bigPlay.setAttribute('aria-label', st === 'ended' ? 'Replay film' : 'Play film')
  }
  const wake = () => {
    player.classList.remove('is-idle'); clearTimeout(idleTimer)
    if (running) idleTimer = setTimeout(() => player.classList.add('is-idle'), 1600)
  }
  tl.eventCallback('onUpdate', sync)
  tl.eventCallback('onComplete', () => { running = false; setState('ended'); sync(); wake() })

  const play = () => { if (tl.progress() >= 1) tl.seek(0); running = true; tl.play(); setState('playing'); wake() }
  const pause = () => { running = false; tl.pause(); setState('paused'); wake() }
  const toggle = () => (running ? pause() : play())
  const seek = t => { tl.seek(Math.min(DUR, Math.max(0, t)), false); if (!running) setState(tl.progress() >= 1 ? 'ended' : 'paused'); sync(); paintBlurs() }

  bigPlay.addEventListener('click', e => { e.stopPropagation(); play() })
  screen.addEventListener('click', toggle)
  ppBtn.addEventListener('click', e => { e.stopPropagation(); toggle() })
  player.querySelector('.cta').addEventListener('click', e => e.stopPropagation())
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause() })
  player.addEventListener('pointermove', wake)

  const atX = e => { const r = scrub.getBoundingClientRect(); return (e.clientX - r.left) / r.width * DUR }
  scrub.addEventListener('pointerdown', e => {
    e.stopPropagation()
    const was = running; pause(); scrub.classList.add('is-drag'); scrub.setPointerCapture(e.pointerId); seek(atX(e))
    const move = ev => seek(atX(ev))
    const up = () => { scrub.classList.remove('is-drag'); scrub.removeEventListener('pointermove', move); scrub.removeEventListener('pointerup', up); scrub.removeEventListener('pointercancel', up); if (was && tl.progress() < 1) play() }
    scrub.addEventListener('pointermove', move); scrub.addEventListener('pointerup', up); scrub.addEventListener('pointercancel', up)
  })
  scrub.addEventListener('click', e => e.stopPropagation())
  player.addEventListener('keydown', e => {
    const k = e.key
    if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); toggle() }
    else if (k === 'ArrowRight' || k === 'l') { e.preventDefault(); pause(); seek(tl.time() + (e.shiftKey ? 1 / 30 : 1)) }
    else if (k === 'ArrowLeft' || k === 'j') { e.preventDefault(); pause(); seek(tl.time() - (e.shiftKey ? 1 / 30 : 1)) }
    else if (k === 'Home') { e.preventDefault(); seek(0) }
    else if (k === 'End') { e.preventDefault(); seek(DUR) }
    else return
    wake()
  })
  sync()

  // ?t=4.2 opens paused on that moment (QA); reduced motion opens on the last frame
  const q = new URLSearchParams(location.search)
  const qt = q.has('t') ? parseFloat(q.get('t')) : null
  if (qt != null && !Number.isNaN(qt)) { player.classList.add('qa'); seek(qt) }
  else if (matchMedia('(prefers-reduced-motion: reduce)').matches) seek(DUR)
  else if (document.hidden) document.addEventListener('visibilitychange', function once() { if (!document.hidden) { document.removeEventListener('visibilitychange', once); if (!/is-(paused|ended|playing)/.test(player.className)) play() } })
  else play()
  window.__together = { tl, DUR, seek, play, pause }
}

function fit() {
  document.documentElement.style.setProperty('--k', (player.clientWidth / 1920).toFixed(5))
}

async function boot() {
  fit()
  new ResizeObserver(fit).observe(player)
  const fonts = Promise.all(['400 100px Inter', '500 100px Inter', '600 100px Inter', '700 100px Inter'].map(f => document.fonts.load(f))).catch(() => {})
  const land = fetch('/film/land-110m.json').then(r => r.json()).then(topo => { if (window.topojson) LAND = window.topojson.feature(topo, topo.objects.land) }).catch(() => {})
  await Promise.race([Promise.all([fonts, land]), new Promise(r => setTimeout(r, 4000))])
  ;[shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot9].forEach(f => f())
  tl.set({}, {}, DUR)
  tl.seek(0.001).seek(0)
  gsap.ticker.add(paintBlurs)
  player.classList.remove('is-loading')
  mountPlayer()
}
if (gsap) boot()

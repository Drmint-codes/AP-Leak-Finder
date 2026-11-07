/* Reclaim launch film — a shot-for-shot rebuild of a 10-second launch video, recut for Reclaim.
   One paused GSAP timeline drives every layer, so the player can play, pause and scrub any frame.
   Times are the reference video's own clock, in seconds. */
const gsap = window.gsap

const DUR = 9.92
const player = document.getElementById('player')
const stage = document.getElementById('stage')
const tl = gsap.timeline({ paused: true })

const h = (tag, cls, html, parent) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  if (parent) parent.appendChild(e)
  return e
}
const B = n => `blur(${n}px)`
// fromTo whose start values wait for the playhead (for a property that is animated more than once)
const FT = (t, from, to, at) => tl.fromTo(t, from, { ...to, immediateRender: false }, at)

function scene(tIn, tOut, cls) {
  const el = h('div', 'scene ' + cls, null, stage)
  tl.set(el, { visibility: 'visible' }, tIn)
  if (tOut != null) tl.set(el, { visibility: 'hidden' }, tOut)
  return el
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

/* 3D marks are plain state objects the timeline tweens; the renderer reads them every frame.
   x/y stage px (centre), s = width in px, spin = degrees per second about the (tilted) vertical axis. */
const MARKS = []
const mark = o => { const m = { x: 960, y: 540, s: 100, rx: 12, rz: 0, ry0: 0, spin: 360, o: 0, glow: 1, lum: 1, blur: 0, ...o }; MARKS.push(m); return m }
const hero = mark({ ry0: 30 })
const flyR = mark({ ry0: 70, spin: 300, rx: 18 })
const flyL = mark({ ry0: 10, spin: -320, rx: -14 })

/* ============ 1 · 0.00–1.87  "Paid twice. Nobody noticed."  over the systems Reclaim reads ============ */
const SOURCES = {
  qbo: ['QuickBooks Online', '<span style="background:#2ca01c;border-radius:50%;color:#fff;font-size:30px">qb</span>'],
  xero: ['Xero', '<span style="background:#13b5ea;border-radius:50%;color:#fff;font-size:40px;padding-bottom:6px">x</span>'],
  ns: ['NetSuite', '<span style="background:#1c3a5c;color:#fff">N</span>'],
  bill: ['Bill.com', '<span style="background:#f26b3a;border-radius:50%;color:#fff;font-size:38px">b</span>'],
  xls: ['Excel', '<span style="background:#1d6f42"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><rect x="6" y="6" width="12" height="12" rx="1"/><path d="M6 10h12M6 14h12M10.5 6v12"/></svg></span>'],
  csv: ['CSV export', '<span style="background:#20302a"><svg viewBox="0 0 24 24" fill="none" stroke="#7ff5b3" stroke-width="1.6" stroke-linejoin="round"><path d="M8 5h6l3.5 3.5V19H8z"/><path d="M14 5v3.5h3.5M10 12.5h5M10 15.5h5"/></svg></span>'],
}
function pill(key, parent) {
  const [name, mk] = SOURCES[key]
  const p = h('div', 'pill', null, parent)
  const m = h('span', 'mk', mk, p)
  const inner = m.firstElementChild
  Object.assign(inner.style, { width: '100%', height: '100%', display: 'grid', placeItems: 'center', borderRadius: inner.style.borderRadius || '18px' })
  h('span', null, name, p)
  return p
}
function shot1() {
  const sc = scene(0, 1.87, 's1')
  const glow = h('div', 'glow', null, sc)
  tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.2)

  // the camera pulls back the whole time, linearly (1.31× → 0.79×). Eases below were fitted to the reference;
  // note GSAP's power1 is quadratic and power2 cubic
  const world = h('div', 'world', null, sc)
  tl.fromTo(world, { scale: 1.312 }, { scale: 0.79, duration: 1.67, ease: 'none' }, 0.2)

  // two rows of source pills flung in opposite directions; motion blur falls with their speed
  const top = h('div', 'row top', null, world)
  const bot = h('div', 'row bot', null, world)
  ;['ns', 'qbo', 'xero', 'xls', 'bill', 'csv', 'ns', 'qbo', 'xero'].forEach(k => pill(k, top))
  ;['bill', 'csv', 'xls', 'qbo', 'xero', 'ns', 'csv', 'bill', 'xls'].forEach(k => pill(k, bot))
  gsap.set([top, bot], { xPercent: -50, yPercent: -50, x: 0, y: 0 })
  tl.fromTo(top, { x: 770 }, { x: -770, duration: 1.52, ease: 'power1.out' }, 0.35)
  tl.fromTo(bot, { x: -770 }, { x: 770, duration: 1.52, ease: 'power1.out' }, 0.35)
  tl.fromTo([top, bot], { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0.38)
  tl.fromTo(top, { filter: B(11) }, { filter: B(2.4), duration: 1.52, ease: 'none' }, 0.35) // top row also sits out of focus
  tl.fromTo(bot, { filter: B(11) }, { filter: B(0), duration: 1.3, ease: 'none' }, 0.35)

  // the line is laid out in place; each word resolves out of a blur, 0.22 s apart
  const line = h('div', 'line', null, world)
  ;[['Paid', 'w1', 0.22], ['twice.', 'w2', 0.46], ['Nobody', 'w3', 0.68], ['noticed.', 'w4', 0.9]].forEach(([t, c, at]) => {
    const w = h('span', 'w ' + c, t, line)
    tl.fromTo(w, { opacity: 0, filter: B(22), x: 26 }, { opacity: 1, filter: B(0), x: 0, duration: 0.34, ease: 'power2.out' }, at)
  })
}

/* ============ 2 · 1.87–2.90  the promise, on white ============ */
function shot2() {
  const sc = scene(1.87, 2.9, 's2')
  const haze = h('div', 'haze', null, sc)
  const glass = h('div', 'glass', 'No sampling', sc)
  tl.fromTo(haze, { scaleY: 0.86, scaleX: 1.04, opacity: 0.82 }, { scaleY: 1.14, scaleX: 1, opacity: 1, duration: 1.03, ease: 'sine.inOut' }, 1.87)
  tl.fromTo(glass, { x: 0, scale: 1 }, { x: 48, scale: 1.012, duration: 1.03, ease: 'none' }, 1.87)
}

/* ============ 3 · 2.90–4.49  the mark flies in and sits inside "Introducing ◆ Reclaim Audit" ============ */
function shot3() {
  const sc = scene(2.9, 4.49, 's3')
  const lk = h('div', 'lockup', null, sc)
  const ln = h('div', 'ln', null, lk)
  const intro = h('span', 'w t-intro', 'Introducing', ln)
  const slot = h('span', 'slot', null, ln)
  const name = h('span', 'w t-name', 'Reclaim', ln)
  const sub = h('span', 'w t-sub', 'Audit', ln)
  ln.style.left = (872 - ln.offsetWidth / 2) + 'px'
  const slotX = ln.offsetLeft + slot.offsetLeft + slot.offsetWidth / 2

  // visibility of a mark is only ever set (never tweened), so scrubbing backwards hides it again
  tl.set(hero, { o: 1 }, 2.9)
  FT(hero, { x: 150, y: 495, s: 900, blur: 16, glow: 2.6, lum: 3.2 }, { x: slotX, y: 432, s: 112, blur: 0, glow: 1, lum: 1, duration: 0.58, ease: 'power2.out' }, 2.9)
  tl.fromTo(intro, { opacity: 0, filter: B(10) }, { opacity: 1, filter: B(0), duration: 0.28, ease: 'power2.out' }, 3.28)
  tl.fromTo(name, { opacity: 0, filter: B(12), x: 40 }, { opacity: 1, filter: B(0), x: 0, duration: 0.32, ease: 'power2.out' }, 3.46)
  tl.fromTo(sub, { opacity: 0, filter: B(8), y: 22 }, { opacity: 1, filter: B(0), y: 0, duration: 0.3, ease: 'power2.out' }, 3.64)
}

/* ============ 4 · 4.49–5.43  the mark becomes a cursor and writes "Zero integrations required" ============ */
function shot4() {
  const sc = scene(4.49, 5.43, 's4')
  const lk = h('div', 'lockup', null, sc)
  const ln = h('div', 'ln', null, lk)
  ln.style.left = '550px'
  const words = [['Zero', 'z1', 4.57], ['integrations', 'z2', 4.76], ['required', 'z3', 4.97]].map(([t, c, at]) => {
    const w = h('span', 'w ' + c, t, ln)
    tl.fromTo(w, { opacity: 0, filter: B(8), x: -14 }, { opacity: 1, filter: B(0), x: 0, duration: 0.3, ease: 'power2.out' }, at)
    return w
  })
  const right = 550 + ln.offsetWidth
  FT(hero, { x: 700, y: 400, s: 165, glow: 1.9, lum: 2 }, { x: right + 92, y: 434, s: 165, glow: 1.1, lum: 1.2, duration: 0.8, ease: 'power2.out' }, 4.49)
  tl.set(hero, { o: 0 }, 5.43)
  return words
}

/* ============ 5 · 5.43–7.36  what it finds, in orbit: "Find money / you already paid" ============ */
const ICON = {
  files: '<path d="M8.5 3h6.5l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 18V4.5A1.5 1.5 0 0 1 8.5 3z"/><path d="M15 3v4h4"/><path d="M4 7v13a1.5 1.5 0 0 0 1.5 1.5H15"/><path d="M10 11.5h5.5M10 14.5h5.5"/>',
  card: '<rect x="3.5" y="2.5" width="11.5" height="17.5" rx="1.6"/><path d="M7 5.5v4M10 5.5v2.5"/><path d="M17.5 11l4 1.6v2.9c0 2.5-1.7 4.2-4 5.1-2.3-.9-4-2.6-4-5.1v-2.9z"/><path d="M16 16l1.2 1.2 2.1-2.3"/>',
  shield: '<path d="M12 2.8l7.5 2.8v6c0 4.6-3.2 8-7.5 9.6-4.3-1.6-7.5-5-7.5-9.6v-6z"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8"/>',
  bank: '<path d="M3 9.5L12 4l9 5.5"/><path d="M4.5 9.5h15"/><path d="M6.5 10v7M10.2 10v7M13.8 10v7M17.5 10v7"/><path d="M3.5 19.5h17"/><circle cx="20" cy="4.5" r="3"/><path d="M20 3.2v1.6M20 6.1v.1"/>',
  tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.7 6.7a1.4 1.4 0 0 1-2 0z"/><circle cx="8" cy="8" r="1.3"/><path d="M11 16.5l4.5-4.5"/><circle cx="11.3" cy="12.4" r=".8"/><circle cx="15.2" cy="16.2" r=".8"/>',
  receipt: '<path d="M5.5 2.8h13v18.4l-2.2-1.4-2.1 1.4-2.2-1.4-2.2 1.4-2.1-1.4-2.2 1.4z"/><path d="M14.3 8.3c-.4-.8-1.3-1.2-2.3-1.2-1.3 0-2.3.7-2.3 1.7 0 2.3 4.7 1.2 4.7 3.6 0 1-1 1.8-2.4 1.8-1.1 0-2-.5-2.4-1.3M12 6v1.1M12 14.2v1.2"/>',
  search: '<path d="M13.5 20.5H6A1.5 1.5 0 0 1 4.5 19V4.5A1.5 1.5 0 0 1 6 3h7l4.5 4.5v3"/><path d="M13 3v4.5h4.5"/><circle cx="16" cy="15.5" r="3"/><path d="M18.2 17.7l2.3 2.3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M9 14.5l2 2 4-4"/>',
}
// [icon, angle° (clockwise from +x), radius, size, depth blur, opacity]
const ORBIT = [
  ['files', -40, 390, 150, 0, 1], ['card', 150, 400, 200, 0, 1], ['shield', 112, 650, 220, 1.2, 0.95],
  ['bank', -14, 760, 230, 2.6, 0.9], ['tag', 214, 680, 200, 1.6, 0.9], ['receipt', 60, 520, 120, 0.6, 0.92],
  ['search', 282, 700, 170, 2, 0.85], ['calendar', 330, 590, 130, 1, 0.85], ['files', 94, 230, 50, 0, 0.5],
]
const arc = (r, a0, a1) => {
  const p = a => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)]
  const [x0, y0] = p(a0), [x1, y1] = p(a1)
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`
}
function shot5() {
  const sc = scene(5.43, 7.36, 's5')
  const tint = h('div', 'tint', null, sc)
  const vx = h('div', 'vx', null, sc)
  const spin = h('div', 'spin', null, vx)
  h('div', null, `<svg class="rings" viewBox="-1000 -1000 2000 2000" fill="none" stroke-linecap="round">
    <defs><linearGradient id="ringA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9e6dc" stop-opacity=".95"/><stop offset=".6" stop-color="#6fb9aa" stop-opacity=".65"/><stop offset="1" stop-color="#3c7d70" stop-opacity=".3"/></linearGradient>
    <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle r="180" stroke="rgba(160,220,205,.06)" stroke-width="2"/>
    <g filter="url(#ringGlow)" stroke="url(#ringA)" stroke-width="5"><path d="${arc(440, 196, 286)}"/><path d="${arc(410, 16, 106)}"/></g>
    <path d="${arc(560, 118, 250)}" stroke="rgba(150,210,195,.22)" stroke-width="2.2"/>
    <path d="${arc(560, -40, 20)}" stroke="rgba(150,210,195,.14)" stroke-width="2"/>
    <path d="${arc(900, 150, 212)}" stroke="rgba(170,225,210,.38)" stroke-width="3.5" filter="url(#ringGlow)"/>
  </svg>`, spin)

  const discs = ORBIT.map(([k, a, r, size, blur, op], i) => {
    const ico = h('div', 'ico', null, spin)
    ico.style.left = (r * Math.cos(a * Math.PI / 180)).toFixed(1) + 'px'
    ico.style.top = (r * Math.sin(a * Math.PI / 180)).toFixed(1) + 'px'
    const d = h('div', 'disc', `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`, ico)
    Object.assign(d.style, { width: size + 'px', height: size + 'px', filter: blur ? B(blur) : '', opacity: op })
    const wob = ((i * 37) % 50) - 25
    tl.fromTo(d, { rotation: 40 + wob }, { rotation: -170 + wob * 0.4, duration: 1.85, ease: 'none' }, 5.5) // stay near upright while the ring turns
    return d
  })

  // black dip, then the vortex dollies in from the left and turns clockwise
  tl.fromTo(vx, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 5.58)
  tl.fromTo(vx, { x: -240, y: 30, scale: 0.55 }, { x: 0, y: 0, scale: 1, duration: 0.75, ease: 'power2.out' }, 5.55)
  FT(vx, { scale: 1 }, { scale: 1.32, duration: 1.05, ease: 'power1.in' }, 6.3)
  tl.fromTo(spin, { rotation: -40 }, { rotation: 170, duration: 1.85, ease: 'none' }, 5.5)
  FT(vx, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 6.95)
  tl.fromTo(tint, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.inOut' }, 6.15)

  tl.fromTo(discs.map(d => d.parentNode), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.28, ease: 'power1.in', stagger: 0.02 }, 6.5)

  const copy = h('div', 'copy', null, sc)
  const inn = h('div', 'in', null, copy)
  const l1 = h('span', 'l1', 'Find money', inn)
  const l2 = h('span', 'l2', 'you already paid', inn)
  tl.fromTo(copy, { opacity: 0, filter: B(5) }, { opacity: 1, filter: B(0), duration: 0.4, ease: 'power1.out' }, 5.8)
  tl.fromTo(copy, { scale: 1 }, { scale: 2.1, duration: 1.3, ease: 'power2.in' }, 6.0)
  tl.fromTo(l2, { opacity: 1, x: 0, y: 0, filter: B(0) }, { opacity: 0, x: 70, y: 26, filter: B(6), duration: 0.16, ease: 'power1.in' }, 7.06)
  tl.fromTo(l1, { opacity: 1 }, { opacity: 0.4, duration: 0.14, ease: 'none' }, 7.06)
  FT(copy, { opacity: 1 }, { opacity: 0, duration: 0.13, ease: 'none' }, 7.2)
  return discs
}

/* ============ 6 · 7.43–end  the product: logo, title and a recovered payment ============ */
function shot6() {
  const sc = scene(7.43, null, 's6') // the last shot holds to the end
  const beam = h('div', 'beam', null, sc)
  ;[7.43, 7.6, 7.78].forEach(at => {
    const r = h('div', 'ripple', null, sc)
    tl.fromTo(r, { scale: 0.12, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 1.05, ease: 'power1.out' }, at)
  })
  h('div', 'dot', null, sc)
  tl.fromTo(beam, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 7.8)

  // the tilted frame carries the perspective; the UI on it stays flat, as it does in the reference
  const card = h('div', 'card-wrap', `<div class="card"><div class="sub"></div></div>
    <div class="ui">
      <div class="check"><svg viewBox="0 0 24 24"><path d="M5.5 12.6l4.3 4.3L18.6 8" fill="none" stroke="#0a1a14" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="msg">${WHEEL_SVG}Duplicate payment recovered</div>
      <div class="amt">$8,420.00</div>
      <div class="av"><svg viewBox="0 0 24 24"><path d="M4 20.5V8.5l5 3v-3l5 3v-3l6 3.6v8.4z"/><path d="M4 20.5h16"/><path d="M8 16.5h1.5M12 16.5h1.5M16 16.5h1.5"/></svg></div>
      <div class="vn">Acme Industrial Supply<span>INV-28491 · paid twice</span></div>
    </div>`, sc)
  const head = h('div', 'head', `<div class="in"><span class="logo">${WHEEL_SVG}Reclaim</span><span class="title"><span class="a">Reclaim</span> <span class="b">Audit</span></span></div>`, sc)

  // the camera pulls back from the title (2.35×) while the card rises into frame
  tl.fromTo(head, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 7.76)
  tl.fromTo(head, { y: -420, scale: 2.35 }, { y: 0, scale: 1, duration: 2.14, ease: 'power2.out' }, 7.76)
  tl.fromTo(card, { y: 720 }, { y: 0, duration: 1.85, ease: 'expo.out' }, 8.05)
  tl.fromTo(card, { scale: 2.6 }, { scale: 1, duration: 2.14, ease: 'power2.out' }, 7.76)
  tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.01 }, 8.05)

  // two chrome marks fly in and keep turning
  tl.set(flyR, { o: 1 }, 8.72)
  tl.set(flyL, { o: 1 }, 8.76)
  FT(flyR, { x: 2160, y: 700, s: 300, rz: -64 }, { x: 1725, y: 555, s: 300, rz: -32, duration: 1.15, ease: 'expo.out' }, 8.72)
  FT(flyL, { x: -200, y: 1230, s: 220, rz: 62 }, { x: 278, y: 900, s: 220, rz: 24, duration: 1.15, ease: 'expo.out' }, 8.76)
}

/* ============ the chrome mark — three.js, with a flat SVG fallback ============ */
let paint = () => {}
// each mark's halo is a screen-blended gradient under the canvas, so it lightens whatever is behind it
const halos = MARKS.map(() => h('div', 'halo', null, stage))
function paintHalos() {
  MARKS.forEach((m, i) => {
    const e = halos[i], on = m.o > 0.001
    e.style.display = on ? '' : 'none'
    if (!on) return
    e.style.transform = `translate(${m.x}px, ${m.y}px) scale(${(m.s * 2.3 / 200).toFixed(3)})`
    e.style.opacity = Math.min(1, 0.5 * m.glow) * m.o
    e.style.filter = m.blur > 0.05 ? B(m.blur) : ''
  })
}
async function initMarks() {
  try {
    const THREE = await import('three')
    const canvas = h('canvas', 'gl', null, stage)
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    const scene3 = new THREE.Scene()
    // a dark studio: black walls and a few bright strips, so the chrome reads as dark metal with hard highlights
    const studio = new THREE.Scene()
    studio.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: 0x030807, side: THREE.BackSide })))
    ;[[0, 0, 44, 70, 44, 0xa8efdc, 0.95], [0, 18, 6, 40, 4, 0xffffff, 6], [-22, 4, 10, 4, 30, 0x9ffff0, 4], [22, -6, 4, 4, 26, 0x6fe8ff, 3.5], [0, -20, -8, 36, 3, 0x2effa8, 2.5], [8, 10, -22, 14, 14, 0xd8fff4, 2]].forEach(([x, y, z, w, hgt, c, k]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }))
      m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m)
    })
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene3.environment = pmrem.fromScene(studio, 0.02).texture
    const fov = 30, dist = 540 / Math.tan(fov * Math.PI / 360)
    const cam = new THREE.PerspectiveCamera(fov, 16 / 9, 10, dist * 4)
    cam.position.set(0, 0, dist)
    const key = new THREE.DirectionalLight(0xc8f4ff, 1.4); key.position.set(-1, 1.3, 1.6)
    const rim = new THREE.DirectionalLight(0x4dffb8, 2.2); rim.position.set(1.6, -0.6, -1)
    scene3.add(key, rim, new THREE.AmbientLight(0x10302a, 0.5))

    const shapes = WHEEL.map(p => {
      const s = new THREE.Shape()
      s.moveTo(p[0], -p[1]); s.lineTo(p[2], -p[3]); s.lineTo(p[4], -p[5]); s.lineTo(p[6], -p[7]); s.closePath()
      return s
    })
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 3.6, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.55, bevelSegments: 5, curveSegments: 1 })
    geo.center()
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xe4fff6, metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.35, emissive: 0x137a60, emissiveIntensity: 0.45 })

    const objs = MARKS.map(() => {
      const grp = new THREE.Group()
      const spinner = new THREE.Group()
      const mesh = new THREE.Mesh(geo, mat.clone())
      spinner.add(mesh); grp.add(spinner); scene3.add(grp)
      return { grp, spinner, mesh }
    })

    const fit = () => {
      const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k')) || 0.5
      const q = Math.min(2, Math.max(0.5, k * (window.devicePixelRatio || 1)))
      renderer.setPixelRatio(1)
      renderer.setSize(Math.round(1920 * q), Math.round(1080 * q), false)
      canvas.style.width = '1920px'; canvas.style.height = '1080px'
    }
    fit(); window.addEventListener('launch:resize', fit)

    let blank = false
    paint = () => {
      const t = tl.time()
      let any = false, blur = 0
      MARKS.forEach((m, i) => {
        const o = objs[i], on = m.o > 0.001
        o.grp.visible = on
        if (!on) return
        any = true; blur = Math.max(blur, m.blur)
        o.grp.position.set(m.x - 960, 540 - m.y, 0)
        o.grp.rotation.z = -m.rz * Math.PI / 180
        const sc = m.s / 26
        o.spinner.scale.setScalar(sc)
        o.spinner.rotation.set(m.rx * Math.PI / 180, (m.ry0 + t * m.spin) * Math.PI / 180, 0)
        o.mesh.material.emissiveIntensity = 0.45 * m.lum
        o.mesh.material.envMapIntensity = 1.35 * Math.sqrt(m.lum)
      })
      if (!any && blank) return
      blank = !any
      canvas.style.filter = blur > 0.05 ? B(blur) : ''
      renderer.render(scene3, cam)
    }
  } catch (err) {
    console.warn('Reclaim launch: WebGL mark unavailable, drawing it flat.', err)
    const els = MARKS.map(() => {
      const e = h('div', 'mark2d', WHEEL_SVG, stage)
      const svg = e.querySelector('svg')
      svg.style.fill = '#bff5e3'; svg.style.filter = 'drop-shadow(0 0 6px rgba(120,240,210,.9))'
      return e
    })
    paint = () => {
      const t = tl.time()
      MARKS.forEach((m, i) => {
        const e = els[i]
        e.style.display = m.o > 0.001 ? '' : 'none'
        if (m.o <= 0.001) return
        const c = Math.cos((m.ry0 + t * m.spin) * Math.PI / 180)
        const svg = e.firstElementChild
        svg.style.width = m.s + 'px'; svg.style.height = (m.s * 23 / 26) + 'px'; svg.style.top = (-m.s * 23 / 52) + 'px'
        e.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${m.rz}deg) scaleX(${Math.max(0.06, Math.abs(c)).toFixed(3)})`
        e.style.filter = m.blur > 0.05 ? B(m.blur) : ''
      })
    }
  }
  gsap.ticker.add(() => { paintHalos(); paint() })
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
    scrub.setAttribute('aria-valuenow', t.toFixed(1)); scrub.setAttribute('aria-valuetext', `${t.toFixed(1)} of 10 seconds`)
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
  const seek = t => { tl.seek(Math.min(DUR, Math.max(0, t)), false); if (!running) setState(tl.progress() >= 1 ? 'ended' : 'paused'); sync(); paintHalos(); paint() }

  bigPlay.addEventListener('click', e => { e.stopPropagation(); play() })
  screen.addEventListener('click', toggle)
  ppBtn.addEventListener('click', e => { e.stopPropagation(); toggle() })
  player.querySelector('.cta').addEventListener('click', e => e.stopPropagation())
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) pause() })
  player.addEventListener('pointermove', wake)

  const at = e => { const r = scrub.getBoundingClientRect(); return (e.clientX - r.left) / r.width * DUR }
  scrub.addEventListener('pointerdown', e => {
    e.stopPropagation()
    const was = running; pause(); scrub.classList.add('is-drag'); scrub.setPointerCapture(e.pointerId); seek(at(e))
    const move = ev => seek(at(ev))
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
  window.__launch = { tl, DUR, seek, play, pause, MARKS }
}

function fit() {
  document.documentElement.style.setProperty('--k', (player.clientWidth / 1920).toFixed(5))
  window.dispatchEvent(new Event('launch:resize'))
}

async function boot() {
  fit()
  new ResizeObserver(fit).observe(player)
  const fonts = Promise.all(['400 100px Inter', '500 100px Inter', '600 100px Inter', '400 100px Tinos'].map(f => document.fonts.load(f))).catch(() => {})
  await Promise.race([fonts, new Promise(r => setTimeout(r, 4000))])
  ;[shot1, shot2, shot3, shot4, shot5, shot6].forEach(f => f())
  tl.set({}, {}, DUR)
  tl.seek(0.001).seek(0)
  await initMarks()
  player.classList.remove('is-loading')
  mountPlayer()
}
if (gsap) boot()

/* Homepage hero: a physical paper ledger, modelled and lit in WebGL.

   The sheet is a thick, slightly cocked bond page with a photographed print
   on the face. It is pre-cut along shared jagged fractures so the pieces
   interlock. They tear into depth and land a hair apart, leaving the cracks. */
import * as THREE from 'three';

const host = document.querySelector('[data-hero-paper]');
if (host && window.gsap) init(host).catch((err) => console.warn('Reclaim hero paper:', err));

async function init(host) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const W = 4.1, H = 3.05, T = 0.07;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.2, 80);

  const env = studioEnv(renderer);
  scene.environment = env;

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x9a9086, 0.55));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.15);
  key.position.set(3.4, 5.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdde8ff, 0.7);
  rim.position.set(-4.2, 1.6, 2.4);
  scene.add(rim);
  const bounce = new THREE.DirectionalLight(0xffe7c8, 0.28);
  bounce.position.set(0.2, -2.4, 3.2);
  scene.add(bounce);

  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), new THREE.ShadowMaterial({ opacity: 0.32, color: 0x2a2420 }));
  catcher.position.z = -0.85;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const [faceMap, backMap, grain] = await Promise.all([
    loadPaper('/assets/ledger-paper-scan.jpg', paintPrintedSheet),
    loadPaper('/assets/ledger-paper-back.jpg', () => paintStock(2048, 1536, true)),
    Promise.resolve(grainTexture()),
  ]);
  for (const t of [faceMap, backMap]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  const edgeMap = fiberTexture();

  const paper = (map) => new THREE.MeshPhysicalMaterial({
    map,
    bumpMap: grain,
    bumpScale: 1.55,
    roughnessMap: grain,
    roughness: 0.78,
    metalness: 0,
    sheen: 0.62,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(0xfff3e2),
    clearcoat: 0.05,
    clearcoatRoughness: 0.88,
    envMapIntensity: 0.42,
  });
  const materials = [
    paper(faceMap),
    new THREE.MeshStandardMaterial({
      map: edgeMap,
      color: 0xc9b8a4,
      roughness: 1,
      metalness: 0,
      bumpMap: grain,
      bumpScale: 2.8,
    }),
    paper(backMap),
  ];

  const P = {
    tl: [0, 1], tr: [1, 1], bl: [0, 0], br: [1, 0],
    t1: [0.36, 1], a1: [0.34, 0.86], a2: [0.375, 0.76], j1: [0.33, 0.55],
    l1: [0, 0.575], l1i: [0.17, 0.555],
    c1: [0.5, 0.535], c2: [0.68, 0.545], j2: [0.72, 0.665], r1i: [0.86, 0.685], r1: [1, 0.70],
    d1: [0.36, 0.40], d2: [0.335, 0.31], j3: [0.30, 0.255], l2i: [0.15, 0.245], l2: [0, 0.27],
    e1: [0.66, 0.415], j4: [0.69, 0.285], r2i: [0.85, 0.295], r2: [1, 0.30], b1: [0.63, 0],
  };
  const pieces = [
    { ring: ['tl', 't1', 'a1', 'a2', 'j1', 'l1i', 'l1'], dir: [-1, 0.8] },
    { ring: ['t1', 'tr', 'r1', 'r1i', 'j2', 'c2', 'c1', 'j1', 'a2', 'a1'], dir: [0.6, 0.95] },
    { ring: ['l1', 'l1i', 'j1', 'd1', 'd2', 'j3', 'l2i', 'l2'], dir: [-1, 0.05] },
    { ring: ['j1', 'c1', 'c2', 'j2', 'r1i', 'r1', 'r2', 'r2i', 'j4', 'e1', 'd1'], dir: [1, 0.12] },
    { ring: ['l2', 'l2i', 'j3', 'd2', 'd1', 'e1', 'j4', 'b1', 'bl'], dir: [-0.7, -0.95] },
    { ring: ['j4', 'r2i', 'r2', 'br', 'b1'], dir: [0.9, -0.85] },
  ];
  const onFrame = (a, b) => (a[0] === b[0] && (a[0] === 0 || a[0] === 1)) || (a[1] === b[1] && (a[1] === 0 || a[1] === 1));
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  const jagged = (na, nb) => {
    const flip = na > nb;
    const [ka, kb] = flip ? [nb, na] : [na, nb];
    const a = P[ka], b = P[kb];
    const frame = onFrame(a, b);
    const len = Math.hypot((b[0] - a[0]) * W, (b[1] - a[1]) * H);
    const n = Math.max(2, Math.round(len / (frame ? 0.07 : 0.04)));
    const nx = -(b[1] - a[1]) * H, ny = (b[0] - a[0]) * W;
    const nl = Math.hypot(nx, ny) || 1;
    const amp = frame ? 0.014 : 0.034;
    const p1 = hash(ka + kb + 'a') * 6.28, p2 = hash(ka + kb + 'b') * 6.28;
    const pts = [];
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const env = Math.sin(t * Math.PI) ** 0.35;
      const w = amp * env * (0.55 * Math.sin(k * 1.7 + p1) + 0.3 * Math.sin(k * 4.1 + p2) + 0.9 * (hash(ka + kb + k) - 0.5));
      pts.push([
        (a[0] + (b[0] - a[0]) * t) * W + nx / nl * w,
        (a[1] + (b[1] - a[1]) * t) * H + ny / nl * w,
      ]);
    }
    return flip ? pts.reverse() : pts;
  };

  const sheet = new THREE.Group();
  sheet.rotation.set(0.52, -0.46, -0.1);
  scene.add(sheet);

  const uvGen = {
    generateTopUV: (g, v, a, b, c) => [a, b, c].map(i => new THREE.Vector2(v[i * 3] / W, v[i * 3 + 1] / H)),
    generateSideWallUV: (g, v, a, b, c, d) => {
      const u = (i) => (v[i * 3] + v[i * 3 + 1] * 0.7) * 2.5;
      return [new THREE.Vector2(u(a), 0), new THREE.Vector2(u(b), 0), new THREE.Vector2(u(c), 1), new THREE.Vector2(u(d), 1)];
    },
  };

  const parts = pieces.map((piece, i) => {
    const outline = [];
    piece.ring.forEach((name, k) => {
      const next = piece.ring[(k + 1) % piece.ring.length];
      outline.push([P[name][0] * W, P[name][1] * H], ...jagged(name, next));
    });
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length;
    const cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: T,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
      curveSegments: 1,
      UVGenerator: uvGen,
    });
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) if (isCap(geo, k)) uv.setXY(k, uv.getX(k) + cx / W, uv.getY(k) + cy / H);
    cockle(geo, cx, cy);
    splitCaps(geo);
    geo.translate(0, 0, -T / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = mesh.receiveShadow = true;
    sheet.add(mesh);

    const dx = piece.dir[0], dy = piece.dir[1];
    const dl = Math.hypot(dx, dy);
    const rest = { x: cx - W / 2, y: cy - H / 2 };
    const gap = 0.028;
    const state = { x: rest.x, y: rest.y, z: 0, rx: 0, ry: 0, rz: 0 };
    return {
      mesh, state,
      cracked: { x: rest.x + dx / dl * gap, y: rest.y + dy / dl * gap, z: (i % 2 ? 1 : -1) * 0.006, rx: 0, ry: 0, rz: (i % 3 - 1) * 0.008 },
      apart: {
        x: rest.x + dx * 0.82, y: rest.y + dy * 0.58, z: 0.72 + i * 0.18,
        rx: (i % 2 ? 1 : -1) * (0.42 + i * 0.06), ry: (i % 3 - 1) * 0.55 + dx * 0.18, rz: dx * (0.18 + i * 0.04),
      },
    };
  });

  function isCap(geo, k) { return Math.abs(geo.attributes.normal.getZ(k)) > 0.45; }
  function splitCaps(geo) {
    const n = geo.attributes.normal;
    const tris = n.count / 3;
    geo.clearGroups();
    let start = 0, mat = -1;
    for (let t = 0; t <= tris; t++) {
      const m = t === tris ? -2 : (Math.abs(n.getZ(t * 3)) > 0.45 ? (n.getZ(t * 3) > 0 ? 0 : 2) : 1);
      if (m !== mat) { if (t > start) geo.addGroup(start * 3, (t - start) * 3, mat); start = t; mat = m; }
    }
  }
  function cockle(geo, cx, cy) {
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const sx = pos.getX(k) + cx;
      const sy = pos.getY(k) + cy;
      const u = sx / W - 0.5;
      const v = sy / H - 0.5;
      const lift = 0.07 * (u * u) - 0.045 * (v * v) + 0.018 * Math.sin(u * 5.2) * Math.cos(v * 4.1);
      pos.setZ(k, pos.getZ(k) + lift);
    }
    pos.needsUpdate = true;
  }

  const states = parts.map(p => p.state);
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.85, repeatRefresh: true });
  tl.to(states, { duration: 1.35, ease: 'power3.inOut', stagger: { amount: 0.3, from: 'edges' },
    x: i => parts[i].apart.x, y: i => parts[i].apart.y, z: i => parts[i].apart.z,
    rx: i => parts[i].apart.rx, ry: i => parts[i].apart.ry, rz: i => parts[i].apart.rz }, 1.7)
    .to(states, { duration: 1.0, ease: 'sine.inOut', stagger: { amount: 0.2, from: 'random' },
      x: i => parts[i].apart.x * 1.05, y: i => parts[i].apart.y * 0.94, z: i => parts[i].apart.z + 0.22,
      rx: i => parts[i].apart.rx * 0.72, ry: i => parts[i].apart.ry * 1.18 }, '>-0.1')
    .to(states, { duration: 1.45, ease: 'back.out(1.12)', stagger: { amount: 0.4, from: 'center' },
      x: i => parts[i].cracked.x, y: i => parts[i].cracked.y, z: i => parts[i].cracked.z,
      rx: i => parts[i].cracked.rx, ry: i => parts[i].cracked.ry, rz: i => parts[i].cracked.rz }, '>+0.15')
    .to({}, { duration: 1.35 });

  const clock = new THREE.Clock();
  let inView = false, raf = 0;
  const frame = () => {
    raf = 0;
    const t = clock.getElapsedTime();
    sheet.rotation.x = 0.52 + Math.sin(t * 0.41) * 0.03;
    sheet.rotation.y = -0.46 + Math.sin(t * 0.29) * 0.045;
    sheet.position.y = Math.sin(t * 0.48) * 0.035;
    for (const p of parts) {
      p.mesh.position.set(p.state.x, p.state.y, p.state.z);
      p.mesh.rotation.set(p.state.rx, p.state.ry, p.state.rz);
    }
    renderer.render(scene, camera);
    if (inView && !reduce.matches) raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    if (reduce.matches) { tl.pause(0); for (const p of parts) Object.assign(p.state, p.cracked); }
    else if (inView) tl.play();
    else tl.pause();
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(W / (0.72 * camera.aspect), H / 0.78) / (2 * halfTan);
    camera.position.set(dist * 0.22, dist * 0.28, dist);
    camera.lookAt(0.08, -0.04, 0);
    camera.updateProjectionMatrix();
    if (!raf) raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(resize).observe(host);
  resize();
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: '160px' }).observe(host);
  reduce.addEventListener?.('change', sync);
}

function studioEnv(renderer) {
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(
    new THREE.SphereGeometry(40, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xddd6cc, side: THREE.BackSide }),
  ));
  const window = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), new THREE.MeshBasicMaterial({ color: 0xfff7ea }));
  window.position.set(-8, 10, 16);
  studio.add(window);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xc8c0b6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -8;
  studio.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(studio, 0.04).texture;
  pmrem.dispose();
  return tex;
}

function loadPaper(src, fallback) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const stock = cropPaper(img);
      resolve(new THREE.CanvasTexture(src.includes('scan') ? printOnStock(stock) : stock));
    };
    img.onerror = () => resolve(new THREE.CanvasTexture(fallback()));
    img.src = src;
  });
}

function cropPaper(img) {
  const src = document.createElement('canvas');
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext('2d');
  sctx.drawImage(img, 0, 0);
  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  const isPaper = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return !(Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && r > 210 && max - min < 12);
  };
  let x0 = 0, x1 = width - 1, y0 = 0, y1 = height - 1;
  const rowHas = (y) => { for (let x = 0; x < width; x++) if (isPaper((y * width + x) * 4)) return true; return false; };
  const colHas = (x) => { for (let y = 0; y < height; y++) if (isPaper((y * width + x) * 4)) return true; return false; };
  while (y0 < y1 && !rowHas(y0)) y0++;
  while (y1 > y0 && !rowHas(y1)) y1--;
  while (x0 < x1 && !colHas(x0)) x0++;
  while (x1 > x0 && !colHas(x1)) x1--;
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1536;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, c.width, c.height);
  return c;
}

function grainTexture() {
  const s = 512, c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 148 + (Math.random() - 0.5) * 86;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * s, y = Math.random() * s, a = Math.random() * Math.PI, l = 8 + Math.random() * 28;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 4.5);
  return t;
}

function fiberTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe4d4'; ctx.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 512, y = Math.random() * 64, l = 3 + Math.random() * 16;
    ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(255,248,236,.7)' : 'rgba(140,112,86,.4)';
    ctx.lineWidth = 0.6 + Math.random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (Math.random() - 0.5) * 4); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function paintStock(cw, ch, showThrough) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe6d8'; ctx.fillRect(0, 0, cw, ch);
  const g = ctx.createRadialGradient(cw * 0.4, ch * 0.35, ch * 0.15, cw * 0.5, ch * 0.5, ch);
  g.addColorStop(0, 'rgba(255,250,240,.4)'); g.addColorStop(1, 'rgba(120,96,72,.14)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 3400; i++) {
    const x = Math.random() * cw, y = Math.random() * ch, a = Math.random() * Math.PI, l = 10 + Math.random() * 46;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(118,92,70,.55)' : 'rgba(255,255,255,.85)';
    ctx.lineWidth = 0.7 + Math.random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(92,68,48,${0.07 + Math.random() * 0.16})`;
    ctx.beginPath(); ctx.arc(Math.random() * cw, Math.random() * ch, 1 + Math.random() * 2.4, 0, 7); ctx.fill();
  }
  if (showThrough) {
    ctx.fillStyle = 'rgba(70,52,38,.045)';
    ctx.font = '500 28px "JetBrains Mono", monospace';
    ctx.fillText('RECLAIM  /  AP EXPORT  /  PAGE 1 OF 1', 90, ch - 70);
  }
  return c;
}

function printOnStock(stock) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1536;
  const ctx = c.getContext('2d');
  ctx.drawImage(stock, 0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(255,248,236,.16)';
  ctx.fillRect(0, 0, c.width, c.height);
  drawLedgerInk(ctx, c.width, c.height);
  return c;
}

function paintPrintedSheet() {
  const cw = 2048, ch = 1536;
  const c = paintStock(cw, ch, false);
  drawLedgerInk(c.getContext('2d'), cw, ch);
  return c;
}

function drawLedgerInk(ctx, cw, ch) {
  const mono = '"JetBrains Mono", ui-monospace, monospace';
  const m = 110, tw = cw - m * 2;
  const cols = [1.28, 0.84, 0.94, 0.94, 0.8, 0.8];
  const sum = cols.reduce((a, b) => a + b, 0);
  const xs = [m]; cols.forEach(w => xs.push(xs[xs.length - 1] + w / sum * tw));
  const rows = [
    ['Vendor', 'Invoice', 'Invoice date', 'Payment date', 'Invoiced', 'Paid'],
    ['Halden Supply', 'INV-1834', '04/18/26', '05/04/26', '4,280.00', '4,280.00'],
    ['Halden Supply', 'INV-1834', '04/18/26', '05/09/26', '4,280.00', '4,280.00'],
    ['Birch & Vale', 'B-4471', '05/20/26', '06/12/26', '2,150.00', '2,150.00'],
    ['Northstar', 'NS-2088', '06/01/26', '06/18/26', '5,720.00', '6,920.00'],
    ['Southport', 'SJ-3104', '06/11/26', '07/03/26', '1,270.00', '1,270.00'],
    ['Fieldstone', 'FS-9018', '06/28/26', '07/17/26', '3,640.00', '3,640.00'],
    ['Redwood Office', 'RO-1182', '07/02/26', '07/22/26', '980.00', '980.00'],
  ];
  const headH = 88, rowH = 142;
  let y = m + 70;
  ctx.fillStyle = 'rgba(42,36,30,.78)';
  ctx.font = `600 30px ${mono}`;
  ctx.fillText('AP_LEDGER_EXPORT.CSV', m, m + 36);
  ctx.textAlign = 'right';
  ctx.font = `500 24px ${mono}`;
  ctx.fillText('8 records   UTF-8   USD', m + tw, m + 36);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(42,36,30,.9)';
  ctx.font = `700 26px ${mono}`;
  rows[0].forEach((h, i) => {
    ctx.textAlign = i >= 4 ? 'right' : 'left';
    ctx.fillText(h.toUpperCase(), i >= 4 ? xs[i + 1] - 18 : xs[i] + 18, y + headH / 2 + 8);
  });
  ctx.textAlign = 'left';
  y += headH;
  ctx.strokeStyle = 'rgba(42,36,30,.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(m + tw, y); ctx.stroke();

  for (let r = 1; r < rows.length; r++) {
    if (r === 2) { ctx.fillStyle = 'rgba(255,120,64,.22)'; ctx.fillRect(m, y, tw, rowH); }
    if (r === 4) { ctx.fillStyle = 'rgba(0,196,220,.16)'; ctx.fillRect(m, y, tw, rowH); }
    rows[r].forEach((v, i) => {
      ctx.fillStyle = 'rgba(36,30,26,.88)';
      ctx.font = `500 32px ${mono}`;
      ctx.textAlign = i >= 4 ? 'right' : 'left';
      ctx.fillText(v, i >= 4 ? xs[i + 1] - 18 : xs[i] + 18, y + rowH / 2 + 10);
    });
    ctx.textAlign = 'left';
    y += rowH;
    ctx.strokeStyle = 'rgba(42,36,30,.18)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(m, y); ctx.lineTo(m + tw, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(42,36,30,.5)';
  ctx.font = `500 22px ${mono}`;
  ctx.fillText('Exported 09/29/26 08:14 from QuickBooks Online', m, ch - 64);
  ctx.globalAlpha = 0.05;
  ctx.drawImage(ctx.canvas, 1.4, 1);
  ctx.globalAlpha = 1;
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FLAVORS } from './flavors.js';

gsap.registerPlugin(ScrollTrigger);

const W = 1920, H = 1080;              // система координат макета
const params = new URLSearchParams(location.search);
const TEST_UV = params.has('uv');      // ?uv — тестовая текстура для проверки развёртки
const DEBUG = params.has('debug');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// длительности в «единицах скролла»: 1 единица ≈ UNIT_VH высоты экрана
const SEG = 1;        // переход между экранами одного вкуса
const HOLD = 0.4;     // пауза на экране
const SWAP = 1.5;     // смена вкуса
const UNIT_VH = 80;

const $ = (s, r = document) => r.querySelector(s);
const div = (cls) => { const d = document.createElement('div'); if (cls) d.className = cls; return d; };
const px = (v) => (typeof v === 'number' ? `${v}px` : v);
const cssVars = (theme) => Object.fromEntries(Object.entries(theme).map(([k, v]) => ['--' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), v]));
const lines = (html) => html.split('<br>').map((l) => `<span class="line"><span>${l}</span></span>`).join('');

/* =========================================================
   DOM: для каждого вкуса — слой «за пачкой» и слой «перед пачкой»
   ========================================================= */
const sticky = $('#sticky');
const canvas = $('#gl');
const ui = $('.stage-ui');

function makeWorld(cls, theme) {
  const world = div(`world ${cls}`);
  Object.entries(cssVars(theme)).forEach(([k, v]) => world.style.setProperty(k, v));
  const shift = div('shift');
  const stage = div('stage');
  shift.appendChild(stage);
  world.appendChild(shift);
  return { world, shift, stage };
}

function buildElement(e) {
  // .el — положение по скроллу; .w(shift) — параллакс смены вкуса; .w(par) — курсор и интро; .w(fl) — парение; .clip — поворот и размытие
  const el = div('el'), shift = div('w'), par = div('w'), fl = div('w'), clip = div('clip');
  const [cw, ch] = e.clip;
  Object.assign(clip.style, { width: px(cw), height: px(ch), left: px(-cw / 2), top: px(-ch / 2) });
  const img = new Image();
  img.src = `assets/${e.img}`; img.alt = ''; img.decoding = 'async';
  if (e.cover) Object.assign(img.style, { left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' });
  else {
    const [l, t, w, h] = e.pos;
    Object.assign(img.style, { left: px(l), top: px(t), width: px(w), height: px(h) });
  }
  if (e.imgFlip) img.style.transform = 'scaleY(-1)';
  clip.appendChild(img); fl.appendChild(clip); par.appendChild(fl); shift.appendChild(par); el.appendChild(shift);
  return { e, el, shift, par, fl, clip };
}

function buildScreen(sc, i, F) {
  const parts = { block: div(i === 0 ? 'copy first' : 'copy') };
  parts.block.innerHTML = `
    <${i === 0 ? 'h1' : 'h2'} class="title">${lines(sc.title)}</${i === 0 ? 'h1' : 'h2'}>
    <p class="text">${lines(sc.text)}</p>
    <a class="btn btn-solid" href="#"><span>Попробовать</span><span class="arrow">→</span></a>`;
  if (sc.detail) {
    parts.detail = div('detail');
    parts.detail.innerHTML = `
      <div class="title">${lines(sc.detail.title)}</div>
      <p class="text">${lines(sc.detail.text)}</p>
      <div class="weight"><span class="line"><span>${sc.detail.weight}</span></span></div>`;
  }
  if (sc.callouts) {
    parts.callouts = div('callouts');
    sc.callouts.forEach((c) => {
      const d = div('callout');
      Object.assign(d.style, { left: px(c.x), top: px(c.y), width: px(c.w), fontSize: px(c.size), lineHeight: px(c.lh) });
      d.innerHTML = c.html;
      parts.callouts.appendChild(d);
    });
    sc.leaders.forEach((l) => {
      const img = new Image();
      img.src = l.src; img.alt = ''; img.className = 'leader';
      Object.assign(img.style, { left: px(l.x), top: px(l.y), width: px(l.w), height: px(l.h) });
      parts.callouts.appendChild(img);
    });
    parts.footer = div('footer');
    parts.footer.innerHTML = `
      <div class="hairline"></div>
      <span class="hint">↓&nbsp;&nbsp;Листайте</span>
      <span class="marker">${sc.marker}</span>
      <span class="chapter">01 / 03</span>`;
  }
  // всё, что выезжает построчно
  parts.items = () => [
    ...parts.block.querySelectorAll('.line'), parts.block.querySelector('.btn'),
    ...(parts.detail ? parts.detail.querySelectorAll('.line') : []),
  ];
  parts.extras = [parts.callouts, parts.footer].filter(Boolean);
  return parts;
}

const flavors = FLAVORS.map((F, fi) => {
  const back = makeWorld('world-back', F.theme);
  const front = makeWorld('world-front', F.theme);
  const bg = div('bg');
  bg.style.backgroundImage = `url(${F.bg})`;
  back.shift.insertBefore(bg, back.stage);

  const layerBack = div('layer'), layerFront = div('layer');
  back.stage.appendChild(layerBack);
  front.stage.appendChild(layerFront);

  const els = F.elements.map((e) => {
    const x = buildElement(e);
    (e.layer === 'front' ? layerFront : layerBack).appendChild(x.el);
    return x;
  });

  const screens = F.screens.map((sc, i) => {
    const s = buildScreen(sc, i, F);
    [s.callouts, s.block, s.detail, s.footer].filter(Boolean).forEach((n) => front.stage.appendChild(n));
    return s;
  });

  sticky.insertBefore(back.world, canvas);
  sticky.insertBefore(front.world, ui);
  return { F, fi, back, front, bg, els, screens };
});

// логотипы в шапке: по одному на вкус, при смене вкуса меняются
const logo = $('#logo');
const logos = FLAVORS.map((F, i) => {
  const img = new Image();
  img.src = F.logo; img.alt = i === 0 ? 'Пирожникофф' : '';
  if (i) img.style.opacity = 0;
  logo.appendChild(img);
  return img;
});

// индикатор: 3 + 3 экрана
const progress = $('#progress');
const dots = [];
FLAVORS.forEach((F, fi) => {
  if (fi) { const g = document.createElement('i'); g.className = 'gap'; progress.appendChild(g); }
  F.screens.forEach(() => { const d = document.createElement('i'); progress.appendChild(d); dots.push(d); });
});

/* =========================================================
   three.js
   ========================================================= */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // не «выбеливает» цвета упаковки, в отличие от ACES
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
keyLight.position.set(-900, 1200, 1800);
scene.add(keyLight);
const rim = new THREE.DirectionalLight(0xffffff, 0.8);
rim.position.set(1400, 200, -600);
scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const FOV = 20;
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
let vw = innerWidth, vh = innerHeight, S = 1;

function resize() {
  vw = innerWidth; vh = innerHeight;
  S = Math.min(vw / W, vh / H);
  const tr = `translate(${-W * S / 2}px, ${-H * S / 2}px) scale(${S})`;
  document.querySelectorAll('.stage').forEach((s) => (s.style.transform = tr));
  renderer.setSize(vw, vh, false);
  // 1 единица мира = 1 px макета, центр макета = центр экрана
  camera.aspect = vw / vh;
  camera.position.set(0, 0, (vh / S / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Развёртка: в центре — лицевая сторона, по краям — две половины задней.
// Модель читает текстуру как [перед | зад], поэтому переставляем куски.
function buildWrapTexture(img) {
  const w = img.naturalWidth, h = img.naturalHeight, q = w / 4;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (TEST_UV) {
    ctx.fillStyle = '#e33'; ctx.fillRect(0, 0, w / 2, h);
    ctx.fillStyle = '#36c'; ctx.fillRect(w / 2, 0, w / 2, h);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${h / 8}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('FRONT ↑', w / 4, h / 2); ctx.fillText('BACK ↑', w * 3 / 4, h / 2);
  } else {
    ctx.drawImage(img, q, 0, 2 * q, h, 0, 0, 2 * q, h);       // перед
    ctx.drawImage(img, 3 * q, 0, q, h, 2 * q, 0, q, h);       // зад, правая часть плёнки
    ctx.drawImage(img, 0, 0, q, h, 3 * q, 0, q, h);           // зад, левая часть плёнки
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  // UV модели идут по кругу 0..2. Лицевая сторона занимает u ≈ −0.03…0.925,
  // её вписываем ровно в левую половину холста, остальное ложится на зад и бока.
  const FRONT_U0 = 0.05, FRONT_U1 = 0.925; // левый край сдвинут внутрь: у модели он уходит на бок пакета
  tex.repeat.x = 0.5 / (FRONT_U1 - FRONT_U0);
  tex.offset.x = -FRONT_U0 * tex.repeat.x;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { tex, aspect: (w / 2) / h };
}

const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// пачки: по одной на вкус, геометрия общая
const packs = FLAVORS.map((F) => {
  const root = new THREE.Group();
  const bag = new THREE.Group();
  root.add(bag);
  scene.add(root);
  const s0 = F.pack[0];
  return { F, root, bag, st: { x: s0.c[0], y: s0.c[1], h: s0.h, roll: s0.roll, yaw: s0.yaw, pitch: s0.pitch, lift: 0 } };
});

async function loadPacks() {
  const [gltf, ...wraps] = await Promise.all([
    new GLTFLoader().loadAsync('assets/chip_bag.glb'),
    ...FLAVORS.map((F) => loadImage(F.wrap)),
  ]);
  // берём геометрию без цепочки трансформаций Sketchfab: x — ширина, y — толщина, z — высота
  const geos = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.rotateX(Math.PI / 2); // высота → вверх, лицевая сторона → к камере
    geos.push(g);
  });
  const box = new THREE.Box3();
  geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox); });
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  geos.forEach((g) => g.translate(-center.x, -center.y, -center.z));

  // Форма пакета одна на все вкусы и не зависит от размеров картинки развёртки:
  // ширина/высота лицевой стороны берётся по первой развёртке.
  const BAG_ASPECT = (wraps[0].naturalWidth / 2) / wraps[0].naturalHeight;
  packs.forEach((p, i) => {
    const { tex } = buildWrapTexture(wraps[i]);
    const aspect = BAG_ASPECT;
    geos.forEach((g, gi) => {
      const mat = gi === 0
        ? new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.22, side: THREE.DoubleSide })
        : new THREE.MeshPhysicalMaterial({ color: p.F.seal, roughness: 0.4, metalness: 0.1, clearcoat: 0.5, side: THREE.DoubleSide });
      p.bag.add(new THREE.Mesh(g, mat));
    });
    // высота = 1, ширина — по пропорциям лицевой стороны развёртки
    const k = 1 / size.y;
    p.bag.scale.set(k * (aspect / (size.x / size.y)), k, k);
  });
  renderer.compile(scene, camera);
}

/* =========================================================
   рендер
   ========================================================= */
const intro = { k: 0 };
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (ev) => {
  pointer.x = (ev.clientX / vw) * 2 - 1;
  pointer.y = (ev.clientY / vh) * 2 - 1;
});

const clock = new THREE.Clock();
function render() {
  const t = clock.getElapsedTime();
  pointer.sx += (pointer.x - pointer.sx) * 0.06;
  pointer.sy += (pointer.y - pointer.sy) * 0.06;
  const idle = reduceMotion ? 0 : 1;

  packs.forEach((p, i) => {
    const s = p.st;
    const ik = i === 0 ? intro.k : 1;
    const ph = i * 1.7;
    const bob = Math.sin(t * 0.9 + ph) * 10 * idle;
    const scale = s.h * (1 + s.lift * 0.08) * (0.82 + 0.18 * ik);
    p.root.visible = s.y > -700 && s.y < H + 700;
    p.root.position.set(s.x - W / 2, H / 2 - s.y + bob, s.lift * 120);
    p.root.scale.setScalar(scale);
    p.root.rotation.set(
      s.pitch + pointer.sy * 0.08 + Math.sin(t * 0.7 + ph) * 0.025 * idle,
      s.yaw + pointer.sx * 0.18 + Math.sin(t * 0.5 + ph) * 0.05 * idle - (1 - ik) * 1.4,
      THREE.MathUtils.degToRad(-s.roll) + Math.sin(t * 0.6 + ph) * 0.012 * idle,
      'ZXY',
    );
  });
  renderer.render(scene, camera);
}

/* =========================================================
   начальные положения
   ========================================================= */
const firstState = (e) => e.states.findIndex(Boolean);
const offPose = (e, s) => {
  const o = e.off || {};
  return { x: s.c[0] + (o.dx || 0), y: s.c[1] + (o.dy || 0), scale: (s.scale ?? 1) * (o.scale ?? 1), rot: s.rot + (o.rot || 0) };
};

flavors.forEach(({ els, screens }, fi) => {
  els.forEach(({ e, el, clip }) => {
    const k = firstState(e), s = e.states[k];
    if (k === 0) {
      gsap.set(el, { x: s.c[0], y: s.c[1], scale: s.scale ?? 1 });
      gsap.set(clip, { rotation: s.rot, scaleY: e.flipY ? -1 : 1, filter: `blur(${s.blur || 0}px)` });
    } else {
      const o = offPose(e, s);
      gsap.set(el, { x: o.x, y: o.y, scale: o.scale, opacity: 0 });
      gsap.set(clip, { rotation: o.rot, scaleY: e.flipY ? -1 : 1, filter: `blur(${s.blur || 0}px)` });
    }
  });
  screens.forEach((sc, i) => {
    if (i === 0) return;
    gsap.set(sc.items(), { opacity: 0, y: 80 });
  });
});

// второй вкус ждёт за «куполом» снизу. Купол режет новый мир (clip-path),
// а передний слой старого мира прячется по той же линии (маска), чтобы его элементы не висели поверх.
const domes = flavors.slice(1).map((f) => {
  const d = { rx: 70, ry: 0.01, inner: [f.back.world, f.front.world], outer: flavors[f.fi - 1].front.world };
  d.apply = () => {
    const shape = `ellipse(${d.rx}% ${d.ry}% at 50% 112%)`;
    d.inner.forEach((w) => (w.style.clipPath = shape));
    const mask = `radial-gradient(ellipse ${d.rx}% ${d.ry}% at 50% 112%, transparent 99.5%, #000 100%)`;
    d.outer.style.webkitMaskImage = mask;
    d.outer.style.maskImage = mask;
  };
  d.apply();
  return d;
});
flavors.slice(1).forEach((f) => {
  [f.back.world, f.front.world].forEach((w) => w.classList.add('is-clipped'));
  gsap.set([f.back.shift, f.front.shift], { yPercent: 35 });
  gsap.set(f.bg, { yPercent: 12 });
  f.els.forEach(({ shift, e }) => gsap.set(shift, { y: 460 * (e.depth ?? 1) }));
  gsap.set(f.screens[0].block.querySelectorAll('.line > span'), { yPercent: 110 });
  gsap.set(f.screens[0].block.querySelector('.btn'), { opacity: 0, y: 40 });
  gsap.set(f.screens[0].extras, { opacity: 0 });
  const p = packs[f.fi], s0 = p.F.pack[0];
  Object.assign(p.st, { x: s0.c[0] + 120, y: H + 720, h: s0.h * 0.9, roll: 28, yaw: s0.yaw - Math.PI * 1.25, pitch: 0.35 });
});

/* =========================================================
   таймлайн скролла
   ========================================================= */
const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
const rests = [];   // интервалы, когда экран стоит: [start, end]

function packTo(p, s, at, dur = SEG) {
  tl.to(p.st, { x: s.c[0], y: s.c[1], h: s.h, roll: s.roll, yaw: s.yaw, pitch: s.pitch, duration: dur, ease: 'power2.inOut' }, at);
  tl.to(p.st, { lift: 1, duration: dur / 2, ease: 'sine.inOut' }, at)
    .to(p.st, { lift: 0, duration: dur / 2, ease: 'sine.inOut' }, at + dur / 2);
}

function textOut(sc, at) {
  tl.to(sc.items(), { y: -70, opacity: 0, stagger: 0.025, duration: 0.3, ease: 'power2.in' }, at);
  if (sc.extras.length) tl.to(sc.extras, { opacity: 0, duration: 0.18 }, at);
}
function textIn(sc, at) {
  tl.to(sc.items(), { y: 0, opacity: 1, stagger: 0.035, duration: 0.34, ease: 'power3.out' }, at);
}

// экран i → i+1 одного вкуса
function segment(f, i, at) {
  packTo(packs[f.fi], f.F.pack[i + 1], at);
  f.els.forEach(({ e, el, clip }) => {
    const A = e.states[i], B = e.states[i + 1];
    if (A && B) {
      tl.to(el, { x: B.c[0], y: B.c[1], scale: B.scale ?? 1, duration: SEG, ease: 'power2.inOut' }, at);
      tl.to(clip, { rotation: B.rot, filter: `blur(${B.blur || 0}px)`, duration: SEG, ease: 'power2.inOut' }, at);
    } else if (A) {
      const o = offPose(e, A);
      tl.to(el, { x: o.x, y: o.y, scale: o.scale, opacity: 0, duration: SEG * 0.5, ease: 'power2.in' }, at);
      tl.to(clip, { rotation: o.rot, duration: SEG * 0.5, ease: 'power2.in' }, at);
    } else if (B) {
      const o = offPose(e, B);
      tl.set(el, { x: o.x, y: o.y, scale: o.scale }, at);
      tl.set(clip, { rotation: o.rot, filter: `blur(${B.blur || 0}px)` }, at);
      tl.to(el, { x: B.c[0], y: B.c[1], scale: B.scale ?? 1, opacity: 1, duration: SEG * 0.55, ease: 'power3.out' }, at + SEG * 0.45);
      tl.to(clip, { rotation: B.rot, duration: SEG * 0.55, ease: 'power3.out' }, at + SEG * 0.45);
    }
  });
  textOut(f.screens[i], at + 0.02);
  textIn(f.screens[i + 1], at + SEG * 0.62);
}

// смена вкуса: старый мир уезжает вверх, новый поднимается «куполом» снизу с параллаксом
function swap(a, b, at) {
  const last = a.F.screens.length - 1;
  const pa = packs[a.fi], pb = packs[b.fi];
  const sa = a.F.pack[last];

  // старая пачка подброшена вверх с вращением
  tl.to(pa.st, { y: -560, x: sa.c[0] - 60, yaw: sa.yaw + Math.PI * 1.1, roll: sa.roll - 30, h: sa.h * 0.85, pitch: -0.4, duration: SWAP * 0.62, ease: 'power2.in' }, at);
  // новая пачка вылетает снизу и встаёт в первый ракурс
  const s0 = b.F.pack[0];
  tl.to(pb.st, { x: s0.c[0], y: s0.c[1], h: s0.h, roll: s0.roll, yaw: s0.yaw, pitch: s0.pitch, duration: SWAP * 0.72, ease: 'power3.out' }, at + SWAP * 0.28);

  // тексты третьего экрана уходят
  textOut(a.screens[last], at);

  // старый мир: уезжает вверх, ближние элементы — быстрее
  tl.to([a.back.shift, a.front.shift], { yPercent: -22, duration: SWAP, ease: 'power2.in' }, at);
  tl.to(a.bg, { yPercent: -8, duration: SWAP, ease: 'power2.in' }, at);
  a.els.forEach(({ shift, e }) => tl.to(shift, { y: -420 * (e.depth ?? 1), duration: SWAP * 0.9, ease: 'power2.in' }, at));

  // новый мир: купол раскрывается, слои догоняют с разной скоростью
  const dome = domes[b.fi - 1];
  tl.to(dome, { rx: 170, ry: 180, duration: SWAP, ease: 'power2.inOut', onUpdate: dome.apply }, at);
  tl.to([b.back.shift, b.front.shift], { yPercent: 0, duration: SWAP, ease: 'power3.out' }, at + SWAP * 0.05);
  tl.to(b.bg, { yPercent: 0, duration: SWAP, ease: 'power2.out' }, at);
  b.els.forEach(({ shift, e }) => tl.to(shift, { y: 0, duration: SWAP * 0.85, ease: 'power3.out' }, at + SWAP * 0.15));

  // тема шапки и логотип
  tl.to(document.documentElement, { ...cssVars(b.F.theme), duration: SWAP * 0.4 }, at + SWAP * 0.35);
  tl.to(logos[a.fi], { opacity: 0, duration: SWAP * 0.3 }, at + SWAP * 0.4);
  tl.to(logos[b.fi], { opacity: 1, duration: SWAP * 0.3 }, at + SWAP * 0.45);

  // первый экран нового вкуса: заголовок выезжает построчно
  const s1 = b.screens[0];
  tl.to(s1.block.querySelectorAll('.line > span'), { yPercent: 0, stagger: 0.05, duration: SWAP * 0.35, ease: 'power3.out' }, at + SWAP * 0.55);
  tl.to(s1.block.querySelector('.btn'), { opacity: 1, y: 0, duration: SWAP * 0.3, ease: 'power3.out' }, at + SWAP * 0.75);
  tl.to(s1.extras, { opacity: 1, duration: SWAP * 0.3 }, at + SWAP * 0.75);
}

let t = 0;
flavors.forEach((f, fi) => {
  const n = f.F.screens.length;
  for (let i = 0; i < n; i++) {
    rests.push([t, t + HOLD]);
    t += HOLD;
    if (i < n - 1) { segment(f, i, t); t += SEG; }
  }
  if (fi < flavors.length - 1) { swap(f, flavors[fi + 1], t); t += SWAP; }
});
tl.set({}, {}, t); // фиксируем длину
const TOTAL = t;

/* =========================================================
   анимации: парение, курсор, интро
   ========================================================= */
function setupIdle() {
  if (reduceMotion) return;
  const all = flavors.flatMap((f) => f.els);
  all.forEach(({ fl }, i) => {
    const amp = 8 + (i % 3) * 5;
    gsap.to(fl, { y: amp, duration: 2.6 + (i % 4) * 0.55, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -i * 0.7 });
    gsap.to(fl, { rotation: (i % 2 ? 1 : -1) * (2 + (i % 3)), duration: 3.4 + (i % 3) * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -i * 0.4 });
  });
  const movers = all.map(({ par, e }) => ({
    x: gsap.quickTo(par, 'x', { duration: 0.9, ease: 'power3.out' }),
    y: gsap.quickTo(par, 'y', { duration: 0.9, ease: 'power3.out' }),
    d: e.depth ?? 1,
  }));
  addEventListener('pointermove', () => {
    movers.forEach((m) => { m.x(-pointer.x * 22 * m.d); m.y(-pointer.y * 16 * m.d); });
  });
}

function playIntro() {
  const f = flavors[0], s1 = f.screens[0];
  const itl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  itl.to('#loader', { opacity: 0, duration: 0.5, onComplete: () => $('#loader').classList.add('done') });
  itl.fromTo(intro, { k: 0 }, { k: 1, duration: 1.6, ease: 'expo.out' }, 0.1);
  itl.from(f.els.filter((x) => x.e.states[0]).map((x) => x.par), { scale: 0.4, opacity: 0, duration: 1.2, stagger: 0.06, ease: 'back.out(1.6)' }, 0.25);
  itl.from(s1.block.querySelectorAll('.line > span'), { yPercent: 110, duration: 1, stagger: 0.07 }, 0.3);
  itl.from([s1.block.querySelector('.btn'), ...$('#header').children], { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.6);
  itl.from(s1.extras, { opacity: 0, duration: 0.8 }, 0.9);
}

/* =========================================================
   скролл
   ========================================================= */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);
$('#scene').style.height = `${TOTAL * UNIT_VH + 100}vh`;

const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); render(); });
gsap.ticker.lagSmoothing(0);

let st;
function setupScroll() {
  st = ScrollTrigger.create({
    trigger: '#scene', start: 'top top', end: 'bottom bottom',
    scrub: 0.9, animation: tl,
    onUpdate: (self) => {
      // активный экран — ближайшая «пауза»
      const time = self.progress * TOTAL;
      let best = 0, bd = Infinity;
      rests.forEach(([a, b], i) => { const d = time < a ? a - time : time > b ? time - b : 0; if (d < bd) { bd = d; best = i; } });
      dots.forEach((d, i) => d.classList.toggle('on', i === best));
    },
  });
  dots[0].classList.add('on');
}

// «Выбрать вкус» — прокрутка к первому экрану другого вкуса
const timeToScroll = (time) => st.start + (time / TOTAL) * (st.end - st.start);
$('#flavorBtn').addEventListener('click', () => {
  const pistStart = rests[FLAVORS[0].screens.length][0];
  const target = (st.progress * TOTAL) < pistStart - 0.1 ? pistStart + HOLD / 2 : rests[0][0];
  lenis.scrollTo(timeToScroll(target), { duration: 2.4, easing: (x) => 1 - Math.pow(1 - x, 3) });
});
dots.forEach((d, i) => {
  d.style.pointerEvents = 'auto'; d.style.cursor = 'pointer';
  d.addEventListener('click', () => lenis.scrollTo(timeToScroll(rests[i][0] + HOLD / 2), { duration: 1.8 }));
});

if (DEBUG) Object.assign(window, { __dbg: { THREE, scene, camera, packs, renderer, tl, TOTAL, rests }, __lenis: lenis });

/* =========================================================
   старт
   ========================================================= */
const bar = $('#loader span');
bar.style.setProperty('--p', 0.3);
Promise.all([loadPacks(), document.fonts.ready]).then(() => {
  bar.style.setProperty('--p', 1);
  setupScroll();
  setupIdle();
  playIntro();
}).catch((err) => {
  console.error(err);
  $('#loader').classList.add('done');
});

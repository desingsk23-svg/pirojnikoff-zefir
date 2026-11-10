// Все координаты — в системе макета 1920×1080 (Figma, «задание 3»).
//
// Элемент вкуса:
//   clip  — размер видимого окна картинки [w, h] (при scale = 1)
//   img / pos / cover — картинка и её положение внутри окна (px или %)
//   layer — 'back' (за пачкой) или 'front' (перед пачкой)
//   states — положение на экранах 1, 2, 3: { c: [x, y], rot, scale, blur } или null (элемента нет)
//   off   — куда улетает / откуда прилетает, когда элемента нет на соседнем экране
//   depth — насколько сильно реагирует на курсор и параллакс при смене вкуса
//
// Пачка: states — центр, высота пачки в px макета, roll — наклон в плоскости экрана (°, + вправо),
//   yaw — поворот вокруг вертикали (рад), pitch — наклон к зрителю.

const TAU = Math.PI * 2;

const choc = {
  a: { img: 'chocolate.png', clip: [241.482, 159.385], pos: ['-206.57%', '-34.19%', '337.56%', '511.43%'] },
  b: { img: 'chocolate.png', clip: [239.476, 200.071], pos: ['-36.46%', '-212.47%', '255.88%', '306.28%'] },
  c: { img: 'chocolate.png', clip: [178.062, 122.99], pos: ['-37.04%', '-406.47%', '498.44%', '721.63%'] },
};
// кусочек фисташки из спрайта: в Figma заливка отражена по вертикали
const pistPiece = { img: 'pist-pieces.png', clip: [207.43, 297.434], flipY: true, imgFlip: true, pos: ['16.62%', '-176.35%', '225.6%', '264.98%'] };
const strawberry = 'strawberry.png';

export const FLAVORS = [
  {
    key: 'strawberry',
    name: 'Клубника со сливками',
    wrap: 'assets/wrap-strawberry.webp',
    bg: 'assets/bg-strawberry.jpg',
    logo: 'assets/logo-strawberry.svg',
    theme: { ink: '#5a252d', soft: '#80525a', line: 'rgba(90,37,45,.18)', border: 'rgba(90,37,45,.35)', cta: '#5a252d', ctaText: '#fff8ee', base: '#f78aa0' },
    seal: '#d81f3c',
    pack: [
      { c: [1290, 520], h: 760, roll: 13.6, yaw: -0.3, pitch: 0.06 },     // чуть вправо
      { c: [1282, 560], h: 810, roll: -4, yaw: TAU + 0.04, pitch: -0.03 }, // почти лицом, крупнее
      { c: [1188, 566], h: 640, roll: -22.8, yaw: TAU + 0.38, pitch: 0.03 }, // чуть влево, мельче
    ],
    screens: [
      {
        title: 'Клубника<br>со сливками',
        text: 'Воздушный зефир в шоколадной глазури.<br>Для маленьких пауз с большим удовольствием.',
        marker: 'Маленький ритуал удовольствия',
        callouts: [
          { x: 740, y: 220, w: 230, size: 14, lh: 20, html: 'НАТУРАЛЬНЫЙ<br>КЛУБНИЧНЫЙ СОК' },
          { x: 1620, y: 784, w: 280, size: 14, lh: 20, html: 'ГЛАЗУРЬ С НАТУРАЛЬНЫМ<br>КАКАО-ПОРОШКОМ' },
        ],
        leaders: [
          { src: 'assets/leader-s1.svg', x: 930, y: 266, w: 110, h: 78 },
          { src: 'assets/anchor.svg', x: 1037, y: 341, w: 6, h: 6 },
          { src: 'assets/leader-s2.svg', x: 1546, y: 750, w: 60, h: 54 },
          { src: 'assets/anchor.svg', x: 1543, y: 747, w: 6, h: 6 },
        ],
      },
      {
        title: 'Всё лучше<br>в шоколаде.',
        text: 'За шоколадной глазурью — мягкий зефир<br>с клубничным соком и сливками.',
      },
      {
        title: 'Лето. Сливки.<br>И немного магии.',
        text: 'Клубничная нежность, сливочные ноты<br>и шоколадная глазурь. Ваша сладкая пауза.',
        detail: { title: 'Внутри -<br>нежность', text: 'Воздушная текстура зефира<br>с натуральным клубничным соком.', weight: '210 г' },
      },
    ],
    elements: [
      { id: 'milk', layer: 'back', img: 'milk.png', clip: [1122.2, 1122.2], cover: true, depth: 0.3,
        states: [{ c: [1186.39, 542.94], rot: 10.92 }, null, null], off: { scale: 1.3 } },
      { id: 'half', layer: 'back', img: strawberry, clip: [169.402, 190.585], pos: [-190.59, 0, 571.755, 381.17], depth: 0.6,
        states: [{ c: [970.84, 379.45], rot: -68, blur: 0.756 }, { c: [903.08, 4.23], rot: -68, blur: 0.756 }, { c: [903.08, 4.23], rot: -60, blur: 0.756 }] },
      { id: 'berryBig', layer: 'front', img: strawberry, clip: [299.342, 324.17], pos: [0, 0, 1003.098, 668.732], depth: 1,
        states: [{ c: [1640.5, 595.65], rot: 13.56 }, { c: [1677.49, 1002.65], rot: 2.19 }, { c: [1677.49, 1002.65], rot: -6 }] },
      { id: 'berryBlur', layer: 'front', img: strawberry, clip: [231.08, 250.246], pos: [0, 0, 774.352, 516.234], depth: 1.4,
        states: [{ c: [804.8, 762.98], rot: 27.05, blur: 11.579 }, { c: [497.8, 210.98], rot: 27.05, blur: 11.579 }, { c: [497.8, 210.98], rot: 36, blur: 11.579 }] },
      { id: 'choc1', layer: 'front', ...choc.a, depth: 1.3, off: { dx: -520, dy: -160, rot: -40 },
        states: [null, { c: [632.53, 364.96], rot: 26.55, blur: 15 }, null] },
      { id: 'choc2', layer: 'front', ...choc.b, depth: 1.1, off: { dx: -380, dy: 420, rot: 50 },
        states: [null, { c: [790.99, 817.52], rot: 99.68 }, null] },
      { id: 'choc3', layer: 'front', ...choc.c, depth: 0.8, off: { dx: 460, dy: -260, rot: 60 },
        states: [null, { c: [1638.15, 315.8], rot: 110.23 }, null] },
    ],
  },

  {
    key: 'pistachio',
    name: 'Фисташка в шоколаде',
    wrap: 'assets/wrap-pistachio.webp',
    bg: 'assets/bg-pistachio.jpg',
    logo: 'assets/logo-pistachio.svg',
    theme: { ink: '#334524', soft: '#334524', line: 'rgba(51,69,36,.18)', border: 'rgba(51,69,36,.35)', cta: '#334524', ctaText: '#fff8ee', base: '#dfe6b8' },
    seal: '#1f7a33',
    pack: [
      { c: [1360, 530], h: 760, roll: 8, yaw: -0.3, pitch: 0.06 },
      { c: [1272, 560], h: 810, roll: -5, yaw: TAU + 0.04, pitch: -0.03 },
      { c: [1150, 540], h: 650, roll: -20.2, yaw: TAU + 0.38, pitch: 0.03 },
    ],
    screens: [
      {
        title: 'Фисташка<br>в шоколаде',
        text: 'Воздушный зефир с фисташковыми нотами.<br>Нежный вкус для неспешного удовольствия.',
        marker: 'Момент для себя',
        callouts: [
          { x: 816, y: 276, w: 260, size: 14, lh: 20, html: 'ЯБЛОЧНОЕ ПЮРЕ<br>И ПЕКТИН В СОСТАВЕ' },
          { x: 1618, y: 659, w: 195, size: 12, lh: 18, html: 'ГЛАЗУРЬ С НАТУРАЛЬНЫМ<br>КАКАО-ПОРОШКОМ' },
        ],
        leaders: [
          { src: 'assets/leader-p1.svg', x: 1006, y: 322, w: 110, h: 78 },
          { src: 'assets/anchor.svg', x: 1116, y: 400, w: 6, h: 6 },
          { src: 'assets/leader-p2.svg', x: 1573, y: 647, w: 42, h: 18 },
          { src: 'assets/anchor.svg', x: 1570, y: 644, w: 6, h: 6 },
        ],
      },
      {
        title: 'Всё лучше<br>в шоколаде.',
        text: 'Шоколадная глазурь и фисташковые ноты —<br>сочетание, к которому хочется вернуться.',
      },
      {
        title: 'Тонкий вкус.<br>Яркий момент.',
        text: 'Мягкая текстура и ореховые ноты.<br>Насладитесь вкусом без спешки.',
        detail: { title: 'Внутри —<br>нежность', text: 'Воздушный зефир<br>с фисташковыми нотами.', weight: '210 г' },
      },
    ],
    elements: [
      { id: 'pieceA', layer: 'back', ...pistPiece, depth: 0.7,
        states: [{ c: [980.87, 462.75], rot: 86.44, blur: 10 }, { c: [910.61, 666.03], rot: 86.44, blur: 11.7, scale: 1.1727 }, { c: [639.87, 317.75], rot: 86.44, blur: 10 }] },
      { id: 'pieceB', layer: 'back', ...pistPiece, depth: 0.6, off: { dx: 120, dy: 380, rot: 40 },
        states: [{ c: [1286.77, 1093.93], rot: 166.4, blur: 10 }, null, null] },
      { id: 'shell', layer: 'back', img: 'pist-shell.png', clip: [161.249, 142.326], cover: true, depth: 0.5, off: { dx: 520, dy: -120, rot: 60 },
        states: [{ c: [1667.39, 534.06], rot: 13.56, blur: 7.6 }, null, null] },
      { id: 'kernels', layer: 'back', img: 'pist-kernels.png', clip: [124.505, 135.716], cover: true, depth: 0.6, off: { dx: 380, dy: -260, rot: 50 },
        states: [{ c: [991.46, 144.5], rot: -157.53 }, { c: [1675.82, 258.86], rot: -80.84, blur: 10, scale: 1.285 }, null] },
      { id: 'leaf', layer: 'back', img: 'pist-leaf.png', clip: [323.91, 191.155], cover: true, depth: 0.5, off: { dx: 420, dy: 260, rot: -60 },
        states: [null, { c: [1631.97, 662.21], rot: -71.06 }, { c: [1013.06, 214.54], rot: -160.16, scale: 0.7147 }] },
      { id: 'open', layer: 'front', img: 'pist-open.png', clip: [210, 183.299], cover: true, depth: 1.4, off: { dx: -420, dy: 320, rot: -50 },
        states: [{ c: [676.77, 813.76], rot: -35.8, blur: 11.579 }, null, { c: [1601.91, 825.92], rot: -29.3, scale: 0.8789 }] },
      { id: 'pieceC', layer: 'front', img: 'pist-pieces.png', clip: [365.316, 176.531], pos: [0, '-140.99%', '116.08%', '404.59%'], depth: 1.1, off: { dx: -560, dy: 80, rot: -80 },
        states: [{ c: [996.38, 631.92], rot: 121.33 }, null, null] },
      { id: 'shell2', layer: 'front', img: 'pist-shell.png', clip: [230, 203.008], cover: true, depth: 1.4, off: { dx: -380, dy: -300, rot: -70 },
        states: [null, { c: [580.48, 166.11], rot: -55.97, blur: 11.579 }, null] },
      { id: 'kernels3', layer: 'front', img: 'pist-kernels.png', clip: [133.103, 145.089], cover: true, depth: 1.2, off: { dx: -300, dy: 360, rot: -60 },
        states: [null, null, { c: [889.64, 854.84], rot: 88.16, blur: 1.188 }] },
      { id: 'chocA', layer: 'front', ...choc.a, depth: 1.3, off: { dx: -520, dy: -160, rot: -40 },
        states: [null, { c: [775.63, 411.25], rot: 26.55, blur: 15 }, null] },
      { id: 'chocC', layer: 'front', ...choc.c, depth: 1.1, off: { dx: -380, dy: 360, rot: 50 },
        states: [null, { c: [585.49, 939.81], rot: 110.23 }, null] },
      { id: 'chocB', layer: 'front', ...choc.b, depth: 0.8, off: { dx: 460, dy: -260, rot: 60 },
        states: [null, { c: [1695.75, 370.85], rot: 99.68 }, { c: [760, 6], rot: 112 }] }, // правее логотипа
      { id: 'chocB2', layer: 'front', ...choc.b, depth: 1, off: { dx: 200, dy: 420, rot: 70 },
        states: [null, null, { c: [1422.6, 1025.76], rot: 99.68, scale: 0.7546 }] },
    ],
  },
];

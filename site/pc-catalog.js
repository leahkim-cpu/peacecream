/* PeaceCream ready-made gift desserts.
 * These are FIXED products: flavor, recipe and look never change and they never enter the ice-cream customizer.
 * Ice cream is not sold or gifted here.
 *
 * PHOTOS: each product has `photo: null` until a real photograph is added.
 * To add one, put the image in assets/products/ (e.g. assets/products/love-cake.webp, about 1200x1200,
 * soft pastel background like the ice-cream photos) and set `photo: 'assets/products/love-cake.webp'` below.
 * Until then the card shows an illustration with a small "Photo coming soon" label — never a broken image.
 *
 * PRICES are sample prices (USD) for the demo shop; real ordering is not connected yet. */
(function (root) {
  'use strict';
  const CURRENCY = 'USD';
  const TYPES = [
    { id: 'cake', name: 'Cakes', tagline: 'A Slice of Peace', bg: '#f8dde3' },
    { id: 'macaron', name: 'Macarons', tagline: 'Colors of Peace', bg: '#e9def5' },
    { id: 'cookie', name: 'Cookies', tagline: 'Little Moments of Peace', bg: '#f7e6cc' },
    { id: 'donut', name: 'Donuts', tagline: 'Circle of Happiness', bg: '#fbe3cf' },
    { id: 'mochi', name: 'Mochi', tagline: 'Softness of Peace', bg: '#e3f0dc' },
    { id: 'cupcake', name: 'Cupcakes', tagline: 'Share Your Peace', bg: '#dceaf4' }
  ];
  // [id, type, name, flavor, meaning, line, price, unit, colors{a: main, b: second, c: accent}, signature]
  const P = (id, type, name, flavor, meaning, line, price, unit, a, b, c, signature) => ({ id, type, name, flavor, meaning, line, price, unit, colors: { a, b, c }, signature: !!signature, photo: null });
  const PRODUCTS = [
    P('love-cake', 'cake', 'Love Cake', 'Strawberry & vanilla', 'Love', 'Love grows a little every time we share it.', 9.5, 'Two slices', '#f6c3cf', '#fff3e0', '#e05a77', 1),
    P('strawberry-harmony', 'cake', 'Strawberry Harmony', 'Strawberry & vanilla', 'Connection & harmony', 'A little sweetness brings us closer.', 8.5, 'One slice', '#f9d3da', '#fff6e8', '#d9455f'),
    P('matcha-serenity', 'cake', 'Matcha Serenity', 'Matcha & white chocolate', 'Inner calm', 'Take a breath. There is room for a quiet moment.', 8.5, 'One slice', '#cfe0b0', '#fffaf0', '#7f9a55'),
    P('chocolate-comfort', 'cake', 'Chocolate Comfort', 'Rich chocolate', 'Warmth & comfort', 'A little comfort, whenever you need it.', 8.5, 'One slice', '#a8775f', '#f3dccb', '#6b3b2a'),

    P('harmony-macaron', 'macaron', 'Harmony Macaron', 'Lavender & vanilla', 'Harmony', 'Different colors and flavors can come together beautifully.', 12, 'Box of six', '#d8c6ef', '#fff3dc', '#b9a2e0', 1),
    P('lavender-dream', 'macaron', 'Lavender Dream', 'Lavender', 'Relaxation & tranquility', 'Let a quiet moment belong to you.', 11, 'Box of six', '#cdb9ea', '#f4ecfb', '#9f86cf'),
    P('rose-kindness', 'macaron', 'Rose Kindness', 'Rose & raspberry', 'Love & compassion', 'A small act of care can brighten a day.', 11, 'Box of six', '#f5b8c7', '#fde8ee', '#d9667f'),
    P('pistachio-unity', 'macaron', 'Pistachio Unity', 'Pistachio', 'Accepting differences', 'Different tastes. A place for everyone.', 11, 'Box of six', '#c9dcaa', '#f6f2df', '#8aa865'),

    P('kindness-cookie', 'cookie', 'Kindness Cookie', 'Chocolate chip', 'Kindness', 'Sometimes, a small act of kindness can make someone’s whole day.', 4.5, 'One big cookie', '#e8b97c', '#f6d9a8', '#5a3424', 1),
    P('chocolate-chip-joy', 'cookie', 'Chocolate Chip Joy', 'Chocolate chip', 'Everyday happiness', 'There is joy in the little things.', 4, 'One cookie', '#e5b477', '#f3d39c', '#4f2c1f'),
    P('honey-butter-hug', 'cookie', 'Honey Butter Hug', 'Honey & butter', 'Kindness & warmth', 'Send someone a little sweetness and a warm thought.', 4, 'One cookie', '#f0c77f', '#fae5b3', '#c98a2b'),
    P('matcha-balance', 'cookie', 'Matcha Balance', 'Matcha', 'Emotional balance', 'Slow down and find your own rhythm.', 4, 'One cookie', '#bfd49a', '#e6efcf', '#f6f0dc'),

    P('unity-donut', 'donut', 'Unity Donut', 'Honey glaze', 'Unity', 'A circle has room for everyone.', 4.5, 'One donut', '#e9b56a', '#f8d991', '#fff3cf', 1),
    P('vanilla-together', 'donut', 'Vanilla Together', 'Vanilla glaze', 'Connection & belonging', 'There is always room for one more at the table.', 4, 'One donut', '#e3b071', '#fff6e2', '#f5c3cf'),
    P('strawberry-smile', 'donut', 'Strawberry Smile', 'Strawberry', 'Sharing happiness', 'A smile grows sweeter when you share it.', 4, 'One donut', '#e3b071', '#f7b3c3', '#fff'),
    P('caramel-sunshine', 'donut', 'Caramel Sunshine', 'Salted caramel', 'Hope & positivity', 'A little sunshine for the days ahead.', 4, 'One donut', '#e3b071', '#d99a55', '#fff1d6'),

    P('comfort-mochi', 'mochi', 'Comfort Mochi', 'Matcha & red bean', 'Comfort', 'Soft, warm and here for you, whenever you need it.', 7, 'Set of three', '#cfe2b5', '#fbf6ee', '#7d3b3b', 1),
    P('sakura-hope', 'mochi', 'Sakura Hope', 'Sakura bean paste', 'New beginnings', 'Every new beginning starts with a little hope.', 6.5, 'Set of three', '#f8d3dc', '#fff4f6', '#e58aa0'),
    P('matcha-mindfulness', 'mochi', 'Matcha Mindfulness', 'Matcha', 'Living in the present', 'Be here, for one gentle moment.', 6.5, 'Set of three', '#c3dba4', '#eef5e2', '#7f9a55'),
    P('mango-sunshine', 'mochi', 'Mango Sunshine', 'Mango', 'Optimism & energy', 'Let a little brightness into your day.', 6.5, 'Set of three', '#fbd68a', '#fff6dc', '#f0a73c'),

    P('hope-cupcake', 'cupcake', 'Hope Cupcake', 'Vanilla & raspberry', 'Hope', 'A little sweetness for the brighter days ahead.', 5, 'One cupcake', '#fff1dc', '#f2a3b7', '#d64b6a', 1),
    P('vanilla-love', 'cupcake', 'Vanilla Love', 'Vanilla', 'Love & appreciation', 'For someone who makes your world a little sweeter.', 4.5, 'One cupcake', '#fff5e4', '#f4d9a8', '#f3a6b8'),
    P('blueberry-freedom', 'cupcake', 'Blueberry Freedom', 'Blueberry', 'Individuality & freedom', 'There is sweetness in being yourself.', 4.5, 'One cupcake', '#d5d3f2', '#f4d9a8', '#5b5fb3'),
    P('lemon-brightness', 'cupcake', 'Lemon Brightness', 'Lemon', 'New possibilities', 'Here is to the possibilities still ahead.', 4.5, 'One cupcake', '#fbeeaa', '#f4d9a8', '#e8c33b')
  ];
  /* Real photographs in assets/products/: one per product, showing its own fixed flavor. [file, width, height] */
  const PHOTOS = {
    'love-cake': ['love-cake-heart-v2.webp', 1254, 1254],
    'strawberry-harmony': ['strawberry-harmony.webp', 918, 928],
    'matcha-serenity': ['matcha-serenity.webp', 924, 884],
    'chocolate-comfort': ['chocolate-comfort.jpg', 926, 914],
    'harmony-macaron': ['macaron.webp', 634, 618],
    'lavender-dream': ['lavender-dream.webp', 930, 862],
    'rose-kindness': ['rose-kindness.webp', 912, 912],
    'pistachio-unity': ['pistachio-unity.webp', 920, 848],
    'kindness-cookie': ['cookie.webp', 682, 638],
    'chocolate-chip-joy': ['chocolate-chip-joy.webp', 946, 878],
    'honey-butter-hug': ['honey-butter-hug.webp', 944, 872],
    'matcha-balance': ['matcha-balance.webp', 944, 844],
    'unity-donut': ['donut.webp', 680, 650],
    'vanilla-together': ['vanilla-together.webp', 928, 880],
    'strawberry-smile': ['strawberry-smile.webp', 942, 898],
    'caramel-sunshine': ['caramel-sunshine.webp', 914, 868],
    'comfort-mochi': ['mochi.webp', 680, 664],
    'sakura-hope': ['sakura-hope.webp', 946, 894],
    'matcha-mindfulness': ['matcha-mindfulness.webp', 920, 860],
    'mango-sunshine': ['mango-sunshine.webp', 934, 832],
    'hope-cupcake': ['cupcake.webp', 676, 668],
    'vanilla-love': ['vanilla-love.webp', 938, 894],
    'blueberry-freedom': ['blueberry-freedom.webp', 928, 904],
    'lemon-brightness': ['lemon-brightness.webp', 948, 922]
  };
  PRODUCTS.forEach(p => { const ph = PHOTOS[p.id]; if (ph) { p.photo = 'assets/products/' + ph[0]; p.photoSize = [ph[1], ph[2]]; } });
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const typeOf = id => TYPES.find(t => t.id === id);

  /* ---------- Illustrations ----------
   * Soft hand-drawn style. Every dessert has a <g class="pc-piece"> — the little piece that
   * separates and turns into a heart in the gift animation. */
  const INK = '#612335';
  const sw = 'stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"';
  const face = (x, y, s) => `<g class="pc-face" transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-9 0 q3 3 6 0 M3 0 q3 3 6 0" fill="none" ${sw}/><path d="M-3 6 q3 3 6 0" fill="none" ${sw}/><ellipse cx="-13" cy="5" rx="3.5" ry="2" fill="#f19aae" opacity=".7"/><ellipse cx="13" cy="5" rx="3.5" ry="2" fill="#f19aae" opacity=".7"/></g>`;
  const DRAW = {
    cake: c => `<ellipse cx="100" cy="166" rx="78" ry="10" fill="#000" opacity=".06"/>
      <path d="M30 92 h110 v66 h-110 z" fill="${c.b}" ${sw}/><path d="M30 112 h110 M30 134 h110" stroke="${c.a}" stroke-width="9"/>
      <path d="M26 92 q8 -16 22 -10 q10 -14 24 -4 q12 -12 26 -2 q12 -10 24 0 q12 -8 20 8 q4 8 -4 14 h-108 q-8 -2 -4 -6z" fill="${c.a}" ${sw}/>
      <g transform="translate(60 52)"><path d="M10 26 q-14 -12 -6 -24 q6 -6 6 2 q0 -8 6 -2 q8 12 -6 24z" fill="${c.c}" ${sw}/><path d="M6 4 q4 -6 8 0" fill="#6a9a4a"/></g>
      ${face(85, 132)}
      <g class="pc-piece"><path d="M142 92 h28 v66 h-28 z" fill="${c.b}" ${sw}/><path d="M142 112 h28 M142 134 h28" stroke="${c.a}" stroke-width="9"/><path d="M140 92 q10 -14 24 -6 q8 4 6 6z" fill="${c.a}" ${sw}/></g>`,
    macaron: c => {
      const m = (y, col, cls) => `<g class="${cls || ''}" transform="translate(100 ${y})"><path d="M-46 0 q0 -22 46 -22 q46 0 46 22 z" fill="${col}" ${sw}/><path d="M-44 2 h88" stroke="${c.b}" stroke-width="9" stroke-linecap="round"/><path d="M-46 6 q0 18 46 18 q46 0 46 -18 z" fill="${col}" ${sw}/><path d="M-40 4 l3 2 l3 -2 l3 2 l3 -2 l3 2" fill="none" stroke="${INK}" stroke-width="1" opacity=".4"/></g>`;
      return `<ellipse cx="100" cy="176" rx="66" ry="9" fill="#000" opacity=".06"/>${m(150, c.a)}${m(112, c.c)}${face(100, 160, .9)}<g class="pc-piece">${m(74, c.a)}</g>`;
    },
    cookie: c => `<ellipse cx="100" cy="170" rx="70" ry="10" fill="#000" opacity=".06"/>
      <path d="M100 32 C150 32 172 66 168 104 C164 140 134 166 100 166 C58 166 30 138 32 100 C34 72 48 50 70 40 L92 66 L112 52 Z" fill="${c.a}" ${sw}/>
      ${[[70, 90], [126, 84], [96, 120], [140, 120], [60, 128], [110, 148], [80, 66]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="5" fill="${c.c}"/>`).join('')}
      ${face(100, 100)}
      <g class="pc-piece"><path d="M72 38 L92 64 L112 50 Q96 30 72 38 Z" fill="${c.a}" ${sw}/><ellipse cx="94" cy="44" rx="4" ry="3.4" fill="${c.c}"/></g>`,
    donut: c => {
      const ring = 'M100 40 a60 60 0 1 0 .1 0 Z M100 78 a22 22 0 1 1 -.1 0 Z';
      const dots = [[60, 70], [140, 72], [52, 118], [146, 120], [96, 154], [120, 150], [72, 148], [128, 96]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="9" height="3.4" rx="1.7" fill="${['#f39ab0', '#9ccbe8', '#f6d36b', '#b5d68f', '#c7a7ea'][i % 5]}" transform="rotate(${i * 41} ${x} ${y})"/>`).join('');
      return `<ellipse cx="100" cy="170" rx="66" ry="9" fill="#000" opacity=".06"/>
        <path d="${ring}" fill="${c.a}" fill-rule="evenodd" ${sw}/>
        <path d="M100 48 q38 -2 50 30 q8 26 -6 46 q-6 10 -14 4 q-8 -10 -16 0 q-10 10 -20 0 q-10 -8 -20 2 q-12 6 -16 -8 q-14 -26 6 -50 q14 -22 36 -24z M100 78 a22 22 0 1 0 .1 0z" fill="${c.b}" fill-rule="evenodd" ${sw}/>${dots}
        ${face(100, 136, .8)}
        <g class="pc-piece"><path d="M150 64 q14 14 10 36 l-20 -4 q2 -12 -6 -20 z" fill="${c.a}" ${sw}/><path d="M150 66 q10 10 8 26 l-14 -2 q0 -10 -6 -16z" fill="${c.b}"/></g>`;
    },
    mochi: c => {
      const ball = (x, y, col, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 18 q-6 -40 30 -42 q36 2 30 42 q-30 8 -60 0z" fill="${col}" ${sw}/><ellipse cx="-12" cy="-14" rx="8" ry="4" fill="#fff" opacity=".6"/></g>`;
      return `<ellipse cx="100" cy="166" rx="80" ry="10" fill="#000" opacity=".06"/><path d="M24 158 h152" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
        ${ball(66, 136, c.a, 1)}${ball(134, 136, c.b, 1)}${face(66, 140, .8)}${face(134, 140, .8)}
        <g class="pc-piece">${ball(100, 98, c.a, .9)}<circle cx="100" cy="102" r="6" fill="${c.c}" opacity=".8"/></g>`;
    },
    cupcake: c => `<ellipse cx="100" cy="172" rx="56" ry="9" fill="#000" opacity=".06"/>
      <path d="M52 104 h96 l-12 64 h-72 z" fill="${c.b}" ${sw}/><path d="M68 106 l6 60 M88 106 l2 62 M110 106 l-2 62 M130 106 l-6 60" stroke="${INK}" stroke-width="1.4" opacity=".35"/>
      <path d="M46 106 q-6 -22 18 -26 q-2 -22 24 -22 q22 -6 30 10 q26 -2 26 20 q16 8 6 18 z" fill="${c.a}" ${sw}/>
      ${face(100, 136, .85)}
      <g class="pc-piece"><path d="M78 62 q-2 -26 22 -28 q24 2 22 28 q-22 8 -44 0z" fill="${c.a}" ${sw}/><circle cx="100" cy="28" r="8" fill="${c.c}" ${sw}/><path d="M100 20 q4 -10 10 -12" fill="none" ${sw}/></g>`
  };
  /** SVG markup for a product (or a type with default colors). */
  function dessertSVG(productOrType, opts) {
    const p = typeof productOrType === 'string' ? PRODUCTS.find(x => x.type === productOrType && x.signature) : productOrType;
    const o = opts || {};
    return `<svg class="pc-dessert ${o.className || ''}" viewBox="0 0 200 190" ${o.size ? `width="${o.size}" height="${o.size * .95}"` : ''} aria-hidden="true" focusable="false">${DRAW[p.type](p.colors)}</svg>`;
  }
  const heartPath = 'M50 86 C20 64 4 46 4 28 C4 14 15 4 28 4 C38 4 46 10 50 18 C54 10 62 4 72 4 C85 4 96 14 96 28 C96 46 80 64 50 86 Z';

  root.PeaceCatalog = { PHOTOS, CURRENCY, TYPES, PRODUCTS, byId, typeOf, dessertSVG, heartPath };
})(window);

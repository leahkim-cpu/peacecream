// Builds data/world-paths.json (projected SVG paths) from tools/countries-110m.json.
// Source data: world-atlas@2.0.2 (Natural Earth 1:110m, public domain).
// Usage: npm i d3-geo@3.1.1 topojson-client@3.1.0 i18n-iso-countries@7.14.0 (in any folder), then
//   NODE_PATH=<that folder>/node_modules node tools/build-map.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(process.env.NODE_PATH ? path.join(process.env.NODE_PATH, 'x.js') : import.meta.url);
const { geoNaturalEarth1, geoPath, geoArea } = require('d3-geo');
const { feature } = require('topojson-client');
const iso = require('i18n-iso-countries');
// Neutral names (CLDR style) where the package uses politically loaded wording, plus places without ISO codes.
const OVERRIDES = {
  TW: { zh: '台湾', ja: '台湾' },
  CN: { ja: '中国' }, KP: { ja: '北朝鮮' }, KR: { ja: '韓国', zh: '韩国' }, US: { ja: 'アメリカ' }, GB: { ja: 'イギリス' },
  BO: { ja: 'ボリビア' }, BN: { ja: 'ブルネイ' }, IR: { ja: 'イラン' }, LA: { ja: 'ラオス' }, SY: { ja: 'シリア' }, VE: { ja: 'ベネズエラ' },
  RU: { ja: 'ロシア' }, VN: { ja: 'ベトナム' }, FK: { ja: 'フォークランド諸島' }, EH: { zh: '西撒哈拉' },
  kosovo: { en: 'Kosovo', ja: 'コソボ', zh: '科索沃', alpha2: 'XK' },
  'n-cyprus': { en: 'N. Cyprus', ja: '北キプロス', zh: '北塞浦路斯' },
  somaliland: { en: 'Somaliland', ja: 'ソマリランド', zh: '索马里兰' }
};

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const topo = JSON.parse(readFileSync(path.join(root, 'tools/countries-110m.json'), 'utf8'));
const WIDTH = 1000, HEIGHT = 520;
const world = feature(topo, topo.objects.countries);
const features = world.features.filter(f => f.properties.name !== 'Antarctica');
const projection = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, HEIGHT - 8]], { type: 'FeatureCollection', features });
const pathGen = geoPath(projection).digits(1);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function largestPart(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const parts = f.geometry.coordinates.map(c => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: c } }));
  return parts.sort((a, b) => geoArea(b) - geoArea(a))[0];
}

const countries = features.map(f => {
  const [cx, cy] = pathGen.centroid(largestPart(f)).map(n => Math.round(n * 10) / 10);
  const code = f.id || slug(f.properties.name);
  const alpha2 = f.id ? iso.numericToAlpha2(f.id) : (OVERRIDES[code] || {}).alpha2;
  const o = OVERRIDES[alpha2] || OVERRIDES[code] || {};
  const names = {
    en: f.properties.name,
    ja: o.ja || (alpha2 && iso.getName(alpha2, 'ja')) || f.properties.name,
    zh: o.zh || (alpha2 && iso.getName(alpha2, 'zh')) || f.properties.name
  };
  return { code, alpha2: alpha2 || null, name: f.properties.name, names, d: pathGen(f), cx, cy };
}).sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(path.join(root, 'data/world-paths.json'), JSON.stringify({ width: WIDTH, height: HEIGHT, source: 'Natural Earth via world-atlas@2.0.2', countries }));
console.log(`wrote ${countries.length} countries`);

// Model sheet (?test=model): both children in their key poses and expressions, plus the props
import { layer, clear, text, CAM } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { kid, ball, kite, butterfly } from './chars.js';
import { PAL } from './pal.js';
const K = PAL.crayon;
const G = group(), T = layer();
export const POSES = {
  stand: {},
  wave: { armR: 2.3, elR: 0.5 },
  run1: { armL: 0.9, armR: -0.6, legL: 0.5, legR: -0.4, knR: 0.6, lean: 0.12 },
  run2: { armL: -0.6, armR: 0.9, legL: -0.4, legR: 0.5, knL: 0.6, lean: 0.12 },
  danceA: { armL: 2.0, armR: 2.0, elL: 0.4, elR: 0.4, legL: 0.6, knL: 0.9 },
  danceB: { armL: 1.5, armR: 1.5, elL: -0.6, elR: -0.6, legR: 0.6, knR: 0.9 },
  sill: { armL: 2.6, armR: 2.6, elL: 0.6, elR: 0.6 },
};
export function sheet(comp, t, Q) {
  Object.assign(CAM, { x: 960, y: 540, s: 1 });
  clearGroup(G); clear(T);
  const row = [['stand', 'smile'], ['wave', 'open'], ['run1', 'joy'], ['danceA', 'open'], ['danceB', 'joy'], ['sill', 'wish']];
  row.forEach(([p, e], i) => kid(G, { who: 'mia', x: 170 + i * 300, y: 480, s: 1.15, expr: e, ...POSES[p] }));
  row.forEach(([p, e], i) => kid(G, { who: 'leo', x: 170 + i * 300, y: 900, s: 1.15, expr: i === 5 ? 'sad' : e, ...POSES[p], look: i === 5 ? [0.6, -1] : [0, 0] }));
  ball(G, 1720, 980, 40, 0.4);
  kite(G, 1780, 170, 0.15, null, t * 3);
  butterfly(G, 1700, 300, K.pink, true); butterfly(G, 1820, 330, K.violet, false, 720);
  text(T, 'Mia & Leo', 1870, 1060, { size: 40, col: K.ink, align: 'right' });
  comp.paperCam(960, 540, 1);
  comp.begin(); comp.group(G); comp.crayon(T.c); comp.finish({ vig: 0.25 });
}

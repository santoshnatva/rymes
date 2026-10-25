// The two children (Mia and Leo), the ball, the kite, butterflies. Parametric: pose angles × expression.
// Local origin = between the feet, y up is negative. One model, used in every shot.
import { line, fill, dab, ellipse, handCircle, xf, smooth } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
import { hash } from '/core/lib.js';
const K = PAL.crayon;
const LW = 7;
const lo = (seed, x = {}) => ({ w: LW, seed, ...x });
const skinF = seed => ({ col: K.peach, p: 0.55, gap: 9, w: 11, ang: 0.5, seed, over: 3 });

// arm / leg: from a joint, angle a measured from straight down, outward positive (side -1 = the character's right on screen-left)
function limb(j, side, a, bend, l1, l2) {
  const d1 = [side * Math.sin(a), Math.cos(a)], a2 = a + bend, d2 = [side * Math.sin(a2), Math.cos(a2)];
  const e = [j[0] + d1[0] * l1, j[1] + d1[1] * l1];
  return [j, e, [e[0] + d2[0] * l2, e[1] + d2[1] * l2]];
}

export const MODEL = {
  mia: { s: 1, hair: K.brown, body: K.red, shoe: K.violet, seed: 100 },
  leo: { s: 0.86, hair: K.orange, body: K.sky, shoe: K.brown, seed: 300 },
};

// o: who, x, y, s (extra scale), flip, armL, armR, elL, elR, legL, legR, knL, knR, lean, expr, look, hop, upper (true = draw only above the sill line)
export function kid(C, o) {
  const M = MODEL[o.who], s = (o.s ?? 1) * M.s, sd = M.seed + (o.seed || 0);
  const lean = o.lean || 0, k = o.flip ? -1 : 1;
  const T = pts => xf(pts, { x: o.x, y: o.y - (o.hop || 0), s, r: lean, sx: k });
  const hands = {};
  // —— legs (behind the body) ——
  const legs = [[-1, o.legL ?? 0.05, o.knL ?? 0], [1, o.legR ?? 0.05, o.knR ?? 0]];
  for (const [side, a, kn] of legs) {
    const L = limb([side * 20, -78], side, a, kn, 38, 38);
    part(C, T(tube(L, 19, 17)), skinF(sd + 10 + side), lo(sd + 12 + side));
    const f = L[2], fx = f[0] + side * 9;
    part(C, T(ellipse(fx, f[1] + 4, 22, 12, 20)), { col: M.shoe, p: 0.9, gap: 6, w: 8, seed: sd + 14 + side, over: 2 }, lo(sd + 16 + side));
  }
  // —— body ——
  if (o.who === 'mia') {
    const dress = smooth([[-24, -186], [24, -186], [40, -150], [64, -80], [30, -72], [0, -76], [-30, -72], [-64, -80], [-40, -150]], 5);
    part(C, T(dress), { col: M.body, p: 0.95, gap: 9, w: 11, ang: 0.4, seed: sd + 20, over: 4, cross: true, crossP: 0.5 }, lo(sd + 21));
    line(C.l, T([[-50, -96], [-25, -92], [0, -95], [25, -92], [50, -96]]), lo(sd + 22, { w: 4, p: 0.7 }));   // hem stitch
    [-1, 1].forEach(i => dab(C.f, ...T([[i * 18, -132]])[0], 6 * s, { col: K.yellow, seed: sd + 23 + i, p: 0.9 }));   // two yellow buttons
  } else {
    const jumper = smooth([[-30, -184], [30, -184], [38, -150], [38, -104], [0, -100], [-38, -104], [-38, -150]], 5);
    const shorts = [[-38, -108], [38, -108], [40, -74], [6, -72], [0, -86], [-6, -72], [-40, -74]];
    part(C, T(shorts), { col: K.violet, p: 0.95, gap: 8, w: 10, ang: 1.1, seed: sd + 24, over: 3 }, lo(sd + 25));
    part(C, T(jumper), { col: M.body, p: 0.95, gap: 9, w: 11, ang: 0.5, seed: sd + 20, over: 4, cross: true, crossP: 0.5 }, lo(sd + 21));
    line(C.f, T([[-36, -140], [36, -140]]), { col: K.yellow, w: 10, p: 0.95, seed: sd + 26, wob: 0.6 });   // a yellow stripe
  }
  // —— head ——
  const hc = [0, -246];
  const face = ellipse(hc[0], hc[1], 58, 54, 44);
  if (o.who === 'mia') {   // two bunches behind the face
    [-1, 1].forEach(i => { part(C, T(handCircle(hc[0] + i * 66, hc[1] - 6, 25, sd + 30 + i, 0, 26)), { col: M.hair, p: 0.95, gap: 7, w: 9, ang: 1.0, seed: sd + 32 + i, over: 2 }, lo(sd + 34 + i)); });
  }
  part(C, T(face), skinF(sd + 40), lo(sd + 41));
  if (o.who === 'mia') {
    const cap = smooth([[-62, -236], [-58, -282], [-30, -306], [0, -312], [30, -306], [58, -282], [62, -236], [48, -270], [26, -266], [4, -276], [-20, -266], [-44, -272]], 5);
    part(C, T(cap), { col: M.hair, p: 0.95, gap: 7, w: 9, ang: 1.1, seed: sd + 42, over: 2 }, lo(sd + 43));
    [-1, 1].forEach(i => dab(C.f, ...T([[i * 66, hc[1] - 36]])[0], 7 * s, { col: K.red, seed: sd + 44 + i, p: 1 }));   // red bobbles
  } else {
    const cap = [[-60, -236], [-64, -266], [-52, -296], [-44, -284], [-30, -316], [-16, -296], [0, -322], [14, -298], [30, -318], [40, -290], [54, -300], [62, -266], [60, -240], [42, -272], [16, -268], [-10, -276], [-38, -268]];
    part(C, T(cap), { col: M.hair, p: 0.95, gap: 7, w: 9, ang: 1.3, seed: sd + 42, over: 2 }, lo(sd + 43));
  }
  // —— face features ——
  const ex = o.expr || 'smile', lk = o.look || [0, 0];
  const ey = hc[1] - 4 + lk[1] * 6, exo = lk[0] * 7;
  [-1, 1].forEach(i => {
    const [px, py] = T([[i * 21 + exo, ey]])[0];
    if (ex === 'joy') line(C.l, T([[i * 21 + exo - 9, ey + 3], [i * 21 + exo, ey - 6], [i * 21 + exo + 9, ey + 3]]), lo(sd + 50 + i, { w: 5 }));   // happy closed eyes ^ ^
    else {
      dab(C.l, px, py, 7.5 * s, { col: K.ink, seed: sd + 50 + i, p: 1, gap: 3, w: 4 });
      dab(C.l, px - 2.5 * s * k, py - 3 * s, 2.4 * s, { col: K.white, seed: sd + 52 + i, p: 1, gap: 2, w: 2.5, over: .5 });
    }
    if (ex === 'sad' || ex === 'wish') {   // worried brows: inner ends up
      line(C.l, T([[i * 30 + exo, ey - 20], [i * 12 + exo, ey - 27]]), lo(sd + 54 + i, { w: 4 }));
    }
    dab(C.f, ...T([[i * 36, hc[1] + 16]])[0], 10 * s, { col: K.pink, seed: sd + 56 + i, p: 0.75, sq: 0.7 });
  });
  const my = hc[1] + 26;
  if (ex === 'sad') line(C.l, T([[-12, my + 6], [0, my], [12, my + 6]]), lo(sd + 60, { w: 4.5 }));
  else if (ex === 'wish') line(C.l, T(handCircle(0, my + 2, 5, sd, 0, 14)), lo(sd + 60, { w: 4 }));
  else if (ex === 'open' || ex === 'joy') {
    const m = [[-15, my - 3], [15, my - 3], [10, my + 9], [0, my + 13], [-10, my + 9]];
    part(C, T(m), { col: K.red, p: 0.9, gap: 4, w: 5, seed: sd + 61, over: 1 }, lo(sd + 62, { w: 4 }), { occ: false });
  } else line(C.l, T([[-14, my - 2], [-6, my + 5], [6, my + 5], [14, my - 2]]), lo(sd + 60, { w: 4.5 }));
  // —— arms (in front of the body) ——
  const arms = [[-1, o.armL ?? 0.25, o.elL ?? 0, 'L'], [1, o.armR ?? 0.25, o.elR ?? 0, 'R']];
  for (const [side, a, el, nm] of arms) {
    const A = limb([side * 30, -176], side, a, el, 40, 40);
    part(C, T(tube(A, 16, 14)), o.who === 'mia' ? skinF(sd + 70 + side) : { col: M.body, p: 0.95, gap: 8, w: 10, ang: 0.4, seed: sd + 70 + side, over: 3 }, lo(sd + 72 + side));
    const h = A[2];
    part(C, T(handCircle(h[0], h[1], 13, sd + 74 + side, 0, 20)), skinF(sd + 76 + side), lo(sd + 78 + side, { w: 5.5 }));
    hands[nm] = T([h])[0];
  }
  return { hands, head: T([hc])[0], s };
}

// the ball: red and white, with a curved stripe; turns by distance ÷ radius
export function ball(C, x, y, r, rot, seed = 500) {
  const c = handCircle(x, y, r, seed, 0, 32);
  part(C, c, { col: K.red, p: 0.95, gap: 7, w: 9, ang: 0.6, seed: seed + 1, over: 2 }, lo(seed + 2, { w: 6 }));
  const band = ellipse(x, y, r * 0.98, r * 0.34, 28, 0, Math.PI * 2, rot);
  part(C, band, { col: K.yellow, p: 0.95, gap: 5, w: 7, ang: rot + 0.3, seed: seed + 3, over: 1 }, lo(seed + 4, { w: 4 }));
}

// the kite: a yellow diamond with a bow tail; string from the hand to the kite
export function kite(C, x, y, rot, hand, tw, seed = 600, sc = 1) {
  const D = xf([[0, -62], [44, 0], [0, 88], [-44, 0]].map(([a, b]) => [a * sc, b * sc]), { x, y, r: rot });
  if (hand) line(C.l, curve([hand, [(hand[0] + x) / 2 + 20, (hand[1] + y) / 2 + 40], [x, y + 60]]), { w: 3, col: K.brown, p: 0.85, seed: seed + 9, wob: 0.6 });
  part(C, [...D, D[0]], { col: K.yellow, p: 0.95, gap: 8, w: 10, ang: 0.3, seed: seed + 1, over: 3 }, lo(seed + 2, { w: 6 }));
  line(C.l, [D[0], D[2]], lo(seed + 3, { w: 4 })); line(C.l, [D[1], D[3]], lo(seed + 4, { w: 4 }));
  const tail = []; for (let i = 0; i <= 10; i++) tail.push([D[2][0] + (Math.sin(i * 0.8 + tw) * 16 - i * 4) * sc, D[2][1] + i * 16 * sc]);
  line(C.l, tail, lo(seed + 5, { w: 3.5 }));
  [3, 6, 9].forEach((i, j) => { const [bx, by] = tail[i], q = 14 * sc, v = 8 * sc; part(C, [[bx - q, by - v], [bx, by], [bx - q, by + v]], { col: [K.red, K.sky, K.green][j], p: 1, gap: 4, w: 5, seed: seed + 10 + j, over: 1 }, lo(seed + 13 + j, { w: 3 }), { occ: false });
    part(C, [[bx + q, by - v], [bx, by], [bx + q, by + v]], { col: [K.red, K.sky, K.green][j], p: 1, gap: 4, w: 5, seed: seed + 16 + j, over: 1 }, lo(seed + 19 + j, { w: 3 }), { occ: false }); });
}

// a butterfly: two wing pairs that flap by substitution (open / closed)
export function butterfly(C, x, y, col, open, seed = 700, s = 1) {
  const w = open ? 1 : 0.35;
  [-1, 1].forEach(i => {
    const up = smooth([[0, 0], [i * 30 * w, -30], [i * 44 * w, -12], [i * 24 * w, 4]].map(([a, b]) => [x + a * s, y + b * s]), 5);
    const dn = smooth([[0, 2], [i * 30 * w, 8], [i * 24 * w, 28], [i * 6 * w, 20]].map(([a, b]) => [x + a * s, y + b * s]), 5);
    part(C, up, { col, p: 1, gap: 5, w: 6, seed: seed + i, over: 1.5 }, lo(seed + 2 + i, { w: 4 }), { occ: false });
    part(C, dn, { col, p: 1, gap: 5, w: 6, seed: seed + 4 + i, over: 1.5 }, lo(seed + 6 + i, { w: 4 }), { occ: false });
    line(C.l, [[x, y - 6 * s], [x + i * 10 * s, y - 22 * s]], lo(seed + 8 + i, { w: 2.5 }));
  });
  line(C.l, [[x, y - 8 * s], [x, y + 22 * s]], lo(seed + 10, { w: 5 }));
}

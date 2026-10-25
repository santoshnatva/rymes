// The page (world 3200×1800, full page = scale 0.6): house, garden, flowers, puddles, cloud, rain, sun, rainbow, sky wash.
// The same house and garden in every shot; the weather and the colouring change on top of them.
import { line, fill, dab, ellipse, handCircle, smooth, xf, text, CAM, W, H } from './crayon.js';
import { part, erase, curve } from './rig.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, mulberry, eio, ss } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
const BL = 0.6;                       // background line boil
const bl = (seed, x = {}) => ({ w: 8, seed, boil: BL, ...x });
const bf = (col, seed, x = {}) => ({ col, p: 0.85, seed, boil: 0, ...x });   // background colouring stays still

export const GY = x => 1272 + 10 * Math.sin(x * 0.0021 + 1) + 6 * Math.sin(x * 0.0063);
export const HOUSE = { x0: 850, x1: 1350, y0: 868, y1: 1276, peak: [1100, 600], win: [1040, 902, 1300, 1092], door: [884, 1060, 994, 1276] };
export const PUDDLES = [{ x: 1430, y: 1586, rx: 150, ry: 32, t0: 0.6 }, { x: 2380, y: 1664, rx: 92, ry: 22, t0: 3.2 }, { x: 560, y: 1622, rx: 84, ry: 20, t0: 4.4 }];
export const SUN = { x: 2480, y: 330, r: 118 };
export const RB = { x: 1900, y: 1340, r: 1240, band: 48, cols: [K.red, K.orange, K.yellow, K.green, K.sky, K.violet] };

// flowers: x, y (base), colour, height; tc = when the crayon colours it in
const FCOL = [K.red, K.yellow, K.pink, K.violet, K.orange, K.pink];
export const FLOWERS = (() => {
  const R = mulberry(41), out = [];
  const spots = [[1660, 1330], [1760, 1520], [1880, 1340], [1960, 1560], [2120, 1330], [2230, 1500], [2340, 1350], [2470, 1540], [2560, 1320], [2680, 1480], [2800, 1360], [2900, 1560], [2990, 1400],
    [260, 1360], [380, 1520], [700, 1380], [780, 1540], [160, 1560], [1560, 1470]];
  spots.forEach(([x, y], i) => out.push({ x, y, col: FCOL[i % FCOL.length], h: 150 + R() * 70, seed: 2000 + i * 13, tc: 0 }));
  return out;
})();

// —— background: everything fixed to the page ——
export function drawWorld(F, L, t, S) {
  // 1) sky things that sit behind the house: white-wax rays (on the page from frame one, invisible until the wash), rainbow, sun
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + 0.1, r0 = SUN.r + 52, r1 = SUN.r + 210 + (i % 2) * 60;
    line(F, [[SUN.x + Math.cos(a) * r0, SUN.y + Math.sin(a) * r0], [SUN.x + Math.cos(a) * r1, SUN.y + Math.sin(a) * r1]], { col: K.white, w: 26, p: 1.15, seed: 3000 + i, boil: 0, wob: 0.5, taper: 0.1 });
  }
  if (S.rainbow > 0) rainbow(F, S.rainbow);
  if (S.sun > 0) sun(F, L, t, S);
  // the house and the ground hide whatever sky colour was drawn behind them
  erase(F, houseSil());
  const ground = []; for (let x = -200; x <= 3400; x += 50) ground.push([x, GY(x) - 4]); ground.push([3400, 1900], [-200, 1900]);
  erase(F, ground);
  // 2) ground: grass hatched in light, a second heavier pass when the sun comes out (colouring is an action)
  fill(F, ground, bf(K.green, 4100, { p: 0.5, gap: 13, w: 12, ang: 1.35, over: 2 }));
  if (S.grass > 0) { const cut = -200 + 3600 * S.grass; fill(F, ground.map(([x, y]) => [Math.min(x, cut), y]), bf(K.green, 4110, { p: 0.95, gap: 11, w: 12, ang: 0.35, over: 3 })); }
  line(L, ground.slice(0, -2), bl(4120, { w: 7, col: K.green, p: 0.9 }));
  tree(F, L);
  // 3) house
  house(F, L, t, S);
  // 4) puddles (grow during the rain)
  PUDDLES.forEach((p, i) => {
    const g = S.puddle[i]; if (g <= 0) return;
    const e = handCircle(0, 0, 1, 4200 + i, 0.05, 40).map(([x, y]) => [p.x + x * p.rx * g, p.y + y * p.ry * (0.6 + 0.4 * g)]);
    erase(F, e);
    fill(F, e, bf(K.sky, 4210 + i, { p: 0.62, gap: 7, w: 9, ang: 0.08, over: 4 }));
    line(L, e, bl(4220 + i, { w: 6, col: K.sky, p: 0.9 }));
    if (i === 0 && S.reflect > 0) {   // the rainbow in the puddle
      RB.cols.forEach((c, j) => { const yy = p.y - p.ry * 0.5 + j * 9; const hw = p.rx * (0.7 - j * 0.06) * S.reflect;
        line(F, [[p.x - hw, yy + 6], [p.x, yy - 8], [p.x + hw, yy + 6]], { col: c, w: 7, p: 0.9, seed: 4230 + j, boil: 0.3 }); });
    }
  });
  // 5) flowers
  FLOWERS.forEach(f => flower(F, L, t, f, S));
}

function houseSil() {
  const { x0, x1, y0, y1, peak } = HOUSE;
  return [[x0 - 40, y0 + 12], peak, [x1 + 40, y0 + 12], [x1 + 250, y0 - 48], [peak[0] + 210, peak[1] - 60], [peak[0], peak[1] - 30], [x1 + 250, y0 - 48], [x1 + 210, y1 - 46], [x1, y1], [x0, y1]];
}
function house(F, L, t, S) {
  const { x0, x1, y0, y1, peak, win, door } = HOUSE;
  const front = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const side = [[x1, y0], [x1 + 210, y0 - 60], [x1 + 210, y1 - 46], [x1, y1]];
  fill(F, front, bf(K.yellow, 4300, { p: 0.82, gap: 10, w: 12, ang: 0.62, over: 6, cross: true, crossP: 0.45 }));
  fill(F, side, bf(K.orange, 4301, { p: 0.6, gap: 11, w: 12, ang: 1.1, over: 5 }));
  line(L, [...front, front[0]], bl(4302)); line(L, side, bl(4303));
  // roof: front gable + slanted side roof
  const gable = [[x0 - 44, y0 + 14], peak, [x1 + 44, y0 + 14]];
  const sroof = [peak, [peak[0] + 210, peak[1] - 60], [x1 + 254, y0 - 46], [x1 + 44, y0 + 14]];
  // chimney (behind the roof)
  const ch = [[1440, 640], [1500, 622], [1500, 520], [1440, 536]];
  fill(F, ch, bf(K.red, 4304, { p: 0.9, gap: 8, w: 10, ang: 0.3 })); line(L, [...ch, ch[0]], bl(4305));
  erase(F, sroof); erase(F, gable);
  fill(F, gable, bf(K.red, 4306, { p: 0.95, gap: 9, w: 12, ang: 0.4, over: 6 }));
  fill(F, sroof, bf(K.red, 4307, { p: 0.8, gap: 10, w: 12, ang: 1.2, over: 5 }));
  line(L, [...gable], bl(4308, { w: 9 })); line(L, [...sroof], bl(4309, { w: 9 }));
  // round attic window in the gable
  const aw = handCircle(peak[0], 790, 40, 4320, 0, 32); erase(F, aw); fill(F, aw, bf(K.sky, 4321, { p: 0.55, gap: 7, w: 8 })); line(L, aw, bl(4322, { w: 6 }));
  line(L, [[peak[0] - 40, 790], [peak[0] + 40, 790]], bl(4323, { w: 4 })); line(L, [[peak[0], 750], [peak[0], 830]], bl(4324, { w: 4 }));
  // big window (the children look out of it): its glass is bare paper
  const [wx0, wy0, wx1, wy1] = win;
  erase(F, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1]]);
  // door: closed until the children open it
  const [dx0, dy0, dx1, dy1] = door; const dr = [[dx0, dy0], [dx1, dy0], [dx1, dy1], [dx0, dy1]];
  erase(F, dr);
  if (S.door <= 0) {
    fill(F, dr, bf(K.brown, 4330, { p: 0.9, gap: 8, w: 11, ang: 1.4 })); line(L, [...dr, dr[0]], bl(4331));
    dab(F, dx1 - 22, (dy0 + dy1) / 2 + 10, 8, { col: K.yellow, seed: 4332, p: 1, boil: 0 });
  } else {   // open: dark doorway + the door swung out on its hinge
    fill(F, dr, bf(K.violet, 4333, { p: 0.55, gap: 8, w: 10, ang: 0.9 }));
    line(L, [...dr, dr[0]], bl(4334));
    const sw = (dx1 - dx0) * (1 - 0.65 * S.door);
    const panel = [[dx0, dy0], [dx0 - sw, dy0 + 14], [dx0 - sw, dy1 + 8], [dx0, dy1]];
    erase(F, panel); fill(F, panel, bf(K.brown, 4335, { p: 0.95, gap: 8, w: 11, ang: 1.4 })); line(L, [...panel, panel[0]], bl(4336));
  }
  // stepping stones to the door
  [[930, 1312, 34], [990, 1358, 30], [1040, 1408, 28]].forEach(([x, y, r], i) => { const e = handCircle(x, y, r, 4340 + i, 0, 18).map(([px, py]) => [px, y + (py - y) * 0.45]); erase(F, e); fill(F, e, bf(K.grey, 4343 + i, { p: 0.6, gap: 6, w: 8 })); line(L, e, bl(4346 + i, { w: 5 })); });
}
// the window frame, curtains and sill go in front of the children (drawn into their group)
export function windowFront(C, t) {
  const [wx0, wy0, wx1, wy1] = HOUSE.win;
  const lo = (seed, x = {}) => ({ w: 8, seed, boil: BL, ...x });
  const wall = [[wx0 - 8, wy1], [wx1 + 8, wy1], [wx1 + 8, wy1 + 150], [wx0 - 8, wy1 + 150]];
  part(C, wall, { col: K.yellow, p: 0.82, gap: 10, w: 12, ang: 0.62, over: 0, seed: 4300, boil: 0, cross: true, crossP: 0.45 }, null);
  [-1, 1].forEach(i => {   // pink curtains tied back
    const x = i < 0 ? wx0 : wx1;
    const cur = smooth([[x, wy0], [x + i * -62, wy0], [x + i * -30, wy0 + 90], [x + i * -40, wy1 - 6], [x, wy1 - 6]], 5);
    part(C, cur, { col: K.pink, p: 0.9, gap: 8, w: 10, ang: 1.3, seed: 4350 + i, over: 2, boil: 0 }, lo(4352 + i, { w: 5 }));
  });
  line(C.l, [[wx0, wy0], [wx1, wy0], [wx1, wy1], [wx0, wy1], [wx0, wy0]], lo(4354, { w: 10 }));
  line(C.l, [[(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1]], lo(4355, { w: 6 }));
  line(C.l, [[wx0, (wy0 + wy1) / 2 - 20], [wx1, (wy0 + wy1) / 2 - 20]], lo(4356, { w: 6 }));
  const sill = [[wx0 - 24, wy1 - 4], [wx1 + 24, wy1 - 4], [wx1 + 34, wy1 + 22], [wx0 - 34, wy1 + 22]];
  part(C, sill, { col: K.brown, p: 0.9, gap: 7, w: 9, ang: 0.1, seed: 4357, boil: 0 }, lo(4358, { w: 7 }));
}
function tree(F, L) {
  const tr = [[480, 1280], [500, 1080], [540, 1080], [556, 1284]];
  fill(F, tr, bf(K.brown, 4400, { p: 0.9, gap: 8, w: 10, ang: 1.4 })); line(L, [...tr], bl(4401));
  const crown = smooth([[520, 760], [640, 800], [690, 920], [640, 1060], [520, 1100], [390, 1060], [350, 930], [400, 800]], 6);
  erase(F, crown); fill(F, crown, bf(K.green, 4402, { p: 0.9, gap: 10, w: 12, ang: 0.7, cross: true, crossP: 0.5 })); line(L, crown, bl(4403));
  [[470, 880], [590, 900], [520, 990], [430, 1010], [620, 1010]].forEach(([x, y], i) => dab(F, x, y, 14, { col: K.red, seed: 4404 + i, p: 1, boil: 0 }));
}
function sun(F, L, t, S) {
  const d = S.sun, c = handCircle(SUN.x, SUN.y, SUN.r, 4500, 0.08, 56);
  erase(F, c);
  fill(F, c, bf(K.yellow, 4501, { p: 1.05, gap: 9, w: 12, ang: 0.6, over: 5, draw: pr(d, 0.35, 1), cross: true, crossP: 0.6 }));
  line(L, c, bl(4502, { w: 9, col: K.orange, draw: pr(d, 0, 0.45) }));
  if (d >= 1) {   // face: closed happy eyes, a big smile, pink cheeks
    [-1, 1].forEach(i => { line(L, [[SUN.x + i * 40 - 16, SUN.y - 14], [SUN.x + i * 40, SUN.y - 30], [SUN.x + i * 40 + 16, SUN.y - 14]], bl(4503 + i, { w: 7, boil: 1 }));
      dab(F, SUN.x + i * 62, SUN.y + 22, 16, { col: K.pink, seed: 4505 + i, p: 0.85, boil: 0 }); });
    line(L, [[SUN.x - 46, SUN.y + 22], [SUN.x - 20, SUN.y + 52], [SUN.x + 20, SUN.y + 52], [SUN.x + 46, SUN.y + 22]], bl(4507, { w: 7, boil: 1 }));
  }
  // hand-drawn yellow rays, two sets that swap on the beat
  if (S.rays > 0) for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.36 + (S.raySet ? Math.PI / 12 : 0), r0 = SUN.r + 26, r1 = SUN.r + 80 + (i % 2) * 34;
    line(L, [[SUN.x + Math.cos(a) * r0, SUN.y + Math.sin(a) * r0], [SUN.x + Math.cos(a) * r1, SUN.y + Math.sin(a) * r1]], { col: K.orange, w: 9, p: 0.95, seed: 4510 + i + S.raySet * 20, boil: 1, draw: S.rays });
  }
}
function rainbow(F, prog) {
  // one band at a time, each swept from the left end over its arc
  RB.cols.forEach((c, j) => {
    const u = clamp(prog * RB.cols.length - j); if (u <= 0) return;
    const r0 = RB.r - j * RB.band, r1 = r0 - RB.band - 4, a1 = Math.PI + Math.PI * eio(u);
    const pts = [];
    for (let a = Math.PI; a <= a1 + 1e-6; a += 0.02) pts.push([RB.x + Math.cos(a) * r0, RB.y + Math.sin(a) * r0]);
    for (let a = a1; a >= Math.PI - 1e-6; a -= 0.02) pts.push([RB.x + Math.cos(a) * r1, RB.y + Math.sin(a) * r1]);
    fill(F, pts, { col: c, p: 1.0, gap: 8, w: 12, ang: 1.57, over: 3, seed: 4600 + j, boil: 0.3 });
  });
}
function flower(F, L, t, f, S) {
  const sway = Math.sin(t * 1.6 + f.seed) * (S.sunny ? 0.09 : 0.03);
  const droop = S.sunny ? 0 : 1;
  const top = [f.x + Math.sin(sway) * f.h + droop * 34, f.y - f.h * (droop ? 0.86 : 1)];
  const stem = curve([[f.x, f.y], [f.x + (top[0] - f.x) * 0.4, f.y - f.h * 0.55], top]);
  line(L, stem, { col: K.green, w: 7, p: 0.95, seed: f.seed, boil: BL });
  [[-1, 0.35], [1, 0.55]].forEach(([i, u], k) => { const by = f.y - f.h * u, bx = f.x + (top[0] - f.x) * u;
    const lf = smooth([[bx, by], [bx + i * 36, by - 30], [bx + i * 64, by - 14], [bx + i * 30, by + 8]], 4);
    fill(F, lf, bf(K.green, f.seed + 2 + k, { p: 0.9, gap: 5, w: 7 })); line(L, lf, { col: K.green, w: 5, p: 0.9, seed: f.seed + 4 + k, boil: BL }); });
  // the head: five petals around a yellow centre; drooping in the rain, coloured in when the children reach it
  const rot = droop ? 0.9 : sway * 2, s = 1.55;
  const col = clamp((t - f.tc) / 0.45);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + rot;
    const pc = [top[0] + Math.cos(a) * 24 * s, top[1] + Math.sin(a) * 24 * s * (droop ? 0.7 : 1)];
    const pe = handCircle(pc[0], pc[1], 17 * s, f.seed + 10 + i, 0, 18);
    erase(F, pe);
    if (S.sunny && col > 0) fill(F, pe, { col: f.col, p: 1.0, gap: 5, w: 7, over: 2, seed: f.seed + 20 + i, boil: 0, draw: clamp(col * 5 - i) });
    line(L, pe, { col: K.ink, w: 5, p: 0.9, seed: f.seed + 30 + i, boil: BL });
  }
  const cc = handCircle(top[0], top[1], 12 * s, f.seed + 40, 0, 16);
  erase(F, cc); fill(F, cc, bf(S.sunny && col > 0 ? K.yellow : K.grey, f.seed + 41, { p: 0.95, gap: 4, w: 6 })); line(L, cc, { col: K.ink, w: 4.5, p: 0.9, seed: f.seed + 42, boil: BL });
}

// —— the cloud (its own group, so it can drift and leave the page) ——
export function cloud(C, cx, cy, face, t) {
  // outline = the union of the bumps along the top, a gently wavy flat-ish bottom
  const bumps = [[-700, 40, 170], [-470, -40, 220], [-220, -100, 250], [60, -120, 260], [330, -80, 240], [560, -20, 210], [740, 50, 160]];
  const pts = [];
  for (let x = -860; x <= 860; x += 14) {
    let y = cy + 130;
    for (const [bx, by, r] of bumps) { const d = x - bx; if (Math.abs(d) < r) y = Math.min(y, cy + by - Math.sqrt(r * r - d * d) * 0.8); }
    pts.push([cx + x, y]);
  }
  for (let x = 860; x >= -860; x -= 40) pts.push([cx + x, cy + 150 + 14 * Math.sin(x * 0.012) + (Math.abs(x) > 760 ? -(Math.abs(x) - 760) * 0.6 : 0)]);
  part(C, pts, { col: K.grey, p: 0.75, gap: 10, w: 13, ang: 0.3, over: 6, seed: 4700, boil: 0.3, cross: true, crossP: 0.55 }, { w: 9, seed: 4701, boil: BL, col: K.ink });
  // a sleepy, gentle face (never scary); 'puff' when the breeze arrives
  const fy = cy + 30;
  if (face === 'puff') {
    [-1, 1].forEach(i => dab(C.l, cx + i * 70, fy - 16, 12, { col: K.ink, seed: 4710 + i, p: 1, gap: 3, w: 4 }));
    line(C.l, handCircle(cx, fy + 40, 16, 4712, 0, 16), { w: 6, seed: 4713, boil: 1 });
  } else {
    [-1, 1].forEach(i => line(C.l, [[cx + i * 70 - 24, fy - 18], [cx + i * 70, fy - 6], [cx + i * 70 + 24, fy - 18]], { w: 7, seed: 4710 + i, boil: 1 }));
    line(C.l, [[cx - 22, fy + 36], [cx, fy + 44], [cx + 22, fy + 36]], { w: 6, seed: 4714, boil: 1 });
  }
  [-1, 1].forEach(i => dab(C.f, cx + i * 120, fy + 26, 22, { col: K.pink, seed: 4716 + i, p: 0.55, sq: 0.6 }));
}
export const CLOUD_Y = 380, CLOUD_HALF = 860;

// —— rain: short blue strokes stepped at 12 fps, a little splash where each lands ——
const DROPS = Array.from({ length: 170 }, (_, i) => ({ u: hash(i * 3.17 + 1), per: 0.62 + 0.3 * hash(i * 5.3), ph: hash(i * 9.1), y1: 1290 + 420 * hash(i * 2.7), k: hash(i * 7.3) }));
export function rain(Lr, t, amt, cx) {
  if (amt <= 0) return;
  const tq = Math.floor(t * 12) / 12;
  DROPS.forEach((d, i) => {
    if (d.k > amt) return;
    const x = cx - CLOUD_HALF + 120 + d.u * (CLOUD_HALF * 2 - 240);
    let y1 = d.y1; if (x > HOUSE.x0 - 50 && x < HOUSE.x1 + 260) y1 = roofY(x);
    const ph = ((tq / d.per + d.ph) % 1);
    const y0 = CLOUD_Y + 150, y = lerp(y0, y1 + 40, ph);
    if (y < y1) line(Lr, [[x + 6, y - 44], [x, y]], { col: K.sky, w: 6, p: 0.95, seed: 5000 + i, boil: 1, taper: 0.4, streak: 1 });
    else { line(Lr, [[x - 16, y1 - 14], [x - 6, y1 - 2]], { col: K.sky, w: 4, p: 0.9, seed: 5300 + i }); line(Lr, [[x + 16, y1 - 14], [x + 6, y1 - 2]], { col: K.sky, w: 4, p: 0.9, seed: 5600 + i }); }
  });
}
function roofY(x) {
  const { x0, x1, y0, peak } = HOUSE;
  if (x < peak[0]) return lerp(y0 + 14, peak[1], clamp((x - x0 + 44) / (peak[0] - x0 + 44)));
  if (x < x1 + 44) return lerp(peak[1], y0 + 14, clamp((x - peak[0]) / (x1 + 44 - peak[0])));
  return lerp(y0 - 30, y0 - 46, clamp((x - x1) / 254));
}
// one drop on its own (the opening drop into the puddle, the last drip from the eave)
export function oneDrop(Lr, x, y0, y1, u, seed) {
  if (u <= 0) return;
  if (u < 1) { const y = lerp(y0, y1, u * u); line(Lr, [[x + 4, y - 50], [x, y]], { col: K.sky, w: 7, p: 1, seed, taper: 0.4 }); }
  else if (u < 1.6) { const k = (u - 1) / 0.6, r = 20 + 50 * k; line(Lr, ellipse(x, y1, r, r * 0.22, 30), { col: K.sky, w: 5, p: 0.9 * (1 - k), seed: seed + 1 }); }
}

// —— the breeze: loopy strokes that travel across the page ——
export function breeze(Lf, t, t0, y, seed) {
  const u = (t - t0) / 3.2; if (u < 0 || u > 1.25) return;
  const N = 260, path = []; for (let k = 0; k <= N; k++) { const v = k / N, x = 3400 - v * 3800; const loop = Math.exp(-Math.pow((v - 0.5) * 7, 2));
    path.push([x - Math.sin(v * 95) * 80 * loop, y + 30 * Math.sin(v * 7 + seed) - (1 - Math.cos(v * 95)) * 60 * loop]); }
  const head = Math.floor(clamp(u) * N), tail = Math.max(0, Math.floor((u - 0.32) * N));
  if (head - tail >= 2) line(Lf, path.slice(tail, head + 1), { col: K.sky, w: 7, p: 0.8, seed, wob: 1.2, taper: 0.35 });
}

// —— the sky-blue wash: two overlapping bands brushed right→left behind the departing cloud ——
export const BANDS = [{ y0: -200, y1: 700, t0: 31.25, t1: 33.6, seed: 2 }, { y0: 680, y1: 1330, t0: 31.6, t1: 34.0, seed: 5 }];
const X0 = -400, X1 = 3600;
export function bandFront(b, t) { return lerp(X1 + 200, X0 - 200, ss(pr(t, b.t0, b.t1))); }
export function drawWash(LW, t) {
  const g = LW.g; g.save();
  g.setTransform(CAM.s, 0, 0, CAM.s, W / 2 - CAM.x * CAM.s, H / 2 - CAM.y * CAM.s);
  for (const b of BANDS) {
    if (t < b.t0) continue;
    const f = bandFront(b, t);
    const frontX = y => f - 60 * Math.sin(clamp((y - b.y0) / (b.y1 - b.y0)) * Math.PI) + 10 * Math.sin(y * 0.05);
    g.save(); g.beginPath();
    g.moveTo(X1 + 50, b.y0 - 60); for (let y = b.y0 - 60; y <= b.y1 + 60; y += 20) g.lineTo(frontX(y), y); g.lineTo(X1 + 50, b.y1 + 60);
    g.closePath(); g.clip();
    const shape = new Path2D();
    for (let x = X0; x <= X1; x += 40) shape.lineTo(x, b.y0 + 8 * Math.sin(x * 0.011 + b.seed) + 6 * hash(x * 0.37 + b.seed));
    for (let x = X1; x >= X0; x -= 40) { const yb = b.seed === 5 ? GY(x) + 14 : b.y1; shape.lineTo(x, yb + 6 * Math.sin(x * 0.013 + b.seed)); }
    shape.closePath();
    g.fillStyle = '#000'; g.globalAlpha = 0.62; g.fill(shape);
    g.save(); g.clip(shape);
    const R = mulberry(b.seed * 97);
    for (let i = 0; i < 22; i++) {
      const yy = lerp(b.y0, b.y1, R()), wdt = 6 + R() * 24, dark = R() < 0.55;
      g.beginPath(); for (let x = X0; x <= X1; x += 60) { const y = yy + 8 * Math.sin(x * 0.004 + i) + 4 * Math.sin(x * 0.02 + i * 2); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineWidth = dark ? wdt : wdt * 0.5; g.globalCompositeOperation = dark ? 'source-over' : 'destination-out'; g.globalAlpha = dark ? 0.08 + R() * 0.06 : 0.04 + R() * 0.05; g.strokeStyle = '#000'; g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    if (t < b.t1) { g.beginPath(); for (let y = b.y0 - 40; y <= b.y1 + 40; y += 16) { const x = frontX(y) + 12; y === b.y0 - 40 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineWidth = 26; g.globalAlpha = 0.28; g.stroke(); }
    g.restore(); g.restore();
  }
  g.restore();
}

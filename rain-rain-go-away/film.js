// Film timeline: one page, one camera. 96 BPM, 4/4, bar = 2.5 s. Verse 1 (rain) → bridge (breeze, sun, wash) → verse 2 (play) → outro (puddle).
import { layer, clear, text, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup } from './rig.js';
import { kid, ball, kite, butterfly } from './chars.js';
import { drawWorld, windowFront, cloud, rain, oneDrop, breeze, drawWash, BANDS, HOUSE, PUDDLES, FLOWERS, GY, pr } from './world.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eio } from '/core/lib.js';
const K = PAL.crayon;
export const DUR = 60;
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;

// —— the sung lines (the recorder sings them); captions are the book's printed words ——
const WORDS = ['Rain, rain, go away.', 'Come again another day.', 'Little children want to play.', 'Rain, rain, go away!'];
export const SUBS = [5, 10, 15, 20, 35, 40, 45, 50].map((t, i) => ({ t0: t - 0.05, t1: t + (i % 4 === 3 ? 4.4 : 4.8), text: WORDS[i % 4] }));

// —— camera: world centre + zoom ——
const camT = track([
  [0, [1600, 900, 0.6]], [10.0, [1600, 900, 0.6]], [11.6, [1170, 990, 2.1]], [14.9, [1170, 990, 2.1]],
  [17.0, [1320, 700, 1.0]], [19.9, [1320, 700, 1.0]], [22.4, [1600, 900, 0.6]], [35.0, [1600, 900, 0.6]],
  [36.0, [1260, 1150, 1.2]], [38.4, [1880, 1150, 1.15]], [40.0, [1890, 1150, 1.15]], [43.0, [2100, 820, 0.75]], [44.6, [2100, 820, 0.75]],
  [45.6, [1860, 1200, 1.1]], [50.0, [1860, 1230, 1.3]], [52.5, [1600, 900, 0.6]], [55.0, [1600, 900, 0.6]], [57.5, [1450, 1520, 1.9]], [60, [1450, 1515, 1.92]],
]);

// —— flowers: when each one gets coloured in ——
FLOWERS.forEach(f => {
  if (f.x < 900) f.tc = 33.8 + f.x / 3200 * 1.2;                      // the grass pass sweeps over the left bed
  else if (f.x < 2100) f.tc = 35.5 + (f.x - 1500) / 600 * 2.2;          // the children run past
  else f.tc = 99;
});
FLOWERS.filter(f => f.tc === 99).sort((a, b) => Math.abs(a.x - 1860) - Math.abs(b.x - 1860)).forEach((f, i) => { f.tc = 45 + i * BEAT * 0.5; });

// —— events (foley / music cues, exported to mix.py) ——
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });
[['intro', 0], ['v1', 5], ['bridge', 25], ['v2', 35], ['outro', 55]].forEach(([id, t]) => ev(t, 'cue', { id }));
ev(0.6, 'plop', { pan: -0.1 });
ev(0.8, 'write', { dur: 1.9, pan: -0.8 });
[[1.0, 0], [4.5, 1], [27.5, 1], [29.6, 0]].forEach(([t, v]) => ev(t, 'rain', { v }));
ev(12.5, 'tap', { pan: -0.2 }); ev(12.5 + BEAT * 0.5, 'tap', { pan: -0.2 });
ev(15.0, 'squeak', { pan: 0 }); ev(15.4, 'rustle', { pan: -0.1 });
ev(25.0, 'whoosh', { dur: 2.2, pan: 0.8, to: -0.8 }); ev(25.5, 'whoosh', { dur: 2.2, pan: 0.6, to: -0.9 }); ev(25.4, 'puff', { pan: 0.1 });
ev(30.45, 'drip', { pan: -0.5 });
ev(31.25, 'ding', { pan: 0.55 });
BANDS.forEach(b => ev(b.t0, 'brush', { dur: b.t1 - b.t0 }));
ev(33.75, 'scribble', { dur: 1.25, pan: 0 }); ev(33.75, 'scratch', { dur: 0.45, pan: 0.55 });
ev(34.85, 'creak', { pan: -0.4 }); ev(35.0, 'birds');
const RUN = { leo: [35.0, 37.5, [935, 1276], [1720, 1440]], mia: [35.45, 38.1, [935, 1276], [2020, 1440]] };
for (const k in RUN) { const [a, b] = RUN[k]; for (let t = a + 0.1; t < b; t += 0.25) ev(t, 'step', { pan: -0.4 + 0.8 * (t - a) / (b - a) }); }
for (let i = 0; i < 8; i++) ev(40 + i * BEAT + BEAT * 0.5, 'bounce', { pan: -0.1 });
[40.4, 41.3, 42.2, 43.1, 44.0].forEach(t => ev(t, 'flap', { pan: 0.4 }));
FLOWERS.forEach(f => { if (f.tc < 60) ev(f.tc, 'colour', { pan: (f.x - 1600) / 1600 }); });
for (let i = 0; i < 8; i++) ev(45 + i * BEAT, 'hop', { pan: 0.1 });
[0, 1, 2, 3, 4, 5].forEach(j => ev(50 + j * 0.42, 'scratch', { dur: 0.42, pan: -0.6 + j * 0.24 }));
for (let t = 41; t < 57; t += 1.7) ev(t, 'flutter', { pan: 0.3 });
ev(57.5, 'land', { pan: 0.05 });

// —— layers ——
const BG = { f: layer(), l: layer() }, CL = group(), RN = layer(), WASH = layer(), KD = group(), FX = group(), SUBK = layer(), SUBT = layer();
const P = {
  stand: {}, sill: { armL: 0.5, armR: 0.5, elL: -0.3, elR: -0.3 },
  run1: { armL: 0.9, armR: -0.6, legL: 0.5, legR: -0.4, knR: 0.6, lean: 0.12 },
  run2: { armL: -0.6, armR: 0.9, legL: -0.4, legR: 0.5, knL: 0.6, lean: 0.12 },
  danceA: { armL: 2.0, armR: 2.0, elL: 0.4, elR: 0.4, legL: 0.6, knL: 0.9 },
  danceB: { armL: 1.4, armR: 1.4, elL: -0.6, elR: -0.6, legR: 0.6, knR: 0.9 },
};
const beatOf = (t, t0) => Math.floor((t - t0) / BEAT);
const phOf = (t, t0) => ((t - t0) / BEAT) % 1;

// —— the children: who, where, which drawing ——
function drawKids(t) {
  if (t < 34.7) {   // at the window
    const s = 0.6, mood = t < 31.4 ? (t > 15 && t < 22.5 || t > 25 ? 'wish' : 'sad') : 'open';
    const look = t > 15 && t < 31.4 ? [0.4, -1] : t >= 31.4 ? [0.8, -0.6] : [0, 0.2];
    const holdUp = t >= 15 && t < 22.5;
    const wave = t > 32.5 && beatOf(t, 32.5) % 2 === 0;
    const tap = t > 12.4 && t < 13.6;
    const mia = kid(KD, { who: 'mia', x: 1112, y: 1140, s, expr: mood === 'open' ? (wave ? 'joy' : 'open') : mood, look, ...P.sill, ...(holdUp ? { armL: 2.2, elL: 0.5, armR: 2.2, elR: 0.5 } : {}), ...(wave ? { armR: 2.4, elR: 0.5 } : {}) });
    const leo = kid(KD, { who: 'leo', x: 1228, y: 1128, s, expr: mood === 'open' ? 'open' : mood, look: tap ? [0.2, 0] : look, ...P.sill, ...(holdUp ? { armL: 1.3, elL: -0.9, armR: 1.3, elR: -0.9 } : {}), ...(tap ? { armR: 2.5, elR: -0.3 } : {}) });
    if (holdUp) {
      const hb = [(leo.hands.L[0] + leo.hands.R[0]) / 2, (leo.hands.L[1] + leo.hands.R[1]) / 2];
      ball(KD, hb[0], hb[1] - 4, 24, t * 0.2, 500);
      const hk = [(mia.hands.L[0] + mia.hands.R[0]) / 2, (mia.hands.L[1] + mia.hands.R[1]) / 2];
      kite(KD, hk[0], hk[1] - 34, 0.1, null, t * 2, 600, 0.5);
    }
    windowFront(KD, t);
    return;
  }
  if (t < 35) return;
  // outside
  const pos = k => { const [a, b, p0, p1] = RUN[k]; const u = ss(pr(t, a, b)); return [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), t >= a && t < b, t >= a]; };
  const runPose = (seed) => (Math.floor(t * 12 / 3 + seed) % 2 ? P.run1 : P.run2);
  const bob = () => 10 * Math.abs(Math.sin(t * Math.PI * 4));
  // Leo
  const [lx, ly, lRun, lOut] = pos('leo');
  if (lOut) {
    let o = { who: 'leo', x: lx, y: ly, expr: 'open' }, ballAt = null;
    if (lRun) { o = { ...o, ...runPose(0), armR: 2.3, elR: 0.4, hop: bob(), expr: 'joy' }; }
    else if (t < 40) { o = { ...o, armR: 1.2, elR: -0.8, armL: 1.2, elL: -0.8 }; }
    else if (t < 45) { const ph = phOf(t, 40); o = { ...o, armR: ph < 0.3 ? 0.55 : 1.05, elR: -0.5, armL: 0.3, expr: beatOf(t, 40) % 2 ? 'joy' : 'open', look: [0.3, 0.4] }; }
    else if (t < 50) { const b = beatOf(t, 45); o = { ...o, ...(b % 2 ? P.danceB : P.danceA), hop: 22 * Math.sin(Math.PI * phOf(t, 45)), expr: b % 2 ? 'joy' : 'open' }; }
    else if (t < 55) { o = { ...o, armL: 2.5, elL: 0.2, look: [0.3, -1], expr: t > 52.5 ? 'joy' : 'open' }; }
    else o = { ...o, armL: 0.3, armR: 0.3 };
    const r = kid(KD, o);
    // the ball: held, bounced on the beat, then left on the grass
    if (lRun) ballAt = [r.hands.R[0], r.hands.R[1] - 26];
    else if (t < 40) ballAt = [(r.hands.L[0] + r.hands.R[0]) / 2, (r.hands.L[1] + r.hands.R[1]) / 2 - 6];
    else if (t < 45) { const ph = phOf(t, 40), top = r.hands.R[1] + 26, gnd = ly - 28; ballAt = [r.hands.R[0] + 4, top + (gnd - top) * (1 - Math.pow(2 * ph - 1, 2))]; }
    if (ballAt) ball(KD, ballAt[0], ballAt[1], 28, (ballAt[1] + ballAt[0]) / 28, 500);
    else { const u = eio(pr(t, 45, 46.2)); ball(KD, lerp(lx + 50, 1560, u), ly + 10 - 28 - 30 * Math.sin(Math.PI * u), 28, (lx + 50 + (1560 - lx - 50) * u) / 28, 500); }
  }
  // Mia (the kite string stays in her right hand from the moment she is outside)
  const [mx, my, mRun, mOut] = pos('mia');
  if (mOut) {
    let o = { who: 'mia', x: mx, y: my, expr: 'open' };
    if (mRun) o = { ...o, ...runPose(1), armR: 2.3, elR: 0.3, hop: bob(), expr: 'joy' };
    else if (t < 40) o = { ...o, armR: 2.2, elR: 0.3, look: [0.5, -0.5] };
    else if (t < 45) o = { ...o, armR: 2.5, elR: 0.2, look: [0.6, -1], expr: t > 43.75 ? 'joy' : 'open' };
    else if (t < 50) { const b = beatOf(t, 45); o = { ...o, ...(b % 2 ? P.danceA : P.danceB), armR: 2.4, elR: 0.3, hop: 22 * Math.sin(Math.PI * phOf(t, 45)), expr: b % 2 ? 'open' : 'joy' }; }
    else if (t < 55) { const w = t > 51.25 && beatOf(t, 51.25) % 2 === 0; o = { ...o, armR: 2.4, elR: 0.3, armL: w ? 2.3 : 1.9, elL: 0.4, look: [-0.2, -1], expr: t > 52.5 ? 'joy' : 'open' }; }
    else o = { ...o, armR: 2.0, elR: 0.3, armL: 0.3 };
    const r = kid(KD, o);
    const h = r.hands.R;
    // kite: trails behind on the run, rises 40→43, then rides the breeze
    let kx, ky, sc = 0.8;
    if (t < 40) { kx = h[0] - 150; ky = h[1] - 230 + 8 * Math.sin(t * 6); }
    else { const u = eio(pr(t, 40, 43)); kx = lerp(h[0] - 150, 2470, u) + 30 * Math.sin(t * 0.9) * u; ky = lerp(h[1] - 230, 520, u) + 20 * Math.sin(t * 1.3) * u; sc = lerp(0.8, 1.1, u); }
    kite(KD, kx, ky, 0.15 * Math.sin(t * 1.7), h, t * 3, 600, sc);
  }
}

// —— butterflies ——
function drawButterflies(t) {
  if (t < 40) return;
  const flap = Math.floor(t * 12) % 2 === 0;
  const B = [[K.pink, 1640, 990, 240, 50, 0.7, 0], [K.yellow, 2380, 1060, 240, 60, 0.55, 2], [K.violet, 2160, 940, 320, 50, 0.62, 4]];
  B.forEach(([col, cx, cy, ax, ay, w, ph], i) => {
    const enter = 1 - eio(pr(t, 40 + i * 0.6, 42 + i * 0.6));
    let x = cx + ax * Math.sin(w * t + ph) + enter * 1600, y = cy + ay * Math.sin(2 * w * t + ph) - enter * 300;
    let open = flap;
    if (i === 2 && t > 55) {   // the last one lands on the puddle's rim
      const u = eio(pr(t, 55, 57.5)); x = lerp(x, 1540, u); y = lerp(y, 1566, u);
      if (t >= 57.5) open = Math.floor((t - 57.5) / 0.5) % 2 === 0;
    }
    butterfly(FX, x, y, col, open, 700 + i * 30, 1.3);
  });
}

// —— state of the page at time t ——
function pageState(t) {
  return {
    rainbow: pr(t, 50, 52.52), sun: pr(t, 31.25, 31.95), rays: pr(t, 33.75, 34.2), raySet: t > 34.2 ? beatOf(t, 34.2) % 2 : 0,
    grass: pr(t, 33.75, 35.0), door: pr(t, 34.85, 35.15), sunny: t >= 32.5, reflect: pr(t, 52.5, 54.5),
    puddle: PUDDLES.map(p => 0.25 + 0.75 * ss(pr(t, p.t0, p.t0 + 8))),
  };
}
const rainAmt = t => t < 27.5 ? pr(t, 1.0, 4.5) : 1 - pr(t, 27.5, 29.6);
const cloudX = t => 1650 + 40 * Math.sin(t * 0.4) - 2900 * eio(pr(t, 25.3, 30.4));

// —— texts on screen (title + captions), for readcheck ——
const TITLE = [{ s: 'Rain, Rain,', x: 120, y: 200, t0: 0.8, t1: 1.7 }, { s: 'Go Away', x: 200, y: 330, t0: 1.75, t1: 2.6 }];
export function TEXTS(t) {
  const out = [];
  const [cx, cy, cs] = camT(t); Object.assign(CAM, { x: cx, y: cy, s: cs });
  if (t >= 2.6) TITLE.forEach((L, i) => { const x0 = sx(L.x), y0 = sy(L.y - 110), x1 = sx(L.x + 60 * L.s.length), y1 = sy(L.y + 20); if (x0 >= 0 && x1 <= W && y0 >= 0 && y1 <= H) out.push({ id: 'title' + i, text: L.s, x0, y0, x1, y1 }); });
  const S = SUBS.find(s => t >= s.t0 + 0.35 && t < s.t1); if (S) out.push({ id: 'sub', text: S.text, x0: 960 - S.text.length * 12, y0: 960, x1: 960 + S.text.length * 12, y1: 1040 });
  return out;
}

// —— render one frame ——
export function frame(comp, t) {
  [CAM.x, CAM.y, CAM.s] = camT(t);
  BOIL.amp = t > 57.5 ? 0.5 : 1;
  [BG.f, BG.l, RN, WASH, SUBK, SUBT].forEach(clear); clearGroup(CL); clearGroup(KD); clearGroup(FX);
  const S = pageState(t);
  drawWorld(BG.f, BG.l, t, S);
  TITLE.forEach((L, i) => text(BG.l, L.s, sx(L.x), sy(L.y), { size: 130 * CAM.s, font: 'Gaegu', weight: 700, reveal: pr(t, L.t0, L.t1), seed: 21 + i * 8, p: 0.95, stroke: 2, align: 'left', col: K.ink, boil: 0.6 }));
  const cx = cloudX(t);
  if (cx > -1200) cloud(CL, cx, 380, t > 25 ? 'puff' : 'sleep', t);
  rain(RN, t, rainAmt(t), cx);
  oneDrop(RN, 1430, 520, 1586, t / 0.6, 5900);
  oneDrop(RN, 806, 892, 1290, (t - 30.0) / 0.45, 5910);
  [[25.0, 300, 61], [25.5, 600, 62], [26.2, 880, 63]].forEach(([t0, y, s]) => breeze(FX.l, t, t0, y, s));
  if (t >= 10 && t < 22 && rainAmt(t) > 0) {   // drops running down the window glass
    const [wx0, wy0, wx1, wy1] = HOUSE.win;
    for (let i = 0; i < 6; i++) { const ph = ((Math.floor(t * 12) / 12) * 0.35 + hash(i * 4.1)) % 1; const x = lerp(wx0 + 20, wx1 - 20, hash(i * 2.3)), y = lerp(wy0, wy1 - 10, ph);
      oneDrop(FX.l, x, y - 20, y, 0.99, 5920 + i); }
  }
  drawKids(t);
  drawButterflies(t);
  if (t >= BANDS[0].t0) drawWash(WASH, t);
  subTo(SUBK, SUBT, t);
  comp.paperCam(CAM.x * 0.6, CAM.y * 0.6, CAM.s / 0.6);
  comp.begin();
  comp.crayon(BG.f.c); comp.crayon(BG.l.c);
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  comp.group(CL, { goff: [0, 0] });
  comp.crayon(RN.c, { goff: go });
  if (t >= BANDS[0].t0) comp.wash(WASH.c, { color: PAL.wash, resist: 0.92, edge: 1.3, gran: 0.5 });
  comp.group(KD, { goff: go });          // the children sit on top of the wash: their faces stay clean
  comp.group(FX, { goff: go });
  comp.knock(SUBK.c); comp.crayon(SUBT.c);
  comp.finish({ vig: 0.3 });
}
function subTo(SUBK, SUBT, t) {
  const S = SUBS.find(s => t >= s.t0 && t < s.t1); if (!S) return;
  const rv = pr(t, S.t0, S.t0 + 0.35);
  const g = SUBK.g; g.save(); g.font = '400 54px "Patrick Hand"'; const tw = g.measureText(S.text).width;
  const cx = 960, cy = 1002, hw = tw / 2 + 46, hh = 44;
  g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.3) * Math.sign(px); const n = 1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 17); const X = cx + sq * hw * n, Y = cy + py * hh * n; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fill(); g.restore();
  text(SUBT, S.text, cx, cy + 18, { size: 54, col: K.ink, reveal: rv, seed: 11 + S.t0 * 3, p: 1, stroke: 1.2 });
}

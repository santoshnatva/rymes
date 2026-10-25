// Entry: ?test=model opens the model sheet; otherwise renders the film
import { makeComp } from './gl.js';
import { BOIL } from './crayon.js';
const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
window.DUR = 1;
await Promise.all(['400 40px "Patrick Hand"', '700 40px Gaegu'].map(f => document.fonts.load(f)));
if (Q.get('test')) {
  const T = await import('./sheet.js');
  window.render = t => { BOIL.step = Math.floor(t * 12); T.sheet(comp, t, Q); };
} else {
  const M = await import('./film.js');
  window.DUR = M.DUR; window.EV = M.EV; window.TEXTS = M.TEXTS;
  window.render = t => { BOIL.step = Math.floor(t * 12 + 1e-6); M.frame(comp, t); };
}
window.READY = true;

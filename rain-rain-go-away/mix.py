"""Foley + ambience + score → out/mix.wav. Every sound sits on an event exported from film.js (events.json)."""
import os, sys, json
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio.sfx import SR, add, limit, bp, lp, hp, noise, t_, env_exp, whoosh, creak, step, thump, ding, compress

HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
DUR = E['dur']; N = int(DUR * SR)
rng = np.random.default_rng(11)
fx = np.zeros((N, 2), np.float32); amb = np.zeros((N, 2), np.float32)

def crayon(d, speed=1.0, v=1.0):
    """stick-slip of wax on paper: band-passed noise with a grain that follows the stroke rhythm"""
    x = bp(noise(d), 1800, 6500) * 0.5
    tt = t_(d); grain = 0.55 + 0.45 * np.abs(np.sin(tt * np.pi * 7 * speed + rng.random() * 3)) ** 2
    jitter = 1 + 0.5 * (rng.random(len(tt)) < 0.02)
    e = np.minimum(1, tt / 0.03) * np.minimum(1, (d - tt) / 0.06)
    return (x * grain * jitter * e * v).astype(np.float32)
def plop(v=1.0, f0=900):
    tt = t_(0.18); f = f0 * np.exp(-tt * 14) + 260
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(0.18, 0.04) * v * 0.8).astype(np.float32)
def tap(v=1.0):
    return (hp(noise(0.05), 1500) * env_exp(0.05, 0.006) * v * 0.6 + np.sin(2 * np.pi * 2300 * t_(0.05)) * env_exp(0.05, 0.01) * 0.2 * v).astype(np.float32)
def squeak(v=1.0):
    tt = t_(0.16); f = 1400 + 900 * np.sin(tt / 0.16 * np.pi)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(tt / 0.16 * np.pi) * 0.25 * v).astype(np.float32)
def rustle(d=0.5, v=1.0):
    tt = t_(d); return (bp(noise(d), 2500, 8000) * (0.3 + 0.7 * (rng.random(len(tt)) < 0.08)) * np.sin(tt / d * np.pi) * 0.25 * v).astype(np.float32)
def puff(v=1.0):
    return (lp(noise(0.35), 600) * env_exp(0.35, 0.09) * np.minimum(1, t_(0.35) / 0.02) * 0.9 * v).astype(np.float32)
def brush(d, v=1.0):
    """wet brush: soft low-passed noise with a bristle grain"""
    tt = t_(d); x = lp(noise(d), 1400) * 0.6 + bp(noise(d), 3000, 7000) * 0.08 * (0.6 + 0.4 * np.sin(tt * 40))
    return (x * np.sin(np.clip(tt / d, 0, 1) * np.pi) ** 0.6 * v).astype(np.float32)
def bounce(v=1.0):
    x = thump(v, 140)[:int(0.3 * SR)] * 0.8; c = bp(noise(0.06), 300, 1200) * env_exp(0.06, 0.012) * 0.4 * v
    x[:len(c)] += c; return x.astype(np.float32)
def flap(v=1.0):
    x = np.zeros(int(0.32 * SR), np.float32)
    for k in range(3): s = int(k * 0.09 * SR); b = bp(noise(0.06), 400, 2500) * env_exp(0.06, 0.015) * 0.5 * v; x[s:s + len(b)] += b[:len(x) - s]
    return x
def flutter(v=1.0):
    x = np.zeros(int(0.5 * SR), np.float32)
    for k in range(10): s = int(k * 0.045 * SR); b = bp(noise(0.02), 2000, 6000) * env_exp(0.02, 0.004) * 0.12 * v; x[s:s + len(b)] += b[:len(x) - s]
    return x
def chirp(v=1.0):
    d = 0.09 + rng.random() * 0.08; tt = t_(d); f0 = 2800 + rng.random() * 1600
    f = f0 + 900 * np.sin(tt / d * np.pi * (1 + rng.integers(0, 3)))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(tt / d * np.pi) * 0.12 * v).astype(np.float32)
def plink(v=1.0, f=2100):
    return (np.sin(2 * np.pi * f * t_(0.4)) * env_exp(0.4, 0.08) * 0.25 * v + np.sin(2 * np.pi * f * 2.7 * t_(0.4)) * env_exp(0.4, 0.03) * 0.06 * v).astype(np.float32)

# —— rain bed: envelope from the 'rain' keys; soft patter + a few individual drops ——
keys = sorted((e['t'], e['v']) for e in E['ev'] if e['type'] == 'rain')
tt = np.arange(N) / SR
renv = np.interp(tt, [k[0] for k in keys], [k[1] for k in keys], left=0, right=0)
bed = bp(noise(DUR), 400, 5000) * 0.10 + lp(noise(DUR), 500) * 0.06
amb[:, 0] += (bed * renv).astype(np.float32); amb[:, 1] += (np.roll(bed, 1931) * renv).astype(np.float32)
for t in np.arange(0.8, 29.6, 0.11):
    v = float(np.interp(t, tt[::480], renv[::480]))
    if rng.random() < 0.6 * v: add(amb, plop(0.12 + 0.1 * rng.random(), 1200 + 1400 * rng.random()), t + rng.random() * 0.1, 1.0, rng.random() * 1.6 - 0.8)
# —— birds once the sun is out ——
t0b = next(e['t'] for e in E['ev'] if e['type'] == 'birds')
t = t0b + 0.4
while t < DUR - 0.5:
    for k in range(rng.integers(2, 5)): add(amb, chirp(0.8 if t < 55 else 0.6), t + k * 0.13, 1.0, rng.random() * 1.4 - 0.7)
    t += 1.3 + rng.random() * 1.8
# a soft breeze bed from 25 s
wind = lp(noise(DUR), 700) * 0.12
wenv = np.clip((tt - 25) / 0.8, 0, 1) * np.clip((29.5 - tt) / 1.5, 0, 1)
amb += np.stack([wind * wenv, np.roll(wind, 777) * wenv], 1).astype(np.float32)

# —— foley on events ——
for e in E['ev']:
    T, ty, pan = e['t'], e['type'], e.get('pan', 0)
    if ty == 'plop': add(fx, plop(1.0), T, 0.9, pan)
    elif ty == 'write': add(fx, crayon(e['dur'], 1.6, 0.6), T, 0.8, pan)
    elif ty == 'scribble': add(fx, crayon(e['dur'], 2.4, 0.7), T, 0.7, pan)
    elif ty == 'scratch': add(fx, crayon(e['dur'], 1.2, 0.6), T, 0.7, pan)
    elif ty == 'colour': add(fx, crayon(0.4, 3.0, 0.45), T, 0.6, pan)
    elif ty == 'tap': add(fx, tap(1.0), T, 0.3, pan)
    elif ty == 'squeak': add(fx, squeak(1.0), T, 0.8, pan)
    elif ty == 'rustle': add(fx, rustle(0.5, 1.0), T, 0.8, pan)
    elif ty == 'whoosh':
        w = whoosh(e['dur'], 0.7); n = len(w); half = n // 2
        add(fx, w[:half], T, 0.6, e['pan']); add(fx, w[half:], T + half / SR, 0.6, e['to'])
    elif ty == 'puff': add(fx, puff(1.0), T, 0.7, pan)
    elif ty == 'drip': add(fx, plop(0.9, 1600), T, 1.0, pan)
    elif ty == 'ding': add(fx, ding(0.5), T, 0.35, pan)
    elif ty == 'brush':
        b = brush(e['dur'], 0.5); n = len(b); third = n // 3
        for k in range(3): add(fx, b[k * third:(k + 1) * third], T + k * third / SR, 0.7, 0.7 - 0.7 * k)
    elif ty == 'creak': add(fx, creak(0.6), T, 0.55, pan)
    elif ty == 'step': add(fx, lp(step(0.5), 1500).astype(np.float32), T, 0.55, pan)
    elif ty == 'bounce': add(fx, bounce(0.8), T, 0.7, pan)
    elif ty == 'hop': add(fx, lp(thump(0.4, 90), 800).astype(np.float32), T, 0.45, pan)
    elif ty == 'flap': add(fx, flap(1.0), T, 0.6, pan)
    elif ty == 'flutter': add(fx, flutter(1.0), T, 0.6, pan)
    elif ty == 'land': add(fx, plink(1.0), T, 0.7, pan)

music, sr = sf.read(os.path.join(HERE, 'music', 'score.wav'), dtype='float32')
assert sr == SR
m = np.zeros((N, 2), np.float32); m[:min(N, len(music))] = music[:N]
mix = m * 1.0 + np.stack([compress(fx[:, c], thr=.3, ratio=2.5) for c in (0, 1)], 1) * 0.55 + amb * 0.5
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
mix = limit(mix * 0.9, .28)   # tame the transient peaks so the −14 LUFS master keeps its true-peak headroom
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print('mix.wav', DUR, 's | music', round(rms(m), 1), 'dB fx', round(rms(fx * .55), 1), 'amb', round(rms(amb * .5), 1), '| silence 30.1-31.2 rms', round(rms(mix[int(30.1 * SR):int(31.2 * SR)]), 1))

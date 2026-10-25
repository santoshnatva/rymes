"""Original arrangement of the traditional (public-domain) tune "Rain, Rain, Go Away".
96 BPM, 4/4, C major, bar = 2.5 s — the same grid as film.js. The alto recorder is the singing voice.
Writes music/score.wav (48 kHz stereo)."""
import os, sys
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit

HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 60.0
BEAT = 60 / 96; BAR = BEAT * 4
S.seed(7)

# —— the tune: (beat in line, beats, pitch) ——
LINES = [
    [(0, 1, 'G5'), (1, 1, 'E5'), (2, .5, 'G5'), (2.5, .5, 'G5'), (3, 2, 'E5')],                                            # Rain, rain, go away
    [(0, 1, 'G5'), (1, .5, 'G5'), (1.5, .5, 'E5'), (2, .5, 'A5'), (2.5, .5, 'G5'), (3, .5, 'G5'), (3.5, 2, 'E5')],           # Come again another day
    [(0, .5, 'G5'), (.5, .5, 'G5'), (1, .5, 'E5'), (1.5, .5, 'A5'), (2, .5, 'G5'), (2.5, .5, 'G5'), (3, 2, 'E5')],          # Little children want to play
    [(0, 1, 'G5'), (1, 1, 'E5'), (2, .5, 'D5'), (2.5, .5, 'D5'), (3, 3, 'C5')],                                             # Rain, rain, go away
]
CHORDS = [['C', 'Am'], ['F', 'C'], ['F', 'C'], ['G', 'C']]   # one chord per bar, two bars per line
UKE = {'C': ['G4', 'C4', 'E4', 'C5'], 'Am': ['A4', 'C4', 'E4', 'A4'], 'F': ['A4', 'C4', 'F4', 'A4'], 'G': ['G4', 'D4', 'G4', 'B4'], 'G7': ['G4', 'D4', 'F4', 'B4']}
ROOT = {'C': 'C3', 'Am': 'A2', 'F': 'F2', 'G': 'G2', 'G7': 'G2'}
FIFTH = {'C': 'G3', 'Am': 'E3', 'F': 'C3', 'G': 'D3', 'G7': 'D3'}

ev = []          # sampler events (t, inst, pitch, dur, vel, pan[, gain])
box = np.zeros((int(DUR * SR) + SR, 2), np.float32)   # music box (modal model)

def melody(t0, inst='recorder', vel=.62, gain=1.0, pan=0.0, legato=.92):
    for li, line in enumerate(LINES):
        for b, d, p in line:
            ev.append((t0 + li * 2 * BAR + b * BEAT, inst, p, d * BEAT * legato, vel, pan, gain))

def music_box(t0, notes, vel=.55, gain=.5):
    for b, d, p in notes:
        x = P.pluck('music_box', p, 2.2, vel=vel)
        add(box, x, t0 + b * BEAT, gain, .15)

def uke_bar(t, ch, beats=(1, 3), vel=.5, pan=-.25):
    for b in beats:
        for k, p in enumerate(UKE[ch]):
            ev.append((t + b * BEAT + k * .018, 'ukulele', p, BEAT * .9, vel * (0.85 + 0.05 * k), pan))

def verse(t0, bright=False):
    for li in range(4):
        for bi, ch in enumerate(CHORDS[li]):
            t = t0 + (li * 2 + bi) * BAR
            uke_bar(t, ch, beats=(0, 1, 2, 3) if bright else (1, 3), vel=.5 if bright else .42)
            if bright:
                ev.append((t, 'bassoon_stac', ROOT[ch], BEAT * .8, .5, .2)); ev.append((t + 2 * BEAT, 'bassoon_stac', FIFTH[ch], BEAT * .8, .45, .2))
                for k in range(8): ev.append((t + k * BEAT / 2, 'shaker', 'down' if k % 2 == 0 else 'up', None, .28 if k % 2 else .36, .4))
                for b in (1, 3): ev.append((t + b * BEAT, 'woodblock', 'a', None, .32, -.35))
            else:
                ev.append((t, 'bassoon', ROOT[ch], BAR * .9, .38, .2, .9))
        # a little glockenspiel answer in the held note at the end of each line
        if li < 3:
            ta = t0 + li * 2 * BAR + 5.5 * BEAT
            for k, p in enumerate(['E6', 'G6'] if li % 2 == 0 else ['G6', 'E6']): ev.append((ta + k * BEAT * .5, 'glockenspiel', p, 1.2, .35, .35, .8))

# intro 0–5: the music box plays the first line, very softly, under the rain
music_box(0.0, LINES[0], vel=.5, gain=.42)
# verse 1 (rain): gentle
melody(5.0)
verse(5.0)
# bridge 25–35
for k in range(16):   # clarinet trill as the breeze arrives
    ev.append((25.0 + k * BEAT / 4, 'clarinet', 'C5' if k % 2 == 0 else 'D5', BEAT / 4 * .95, .36 - k * .012, -.3))
for k, p in enumerate(['E5', 'G5', 'A5', 'G5']): ev.append((26.25 + k * BEAT, 'clarinet', p, BEAT * .9, .32, -.3))
ev.append((27.5, 'bassoon', 'C3', 2.4, .3, .2, .8))
ev.append((27.5, 'glockenspiel', 'E6', 1.5, .25, .4)); ev.append((28.75, 'glockenspiel', 'D6', 1.5, .22, .4))
# 30.0–31.25: silence (only the last drip, in the foley)
for k, p in enumerate(['C6', 'E6', 'G6', 'C7']): ev.append((31.25 + k * .14, 'glockenspiel', p, 2.0, .5 - k * .05, -.2 + k * .15))
rng = np.random.default_rng(3)
for k in range(8):    # sparkles as the wash uncovers the rays
    ev.append((31.95 + k * BEAT * .5, 'glockenspiel', ['G6', 'A6', 'C7', 'E7', 'D7', 'G6', 'E7', 'C7'][k], 1.4, .3, float(.7 - k * .18)))
for b in range(4):    # pick-up bar: the ukulele and woodblock call everyone outside
    uke_bar(32.5 + BAR * 0.5 + b * BEAT * 0, 'G7', beats=(), vel=.5)
for b in (0, 1, 2, 3):
    for k, p in enumerate(UKE['G7']): ev.append((32.5 + 1.25 + b * BEAT * .5 + k * .015, 'ukulele', p, BEAT * .45, .38 + .04 * b, -.25))
for b in (0, 1, 2, 3): ev.append((33.75 + b * BEAT * .5, 'woodblock', 'b', None, .3 + .05 * b, -.3))
# verse 2 (sun): the full little band; the glockenspiel doubles the tune in the last two lines
melody(35.0, vel=.68)
verse(35.0, bright=True)
for b, d, p in LINES[2] + [(x + 8, y, z) for x, y, z in LINES[3]]:
    ev.append((45.0 + b * BEAT, 'glockenspiel', S.name(S.midi(p) + 12), d * BEAT, .3, .35, .7))
# outro 55–60: the music box again, then the last chord rings
music_box(55.0, LINES[0][:4], vel=.55, gain=.5)
for p in ['C5', 'E5', 'G5', 'C6']: add(box, P.pluck('music_box', p, 3.0, vel=.5), 57.5, .45, .15)
for k, p in enumerate(UKE['C']): ev.append((57.5 + k * .03, 'ukulele', p, 2.5, .45, -.25))
ev.append((57.5, 'glockenspiel', 'C7', 3.0, .3, .3)); ev.append((57.5, 'bassoon', 'C3', 2.5, .3, .2, .8))

mix = S.render(ev, dur=DUR + 1, master=False)
n = min(len(mix), len(box)); mix = mix[:n] + box[:n]
mix = S.room(mix, size=.35, mix=.16)
mix = limit(mix * 0.8, .9)
sf.write(os.path.join(HERE, 'score.wav'), mix[:int(DUR * SR)], SR)
print('score.wav', len(mix) / SR, 's, peak', float(np.abs(mix).max()))

"""Write the .srt from the same caption timings as film.js (SUBS)."""
import os, sys, json
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
HERE = os.path.dirname(os.path.abspath(__file__))
WORDS = ['Rain, rain, go away.', 'Come again another day.', 'Little children want to play.', 'Rain, rain, go away!']
cues = [{'t0': t - 0.05, 't1': t + (4.4 if i % 4 == 3 else 4.8), 'text': WORDS[i % 4]} for i, t in enumerate([5, 10, 15, 20, 35, 40, 45, 50])]
json.dump(cues, open(os.path.join(HERE, 'out', 'cues.json'), 'w'))
os.system(f'"{LIB}/.venv/bin/python" "{LIB}/core/render/srt.py" "{HERE}/out/cues.json" "{HERE}/rain-rain-go-away.srt"')

#!/bin/sh
# Rebuild the film from scratch: sh build.sh   (needs the Lemo-Opuscar library: setup.sh prints its path)
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
node core/render/events.mjs "$HERE"                                   # 1. timeline → events.json
"$PY" "$HERE/music/score.py"                                          # 2. original score → music/score.wav
"$PY" "$HERE/mix.py"                                                  # 3. foley + rain/birds + score → out/mix.wav
node core/render/readcheck.mjs "$HERE"                                # 4. on-screen text holds long enough
"$PY" "$HERE/subs.py"                                                 # 5. subtitles → rain-rain-go-away.srt
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"   # 6. every frame
CRF=32 sh "$HERE/tools/mux.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/rain-rain-go-away.mp4" 24 0   # 7. mux, −14 LUFS (the paper is the grain; CRF 32 keeps the file small)
node core/render/still.mjs "$HERE" 53.5 --out "$HERE/out" && cp "$HERE/out/t_53.5.jpg" "$HERE/poster.jpg"   # 8. poster

#!/bin/zsh
# The How It Works page's 3D (hiw_models.py): the mark and one scene per step.
#   ./render_hiw.sh render    frames into out/hiw/ (resumes: finished frames are kept)
#   ./render_hiw.sh encode    frames to ../media/hiw/NAME.webm (alpha), .mp4 (Safari, baked on the page) and .webp
cd "${0:a:h}"
B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
DEVICE=${DEVICE:-METAL}
BG=ebe7de
PUB=../media/hiw
# the logo is the home hero's stack (hero_stack.py) in the mark's ink and green, with its R on the lid
LOGO_ARGS=(logo=1 stone=0B1511 groove=F1EDE3 mint=00E487 peach=F1EDE3 lavender=00E487 blue=F1EDE3 line=.019)
for scene in logo records checks evidence recover; do
  if [[ $scene == logo ]]; then res=1200; held=91; else res=960; held=90; fi
  if [[ $1 == render && $scene == logo ]]; then
    "$B" -b --factory-startup --python hero_stack.py -- $LOGO_ARGS out=out/hiw/logo fps=30 span=1-163 res=$res spp=40 device=$DEVICE 2>&1 | grep -E "Traceback|Error|FILM"
  elif [[ $1 == render ]]; then
    "$B" -b --factory-startup --python hiw_models.py -- scene=$scene out=out/hiw/$scene fps=30 res=$res spp=40 device=$DEVICE 2>&1 | grep -E "Traceback|Error|FILM"
  else
    mkdir -p $PUB
    # the floor's shadow catcher leaves a trace of alpha everywhere, which VP9 turns into a faint haze: clear it
    python3 - out/hiw/$scene out/hiw_clean/$scene <<'PY'
import glob, os, sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1:3]
os.makedirs(dst, exist_ok=True)
for f in glob.glob(src + '/f_*.png'):
    a = np.array(Image.open(f).convert('RGBA'))
    a[..., 3] = np.clip((a[..., 3].astype(int) - 8) * 255 / 247, 0, 255).astype('uint8')
    a[a[..., 3] == 0, :3] = 0
    Image.fromarray(a).save(os.path.join(dst, os.path.basename(f)), compress_level=1)
PY
    first=$(ls out/hiw/$scene | sort | head -1 | sed -E 's/f_0*([0-9]+).png/\1/')
    ffmpeg -y -v error -framerate 30 -start_number $first -i out/hiw_clean/$scene/f_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -row-mt 1 -auto-alt-ref 0 -an $PUB/$scene.webm
    ffmpeg -y -v error -f lavfi -i color=c=0x${BG}:s=${res}x${res}:r=30 -framerate 30 -start_number $first -i out/hiw_clean/$scene/f_%04d.png \
      -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 20 -preset slow -movflags +faststart -an $PUB/$scene.mp4
    python3 -c "from PIL import Image; import sys; f = Image.open(sys.argv[1]).convert('RGBA'); f.save(sys.argv[2], quality=85)" out/hiw_clean/$scene/f_$(printf %04d $held).png $PUB/$scene.webp
  fi
done

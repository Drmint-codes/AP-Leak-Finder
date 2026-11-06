#!/bin/zsh
# The What It Checks page's 3D (wc_models.py), one object per check.
#   ./render_wc.sh render    frames into out/wc/ (resumes: finished frames are kept)
#   ./render_wc.sh encode    frames to ../media/checks/NAME.webm (alpha), .mp4 (Safari, baked on its panel) and .webp
cd "${0:a:h}"
B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
DEVICE=${DEVICE:-METAL}
PUB=${PUB:-../media/checks}   # SCENES="free growth flat" PUB=../media/pricing for the Pricing page
res=800
typeset -A BG
BG=(exact cff5dc near cff5dc over cff5dc bank e3d5f7 outlier e3d5f7 shared e3d5f7 unclaimed fad9c7 missed fad9c7 free ebe7de growth ebe7de flat ebe7de)
for scene in ${=${SCENES:-exact near over bank outlier shared unclaimed missed}}; do
  if [[ $1 == render ]]; then
    "$B" -b --factory-startup --python wc_models.py -- scene=$scene out=out/wc/$scene fps=30 res=$res spp=32 device=$DEVICE 2>&1 | grep -E "Traceback|Error|FILM"
  else
    mkdir -p $PUB
    # the floor's shadow catcher leaves a trace of alpha everywhere, which VP9 turns into a faint haze: clear it
    python3 - out/wc/$scene out/wc_clean/$scene <<'PY'
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
    ffmpeg -y -v error -framerate 30 -i out/wc_clean/$scene/f_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -row-mt 1 -auto-alt-ref 0 -an $PUB/$scene.webm
    ffmpeg -y -v error -f lavfi -i color=c=0x${BG[$scene]}:s=${res}x${res}:r=30 -framerate 30 -i out/wc_clean/$scene/f_%04d.png \
      -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 20 -preset slow -movflags +faststart -an $PUB/$scene.mp4
    python3 -c "from PIL import Image; import sys; f = Image.open(sys.argv[1]).convert('RGBA'); f.save(sys.argv[2], quality=85)" out/wc_clean/$scene/f_0075.png $PUB/$scene.webp
  fi
done

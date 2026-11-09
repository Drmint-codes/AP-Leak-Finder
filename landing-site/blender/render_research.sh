#!/bin/zsh
# The Research pages' 3D: the home hero's record stack (hero_stack.py) with a report's sign on its lid, one clip
# per report, each pulling a different sheet.
#   ./render_research.sh poster   one held frame of each into ../media/research/NAME.webp
#   ./render_research.sh render   frames into out/research/ (resumes: finished frames are kept)
#   ./render_research.sh encode   frames to ../media/research/NAME.webm (alpha) and .mp4 (Safari, baked on the page)
cd "${0:a:h}"
B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
DEVICE=${DEVICE:-METAL}
PUB=../media/research
BG=ebe7de
CLEAN='import glob, os, sys
import numpy as np
from PIL import Image
for f in sys.argv[2:]:
    a = np.array(Image.open(f).convert("RGBA"))
    a[..., 3] = np.clip((a[..., 3].astype(int) - 8) * 255 / 247, 0, 255).astype("uint8")
    a[a[..., 3] == 0, :3] = 0
    Image.fromarray(a).save(os.path.join(sys.argv[1], os.path.basename(f)).replace(".png", ".webp" if sys.argv[1].endswith("poster") else ".png"), **({"quality": 85} if sys.argv[1].endswith("poster") else {"compress_level": 1}))
'
# name  lid sign  span  held frame
CLIPS=("benchmarks bars 1-163 91" "fraud-cases folder 163-328 256" "payments-fraud check 328-499 421" "improper-payments columns 499-678 601")
for clip in $CLIPS; do
  parts=(${=clip}); n=$parts[1]; mark=$parts[2]; span=$parts[3]; held=$parts[4]
  case $1 in
    poster)
      "$B" -b --factory-startup --python hero_stack.py -- mark=$mark out=out/research_p/$n fps=30 frames=$held res=960 spp=28 device=$DEVICE 2>&1 | grep -E "Traceback"
      mkdir -p out/research_p/poster
      python3 -c "$CLEAN" out/research_p/poster out/research_p/$n/hero_*.png
      mv out/research_p/poster/hero_*.webp $PUB/$n.webp ;;
    render)
      "$B" -b --factory-startup --python hero_stack.py -- mark=$mark out=out/research/$n fps=30 span=$span res=960 spp=36 device=$DEVICE 2>&1 | grep -E "Traceback|FILM" ;;
    encode)
      mkdir -p out/research_clean/$n
      python3 -c "$CLEAN" out/research_clean/$n out/research/$n/f_*.png
      first=${span%-*}
      ffmpeg -y -v error -framerate 30 -start_number $first -i out/research_clean/$n/f_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 -row-mt 1 -auto-alt-ref 0 -an $PUB/$n.webm
      ffmpeg -y -v error -f lavfi -i color=c=0x${BG}:s=960x960:r=30 -framerate 30 -start_number $first -i out/research_clean/$n/f_%04d.png \
        -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 20 -preset slow -movflags +faststart -an $PUB/$n.mp4 ;;
  esac
done

#!/bin/zsh
# The onboarding film: the home hero's stack (hero_stack.py), one clip per page. Each clip is one beat of
# the loop (a sheet slides out, holds, slides home) in that page's colours, cut at rests so it loops cleanly,
# and flattened on the left panel's colour for public/onboarding/.
#   ./render_onboarding.sh render    frames into out/onboarding/ (resumes: finished frames are kept)
#   ./render_onboarding.sh encode    frames to ../../public/onboarding/step-N.mp4 and .webp
cd "${0:a:h}"
B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
DEVICE=${DEVICE:-METAL}
BG=121a16
OUT=out/onboarding
PUB=../../public/onboarding

# page  span      held frame  colours
CLIPS=(
  "1 1-163 90 mint=c2f1d4 peach=f4b99e lavender=c9aeeb blue=a2c9ec"
  "2 163-328 255 mint=f7a8e8 peach=f5dd8c lavender=8fe3d0 blue=f29a8a"
  "3 328-499 420 mint=8fc4f5 peach=9fe8a8 lavender=f7b878 blue=b79cf0"
  "4 499-678 600 mint=f5dd8c peach=b79cf0 lavender=f7a8e8 blue=7fe0a8"
)

for clip in $CLIPS; do
  parts=(${=clip}); n=$parts[1]; span=$parts[2]; held=$parts[3]; colours=($parts[4,-1])
  if [[ $1 == render ]]; then
    "$B" -b --factory-startup --python hero_stack.py -- out=$OUT/$n fps=30 span=$span res=960 spp=32 device=$DEVICE $colours 2>&1 | grep -E "Traceback|Error|FRAME|FILM"
  else
    mkdir -p $PUB
    first=${span%-*}
    ffmpeg -y -v error -f lavfi -i color=c=0x${BG}:s=960x960:r=30 -framerate 30 -start_number $first -i $OUT/$n/f_%04d.png \
      -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -crf 21 -preset slow -movflags +faststart -an $PUB/step-$n.mp4
    python3 -c "from PIL import Image; import sys; f = Image.open(sys.argv[1]).convert('RGBA'); Image.alpha_composite(Image.new('RGBA', f.size, '#$BG'), f).convert('RGB').save(sys.argv[2], quality=82)" \
      $OUT/$n/f_$(printf %04d $held).png $PUB/step-$n.webp
  fi
done

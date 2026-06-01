#!/bin/bash
set -e
cd "$(dirname "$0")"
for svg in ../figures/*.svg; do
  name=$(basename "$svg" .svg)
  out="fig-${name}.pdf"
  rsvg-convert -f pdf -o "$out" "$svg"
  echo "$svg -> $out"
done

#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

tectonic planarbench.tex

OUT="planarbench-arxiv.zip"
rm -f "$OUT"

DEPS=(
  planarbench.tex
  neurips_2024.sty
)

# collect figure PDFs referenced in the tex
while IFS= read -r fig; do
  DEPS+=("$fig")
done < <(grep -o 'includegraphics[^{]*{\([^}]*\)}' planarbench.tex | sed 's/.*{\(.*\)}/\1/' | while read -r f; do
  # resolve to actual file (tectonic/pdflatex try .pdf extension automatically)
  for ext in "" ".pdf" ".png" ".jpg"; do
    [ -f "${f}${ext}" ] && echo "${f}${ext}" && break
  done
done)

zip "$OUT" "${DEPS[@]}"
echo "Created $OUT with ${#DEPS[@]} files"

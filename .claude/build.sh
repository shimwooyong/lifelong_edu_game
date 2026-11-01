#!/usr/bin/env bash
# index.html + css + js + data + assets 를 파일 하나(모바일용.html)로 합친다
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 1
OUT="모바일용.html"

mime() {
  case "${1##*.}" in
    png) echo image/png;; jpg|jpeg) echo image/jpeg;; gif) echo image/gif;; webp) echo image/webp;;
    svg) echo image/svg+xml;; mp3) echo audio/mpeg;; wav) echo audio/wav;; ogg) echo audio/ogg;;
    *) echo application/octet-stream;;
  esac
}

# 파일 내용을 출력하면서 "assets/..." 경로를 data URI로 바꾼다
inline_file() {
  local f="$1" line path
  while IFS= read -r line || [ -n "$line" ]; do
    while [[ "$line" =~ (assets/[^\"\'\`\)\ ]+\.[A-Za-z0-9]+) ]]; do
      path="${BASH_REMATCH[1]}"
      if [ -f "$path" ]; then
        line="${line//"$path"/data:$(mime "$path");base64,$(base64 -w0 "$path")}"
      else
        line="${line//"$path"/missing:${path#assets/}}"
      fi
    done
    printf '%s\n' "$line"
  done < "$f"
}

{
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ \<link\ rel=\"stylesheet\"\ href=\"([^\"]+)\" ]]; then
      echo "<style>"; inline_file "${BASH_REMATCH[1]}"; echo "</style>"
    elif [[ "$line" =~ \<script\ src=\"([^\"]+)\"\>\</script\> ]]; then
      echo "<script>"; inline_file "${BASH_REMATCH[1]}"; echo "</script>"
    else
      printf '%s\n' "$line"
    fi
  done < index.html
} > "$OUT"

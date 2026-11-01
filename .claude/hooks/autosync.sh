#!/usr/bin/env bash
# GitHub 자동 동기화
#   pull : 세션 시작 시 다른 기기에서 올린 최신 내용을 받아옴
#   push : Claude 응답이 끝날 때마다 변경 사항을 커밋하고 업로드
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# 원격 저장소가 아직 연결되지 않았으면 아무것도 하지 않음
git remote get-url origin >/dev/null 2>&1 || exit 0

case "$1" in
  pull)
    git pull --rebase --autostash -q origin main >/dev/null 2>&1 \
      || echo "[autosync] pull 실패: 충돌이 있는지 확인하세요." >&2
    ;;
  push)
    git add -A
    if ! git diff --cached --quiet; then
      git commit -q -m "자동 저장: $(date '+%Y-%m-%d %H:%M') ($(hostname))"
    fi
    git pull --rebase --autostash -q origin main >/dev/null 2>&1
    git push -q origin main >/dev/null 2>&1 \
      || echo "[autosync] push 실패: 네트워크나 로그인 상태를 확인하세요." >&2
    ;;
esac
exit 0

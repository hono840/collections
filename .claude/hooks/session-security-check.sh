#!/usr/bin/env bash
# session-security-check.sh — SessionStart セキュリティ確認フック
#
# 役割:
#   1. open な `security` ラベル issue を起動時に一覧表示（致命的リスクの見落とし防止）
#   2. threat-intel.json の鮮度を確認（古ければ警告）
# すべて fail-soft（gh 未認証・オフライン・ファイル欠落でもセッションを止めない）。

set +e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
INTEL="${PROJECT_DIR}/.claude/security/threat-intel.json"

# --- 1. open security issues ---
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    ISSUES=$(gh issue list --label security --state open --limit 10 \
      --json number,title --jq '.[] | "  #\(.number) \(.title)"' 2>/dev/null)
    if [ -n "$ISSUES" ]; then
      printf '\n🚨 === 未対応のセキュリティ Issue があります ===\n'
      printf '%s\n' "$ISSUES"
      printf '対応するには: gh issue view <番号> / 解決後にクローズ\n'
      printf '巡回するには: /supply-chain\n'
      printf '===============================================\n'
    fi
  fi
fi

# --- 2. threat-intel の鮮度 ---
if [ -f "$INTEL" ]; then
  UPDATED=$(grep -o '"updated_at"[^,]*' "$INTEL" 2>/dev/null | head -n1 | sed -E 's/.*"updated_at"[^"]*"([^"]*)".*/\1/')
  if [ -n "$UPDATED" ]; then
    # 7日(604800秒)より古ければ警告（date 解析は環境差があるため fail-soft）
    UPDATED_TS=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$UPDATED" "+%s" 2>/dev/null || date -d "$UPDATED" "+%s" 2>/dev/null)
    NOW_TS=$(date "+%s" 2>/dev/null)
    if [ -n "$UPDATED_TS" ] && [ -n "$NOW_TS" ]; then
      AGE=$((NOW_TS - UPDATED_TS))
      if [ "$AGE" -gt 604800 ]; then
        printf '\n⚠️  threat-intel.json が7日以上更新されていません（最終: %s）。\n' "$UPDATED"
        printf '   GitHub Actions の Threat Intel Refresh が動いているか確認してください。\n'
      fi
    fi
  fi
fi

exit 0

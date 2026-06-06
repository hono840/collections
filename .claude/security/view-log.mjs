#!/usr/bin/env node
/**
 * view-log.mjs — サプライチェーン動作ログ ビューア
 *
 * `.claude/security/audit-log.jsonl`（guard-install.mjs / session-security-check.sh が追記）を
 * 人が読める形で表示する。「中身の動き」を後から確認するためのツール。
 *
 * 使い方:
 *   node .claude/security/view-log.mjs            # 直近30件 + サマリ
 *   node .claude/security/view-log.mjs --blocks   # ブロックのみ
 *   node .claude/security/view-log.mjs --today    # 本日分のみ
 *   node .claude/security/view-log.mjs --limit=100
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOG = resolve(HERE, "audit-log.jsonl");

const argv = process.argv.slice(2);
const onlyBlocks = argv.includes("--blocks");
const onlyToday = argv.includes("--today");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 30) : 30;

const tty = process.stdout.isTTY;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => paint("31", s);
const grn = (s) => paint("32", s);
const ylw = (s) => paint("33", s);
const dim = (s) => paint("90", s);
const bold = (s) => paint("1", s);

let raw;
try {
  raw = readFileSync(LOG, "utf8");
} catch {
  console.log(`まだ動作ログはありません（${LOG}）。`);
  console.log(dim("pnpm add 等のインストールやセッション開始で記録されます。"));
  process.exit(0);
}

let events = raw
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const todayStr = new Date().toISOString().slice(0, 10);
if (onlyToday) events = events.filter((e) => String(e.ts || "").slice(0, 10) === todayStr);
if (onlyBlocks) events = events.filter((e) => e.decision === "block");

const blocks = events.filter((e) => e.decision === "block");
const allows = events.filter((e) => e.decision === "allow");
const sessions = events.filter((e) => e.event === "session_start");
const byCat = {};
for (const e of blocks) byCat[e.category] = (byCat[e.category] || 0) + 1;

const CAT_LABEL = { "forbidden-pm": "PM禁止", denylist: "既知IOC", socket: "Socket低スコア" };

console.log(bold("══ サプライチェーン動作ログ ══"));
console.log(
  `総イベント: ${events.length}   ${red("⛔ ブロック: " + blocks.length)}   ${grn("✅ 許可: " + allows.length)}   ${dim("▶ セッション: " + sessions.length)}`
);
if (blocks.length) {
  console.log(
    "ブロック内訳: " +
      Object.entries(byCat)
        .map(([k, v]) => `${CAT_LABEL[k] || k}=${v}`)
        .join("   ")
  );
}
console.log(dim(`（直近 ${Math.min(limit, events.length)} 件を時系列表示）`));
console.log("");

const fmtTime = (ts) => String(ts || "").replace("T", " ").replace(/\..*/, "").replace("Z", "");

for (const e of events.slice(-limit)) {
  const t = dim(fmtTime(e.ts));
  if (e.event === "session_start") {
    const n = e.openSecurityIssues ?? 0;
    const note = n > 0 ? ylw(`未対応 security issue: ${n}`) : dim("security issue なし");
    console.log(`${t} ${dim("▶ セッション開始")}  ${note}`);
    continue;
  }
  if (e.decision === "block") {
    const tag = ylw(`[${CAT_LABEL[e.category] || e.category}]`);
    console.log(`${t} ${red("⛔ BLOCK")} ${tag} ${e.command || ""}`);
    if (e.detail) console.log(`           ${dim("→ " + e.detail)}`);
  } else {
    const sc = e.scores
      ? "  " + dim(Object.entries(e.scores).map(([k, v]) => `${k}:${v}`).join(" "))
      : "";
    console.log(`${t} ${grn("✅ allow")} ${e.command || ""}${sc}`);
  }
}

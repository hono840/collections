#!/usr/bin/env node
/**
 * guard-install.mjs — PreToolUse(Bash) サプライチェーン・インストールガード
 *
 * 目的: AI（Claude / 各サブエージェント）が「知らず知らずのうちに」悪質パッケージや
 *       禁止パッケージマネージャーでインストールするのを水際でブロックする。
 *
 * ブロック方針（issue駆動モデル）:
 *   1. npm / yarn / bun での install/add 系 → 即ブロック（pnpm 統一の強制）
 *   2. pnpm add/install/dlx/create の対象パッケージが threat-intel.json の
 *      malicious_packages（既知IOC denylist）に一致 → 即ブロック + critical issue 起票を指示
 *   3. それ以外（公開直後の新バージョン等のグレー判定）はブロックしない。
 *      → pnpm の minimumReleaseAge(cooldown) と巡回(/supply-chain)→issue起票に委ねる。
 *
 * 契約:
 *   stdin に PreToolUse の JSON（{ tool_name, tool_input: { command } }）を受け取る。
 *   許可 → exit 0。ブロック → 理由を stderr に出して exit 2（Claude にフィードバックされる）。
 *   intel ファイル欠落・破損等は fail-soft（警告のみ、開発は止めない）。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const INTEL_PATH = resolve(HERE, "../security/threat-intel.json");

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function allow() {
  process.exit(0);
}

function block(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

// --- 入力パース（壊れていても素通りさせる: fail-open。ただし install 系は別途判定）---
let command = "";
try {
  const payload = JSON.parse(readStdin() || "{}");
  command = String(payload?.tool_input?.command ?? "");
} catch {
  allow();
}
if (!command.trim()) allow();

// `&&` `;` `||` `|` でつながれた各サブコマンドを個別に検査
const subCommands = command
  .split(/\|\||&&|[;\n|]/)
  .map((s) => s.trim())
  .filter(Boolean);

// --- 1. 禁止パッケージマネージャーの install/add 系をブロック ---
const FORBIDDEN_PM = [
  { re: /\bnpm\s+(i|install|add|ci|update|exec)\b/, name: "npm" },
  { re: /\byarn\s+(add|install)\b/, name: "yarn" },
  { re: /\byarn\b(?!\s+\w)/, name: "yarn" }, // bare `yarn` = install
  { re: /\bbun\s+(add|install|a|i)\b/, name: "bun" },
];

for (const sub of subCommands) {
  for (const { re, name } of FORBIDDEN_PM) {
    if (re.test(sub)) {
      block(
        `🚫 サプライチェーンガード: \`${name}\` でのインストールはこのプロジェクトでは禁止されています。\n` +
          `   パッケージマネージャーは pnpm に統一されています。\`pnpm add <pkg>\` / \`pnpm install\` を使ってください。\n` +
          `   （検出コマンド: ${sub})`
      );
    }
  }
}

// --- 2. pnpm の対象パッケージを denylist 照合 ---
function extractPnpmPackages(sub) {
  // pnpm add / install <pkg> / dlx <pkg> / create <pkg>
  const m = sub.match(/\bpnpm\s+(?:(?:--\S+|-\w)\s+)*(add|install|i|dlx|create|exec)\b(.*)$/);
  if (!m) return [];
  const verb = m[1];
  // bare `pnpm install`（引数なし）= lockfile からの再現インストール → 対象外
  const rest = m[2] || "";
  const tokens = rest.split(/\s+/).filter(Boolean);
  const specs = tokens.filter((t) => !t.startsWith("-"));
  if ((verb === "install" || verb === "i") && specs.length === 0) return [];
  return specs;
}

function parseSpec(spec) {
  // 例: lodash / lodash@4.17.21 / @scope/pkg / @scope/pkg@1.0.0 / github:u/r / https://...
  if (/^(github:|git\+|https?:|file:|link:|workspace:)/.test(spec)) {
    return { name: spec, version: null, nonRegistry: true };
  }
  if (spec.startsWith("@")) {
    const at = spec.lastIndexOf("@");
    if (at > 0) return { name: spec.slice(0, at), version: spec.slice(at + 1) };
    return { name: spec, version: null };
  }
  const at = spec.indexOf("@");
  if (at > 0) return { name: spec.slice(0, at), version: spec.slice(at + 1) };
  return { name: spec, version: null };
}

const pnpmSpecs = subCommands.flatMap(extractPnpmPackages);
if (pnpmSpecs.length === 0) allow();

// intel をロード（無ければ fail-soft で許可）
let intel;
try {
  intel = JSON.parse(readFileSync(INTEL_PATH, "utf8"));
} catch {
  process.stderr.write(
    `⚠️  サプライチェーンガード: threat-intel.json を読めませんでした（${INTEL_PATH}）。denylist 照合をスキップします。\n`
  );
  allow();
}

const denylist = intel?.malicious_packages ?? {};

function versionMatches(entryVersions, requested) {
  if (!Array.isArray(entryVersions) || entryVersions.includes("*")) return true;
  if (!requested) return true; // バージョン未指定で名前が denylist 入り → 安全側でブロック
  return entryVersions.includes(requested);
}

for (const spec of pnpmSpecs) {
  const { name, version } = parseSpec(spec);
  const entry = denylist[name];
  if (entry && versionMatches(entry.versions, version)) {
    block(
      `🚨 サプライチェーンガード: \`${name}\` は既知の悪質パッケージ denylist に一致しました。インストールを中止しました。\n` +
        `   campaign: ${entry.campaign ?? "unknown"} / severity: ${entry.severity ?? "critical"}\n` +
        `   reference: ${entry.reference ?? "-"}\n\n` +
        `   これは致命的なサプライチェーンリスクの可能性があります。次を行ってください:\n` +
        `   1) インストールを実行しない。\n` +
        `   2) \`gh issue create --label security --label severity:critical\` で起票し Hiro に報告する。\n` +
        `   3) 代替の正規パッケージを検討する。`
    );
  }
}

allow();

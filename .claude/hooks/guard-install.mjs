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
 *      malicious_packages（既知IOC denylist）に一致 → 即ブロック
 *   3. 上記を通過した pnpm パッケージを Socket(depscore) でライブ採点し、
 *      supplyChain スコアが閾値(既定20)未満 → 即ブロック（マルウェア/typosquat等）
 *   4. それ以外（公開直後の新バージョン等のグレー判定）はブロックしない。
 *      → pnpm の minimumReleaseAge(cooldown) と巡回(/supply-chain)→issue起票に委ねる。
 *
 * フェイルセーフ:
 *   - threat-intel.json 欠落・破損、Socket 未到達・タイムアウト等は fail-open（開発を止めない）。
 *   - Socket ゲートは `SOCKET_GATE_DISABLE=1` で無効化、閾値は `SOCKET_GATE_THRESHOLD`、
 *     タイムアウトは `SOCKET_GATE_TIMEOUT_MS`（既定8000）で調整可能。
 *
 * 契約:
 *   stdin に PreToolUse の JSON（{ tool_name, tool_input: { command } }）を受け取る。
 *   許可 → exit 0。ブロック → 理由を stderr に出して exit 2（Claude にフィードバックされる）。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const INTEL_PATH = resolve(HERE, "../security/threat-intel.json");

const SOCKET_MCP_URL = process.env.SOCKET_MCP_URL || "https://mcp.socket.dev/";
const SOCKET_THRESHOLD = Number(process.env.SOCKET_GATE_THRESHOLD || 20);
const SOCKET_TIMEOUT_MS = Number(process.env.SOCKET_GATE_TIMEOUT_MS || 8000);
const SOCKET_DISABLED = process.env.SOCKET_GATE_DISABLE === "1";

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

// ---------- コマンド解析 ----------
function getSubCommands(command) {
  return command
    .split(/\|\||&&|[;\n|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const FORBIDDEN_PM = [
  { re: /\bnpm\s+(i|install|add|ci|update|exec)\b/, name: "npm" },
  { re: /\byarn\s+(add|install)\b/, name: "yarn" },
  { re: /\byarn\b(?!\s+\w)/, name: "yarn" }, // bare `yarn` = install
  { re: /\bbun\s+(add|install|a|i)\b/, name: "bun" },
];

function extractPnpmPackages(sub) {
  const m = sub.match(/\bpnpm\s+(?:(?:--\S+|-\w)\s+)*(add|install|i|dlx|create|exec)\b(.*)$/);
  if (!m) return [];
  const verb = m[1];
  const rest = m[2] || "";
  const tokens = rest.split(/\s+/).filter(Boolean);
  const specs = tokens.filter((t) => !t.startsWith("-"));
  if ((verb === "install" || verb === "i") && specs.length === 0) return []; // lockfile再現
  return specs;
}

function parseSpec(spec) {
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

// ---------- Socket depscore（MCP streamable-HTTP）----------
async function socketScores(packages) {
  // packages: [{ ecosystem, depname, version }]
  // 返り値: Map<depname, supplyChainScore> / 失敗時 null（fail-open）
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), SOCKET_TIMEOUT_MS);
  const base = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  try {
    const initRes = await fetch(SOCKET_MCP_URL, {
      method: "POST",
      headers: base,
      signal: ac.signal,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "collection-guard", version: "1.0" } },
      }),
    });
    if (!initRes.ok) return null;
    const sid = initRes.headers.get("mcp-session-id");
    const headers = sid ? { ...base, "mcp-session-id": sid } : base;

    await fetch(SOCKET_MCP_URL, {
      method: "POST", headers, signal: ac.signal,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });

    const callRes = await fetch(SOCKET_MCP_URL, {
      method: "POST", headers, signal: ac.signal,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2, method: "tools/call",
        params: { name: "depscore", arguments: { packages } },
      }),
    });
    if (!callRes.ok) return null;
    const data = await callRes.json();
    const text = data?.result?.content?.[0]?.text || "";
    // 各行: "pkg:npm/<name>@<ver>: ... supplyChain: NN ..."（scoped は %40scope/name）
    const scores = new Map();
    for (const line of text.split("\n")) {
      const m = line.match(/^pkg:[^/]+\/(.+?)@.*?supplyChain:\s*(\d+)/);
      if (m) {
        let name = m[1];
        try { name = decodeURIComponent(name); } catch { /* keep raw */ }
        scores.set(name, Number(m[2]));
      }
    }
    return scores;
  } catch {
    return null; // タイムアウト/ネットワーク失敗 → fail-open
  } finally {
    clearTimeout(timer);
  }
}

// ---------- メイン ----------
async function main() {
  let command = "";
  try {
    const payload = JSON.parse(readStdin() || "{}");
    command = String(payload?.tool_input?.command ?? "");
  } catch {
    allow();
  }
  if (!command.trim()) allow();

  const subCommands = getSubCommands(command);

  // 1. 禁止パッケージマネージャー（同期・ネットワーク不要）
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

  const pnpmSpecs = subCommands.flatMap(extractPnpmPackages);
  if (pnpmSpecs.length === 0) allow();

  const parsed = pnpmSpecs.map(parseSpec);

  // 2. ローカル denylist（既知IOC・オフラインでも効く・同期）
  let intel = null;
  try {
    intel = JSON.parse(readFileSync(INTEL_PATH, "utf8"));
  } catch {
    process.stderr.write(
      `⚠️  サプライチェーンガード: threat-intel.json を読めませんでした（${INTEL_PATH}）。denylist 照合をスキップします。\n`
    );
  }
  if (intel) {
    const denylist = intel.malicious_packages ?? {};
    for (const { name, version } of parsed) {
      const entry = denylist[name];
      if (entry) {
        const versions = entry.versions;
        const match = !Array.isArray(versions) || versions.includes("*") || !version || versions.includes(version);
        if (match) {
          block(
            `🚨 サプライチェーンガード: \`${name}\` は既知の悪質パッケージ denylist に一致しました。インストールを中止しました。\n` +
              `   campaign: ${entry.campaign ?? "unknown"} / severity: ${entry.severity ?? "critical"}\n` +
              `   reference: ${entry.reference ?? "-"}\n\n` +
              `   致命的なサプライチェーンリスクの可能性があります。インストールせず、\n` +
              `   \`gh issue create --label security --label severity:critical\` で起票し Hiro に報告してください。`
          );
        }
      }
    }
  }

  // 3. Socket depscore ライブ採点（ネットワーク・fail-open）
  if (!SOCKET_DISABLED) {
    const pkgs = parsed
      .filter((p) => !p.nonRegistry)
      .map((p) => ({ ecosystem: "npm", depname: p.name, version: p.version || "unknown" }));
    if (pkgs.length) {
      const scores = await socketScores(pkgs);
      if (scores) {
        const risky = pkgs
          .map((p) => ({ name: p.depname, score: scores.get(p.depname) }))
          .filter((x) => typeof x.score === "number" && x.score < SOCKET_THRESHOLD);
        if (risky.length) {
          const lines = risky.map((r) => `   - ${r.name}: supplyChain スコア ${r.score} (閾値 ${SOCKET_THRESHOLD} 未満)`).join("\n");
          block(
            `🚨 サプライチェーンガード(Socket): 以下のパッケージは供給網スコアが危険水準です。インストールを中止しました。\n` +
              `${lines}\n\n` +
              `   マルウェア / typosquat / 乗っ取りの兆候です。インストールせず、\n` +
              `   \`gh issue create --label security --label severity:critical\` で起票し Hiro に報告してください。\n` +
              `   （誤検知と判断する場合のみ SOCKET_GATE_DISABLE=1 で一時的に無効化できます）`
          );
        }
      }
      // scores === null は Socket 未到達 → fail-open（ローカル denylist は通過済み）
    }
  }

  allow();
}

main();

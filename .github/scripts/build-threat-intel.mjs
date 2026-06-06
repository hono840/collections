#!/usr/bin/env node
/**
 * build-threat-intel.mjs — 脅威インテリジェンス日次更新スクリプト
 *
 * GitHub Advisory Database の「malware」アドバイザリ（npm エコシステム）を取得し、
 * `.claude/security/threat-intel.json` の malicious_packages を再構築する。
 * これにより、ローカルの guard-install.mjs フックと CI が常に最新の denylist を共有する。
 *
 * - seed / manual エントリ（手動登録・テストセンチネル）は常に保持する。
 * - 取得失敗・0件時は既存ファイルを上書きしない（fail-soft）。
 * - 直近 WINDOW_DAYS 日に公開された malware のみを対象にしてファイルサイズを抑える
 *   （古い malware は既にレジストリから削除済みでインストール不可のため）。
 *
 * 環境変数:
 *   GITHUB_TOKEN / GH_TOKEN     — レート制限緩和（CI では自動付与）。任意。
 *   THREAT_INTEL_WINDOW_DAYS    — 取得対象の公開日ウィンドウ（既定 365）。
 *
 * 実行: node .github/scripts/build-threat-intel.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const INTEL_PATH = resolve(HERE, "../../.claude/security/threat-intel.json");

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const WINDOW_DAYS = Number(process.env.THREAT_INTEL_WINDOW_DAYS || 180);
const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(cutoff).toISOString().slice(0, 10); // YYYY-MM-DD（サーバー側フィルタ用）

function log(msg) {
  process.stderr.write(`[threat-intel] ${msg}\n`);
}

function detectCampaign(summary = "") {
  if (/shai.?hulud/i.test(summary)) return "shai-hulud";
  if (/sha1hulud/i.test(summary)) return "shai-hulud";
  return "npm-malware";
}

async function fetchMalwareAdvisories() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "collection-threat-intel",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const out = [];
  const seen = new Set(); // ghsa_id でページ重複を検知し早期打ち切り
  let page = 1;
  const MAX_PAGES = 50; // 安全上限（無限ループ防止）
  // サーバー側で公開日を絞る（>=cutoff）。published_at 欠落時のクライアント側フィルタ空振りを防ぐ。
  const publishedFilter = encodeURIComponent(`>=${cutoffDate}`);
  while (page <= MAX_PAGES) {
    const url =
      `https://api.github.com/advisories?type=malware&ecosystem=npm` +
      `&published=${publishedFilter}` +
      `&sort=published&direction=desc&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status} ${res.statusText}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    let newOnPage = 0;
    let reachedCutoff = false;
    for (const adv of batch) {
      const id = adv.ghsa_id || adv.url || JSON.stringify(adv.vulnerabilities);
      if (seen.has(id)) continue;
      seen.add(id);
      newOnPage += 1;
      const published = Date.parse(adv.published_at || adv.updated_at || "");
      if (Number.isFinite(published) && published < cutoff) {
        reachedCutoff = true;
        continue;
      }
      out.push(adv);
    }
    if (reachedCutoff) break; // published desc なので、これ以降はすべてウィンドウ外
    if (newOnPage === 0) break; // 新規がない＝ページ重複/末尾 → 打ち切り
    page += 1;
  }
  if (page > MAX_PAGES) {
    log(`ページ上限(${MAX_PAGES})に到達。直近の malware アドバイザリを優先取得しています（古いものは対象外）。`);
  }
  return out;
}

function buildEntries(advisories, today) {
  const entries = {};
  let pkgCount = 0;
  for (const adv of advisories) {
    const vulns = Array.isArray(adv.vulnerabilities) ? adv.vulnerabilities : [];
    for (const v of vulns) {
      const pkg = v?.package;
      if (!pkg || pkg.ecosystem?.toLowerCase() !== "npm" || !pkg.name) continue;
      // malware アドバイザリ = パッケージ自体が悪質 → 全バージョンをブロック
      entries[pkg.name] = {
        versions: ["*"],
        campaign: detectCampaign(adv.summary),
        severity: (adv.severity || "critical").toLowerCase(),
        reference: adv.html_url || adv.ghsa_id || "github-advisory",
        ghsa: adv.ghsa_id || null,
        added: today,
        source: "github-advisory",
      };
      pkgCount += 1;
    }
  }
  return { entries, pkgCount };
}

async function main() {
  let intel;
  try {
    intel = JSON.parse(readFileSync(INTEL_PATH, "utf8"));
  } catch (e) {
    log(`致命的: threat-intel.json を読めません: ${e.message}`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  let advisories;
  try {
    advisories = await fetchMalwareAdvisories();
  } catch (e) {
    log(`取得に失敗（${e.message}）。既存ファイルを保持して終了します（fail-soft）。`);
    process.exit(0);
  }

  const { entries: fetched, pkgCount } = buildEntries(advisories, today);
  if (pkgCount === 0) {
    log("malware アドバイザリを0件取得。異常の可能性があるため既存ファイルを上書きしません。");
    process.exit(0);
  }

  // seed / manual エントリは常に保持し、その上に取得結果を重ねる
  const preserved = {};
  for (const [name, entry] of Object.entries(intel.malicious_packages || {})) {
    if (entry?.source === "seed" || entry?.source === "manual") preserved[name] = entry;
  }
  const merged = { ...fetched, ...preserved };

  intel.malicious_packages = Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => a.localeCompare(b))
  );
  intel.updated_at = new Date().toISOString();
  intel.updated_by = "threat-intel-refresh";
  intel.stats = {
    malicious_packages: Object.keys(merged).length,
    from_advisories: pkgCount,
    preserved_manual: Object.keys(preserved).length,
    window_days: WINDOW_DAYS,
  };

  writeFileSync(INTEL_PATH, JSON.stringify(intel, null, 2) + "\n", "utf8");
  log(
    `更新完了: 合計 ${intel.stats.malicious_packages} 件（advisory ${pkgCount} / 保持 ${intel.stats.preserved_manual}）, window ${WINDOW_DAYS}日`
  );
}

main().catch((e) => {
  log(`予期しないエラー: ${e.stack || e.message}`);
  process.exit(1);
});

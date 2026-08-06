/* ============================================================
   تحديث إحصائيات التنزيل — يُشغَّل يومياً عبر GitHub Actions
   يجلب بيانات الإصدارات الرسمية ويكتب website/assets/stats.json
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../website/assets/stats.json");
const REPO = "rn0x/altaqwaa-desktop";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "altaqwaa-stats-bot",
};
if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

async function gh(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

function platformOf(name) {
  const n = name.toLowerCase();
  if (/\.exe|\.msi|setup|portable/i.test(n)) return "windows";
  return "linux";
}

async function main() {
  const [rels, repo] = await Promise.all([
    gh(`https://api.github.com/repos/${REPO}/releases?per_page=100`),
    gh(`https://api.github.com/repos/${REPO}`),
  ]);

  const platformTotals = { windows: { downloads: 0, assets: 0 }, linux: { downloads: 0, assets: 0 } };
  const releases = [];
  let total = 0;

  for (const r of rels) {
    let rTotal = 0;
    for (const a of r.assets || []) {
      const p = platformOf(a.name);
      platformTotals[p].downloads += a.download_count;
      platformTotals[p].assets += 1;
      rTotal += a.download_count;
      total += a.download_count;
    }
    releases.push({
      tag: r.tag_name,
      name: r.name,
      published: r.published_at,
      downloads: rTotal,
      assets: (r.assets || []).length,
      url: r.html_url,
    });
  }

  const latest = rels[0] || {};
  const latestAssets = { windows: [], linux: [] };
  for (const a of latest.assets || []) {
    latestAssets[platformOf(a.name)].push({
      name: a.name,
      size: a.size,
      count: a.download_count,
      url: a.browser_download_url,
    });
  }

  const stats = {
    updated_at: new Date().toISOString(),
    github: {
      repo: REPO,
      html_url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.subscribers_count,
      total_downloads: total,
      releases_count: rels.length,
      assets_count: releases.reduce((s, r) => s + r.assets, 0),
      platforms: platformTotals,
      latest: {
        tag: latest.tag_name,
        name: latest.name,
        published: latest.published_at,
        url: latest.html_url,
        assets: latestAssets,
      },
      releases,
    },
    flathub: { available: true, downloads: null, url: "https://flathub.org/en/apps/org.altaqwaa.Altaqwaa" },
    snap: { available: true, downloads: null, url: "https://snapcraft.io/altaqwaa" },
  };

  fs.writeFileSync(OUT, JSON.stringify(stats, null, 2) + "\n", "utf8");
  console.log(`✓ stats.json → إجمالي التحميلات: ${total} · إصدارات: ${rels.length} · نجوم: ${repo.stargazers_count}`);
}

main().catch((err) => {
  console.error("✗ فشل تحديث الإحصائيات:", err.message);
  process.exit(1);
});

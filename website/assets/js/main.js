/* ============================================================
   التقوى — الصفحة الرسمية للتحميل
   التفاعلات: الثيم · اكتشاف النظام · الإحصائيات الحية · النسخ
   ============================================================ */
(function () {
  "use strict";

  const REPO = "rn0x/altaqwaa-desktop";
  const STATS_URL = "assets/stats.json";
  const API_RELEASES = "https://api.github.com/repos/" + REPO + "/releases?per_page=100";
  const API_REPO = "https://api.github.com/repos/" + REPO;
  const CACHE_KEY = "altaqwaa-live-v2";
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 ساعات

  /* ---------- أدوات مساعدة ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function formatNumber(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function formatSize(bytes) {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return (mb / 1024).toFixed(2) + " GB";
    return mb.toFixed(1) + " MB";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("ar-SA-u-nu-latn", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  /* ---------- الثيم ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("altaqwaa-theme", theme); } catch {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("altaqwaa-theme"); } catch {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light" : "dark";
    }
    applyTheme(saved);

    $("#theme-toggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  /* ---------- اكتشاف نظام التشغيل ---------- */
  function detectOS() {
    const ua = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    const u = ua.toLowerCase() + " " + navigator.userAgent.toLowerCase();
    if (/win/i.test(u)) return "windows";
    if (/mac|iphone|ipad|ipod/i.test(u)) return "mac";
    if (/android/i.test(u)) return "android";
    if (/linux|x11/i.test(u)) return "linux";
    return "unknown";
  }

  function getAssetLabel(name) {
    const n = name.toLowerCase();
    if (/setup/.test(n)) return "تثبيت (NSIS)";
    if (/portable/.test(n)) return "محمول — بدون تثبيت";
    if (/msi/.test(n)) return "حزمة MSI";
    if (/appimage/.test(n)) return "AppImage — يعمل على أي توزيعة";
    if (/\.deb/.test(n)) return "deb — Debian / Ubuntu";
    if (/\.rpm/.test(n)) return "rpm — Fedora / RHEL";
    if (/\.snap/.test(n)) return "snap — Snap Store";
    if (/flatpak/.test(n)) return "flatpak — Flathub";
    if (/tar\.gz/.test(n)) return "أرشيف مضغوط";
    return "ملف مباشر";
  }

  const PLATFORM_PRIORITY = {
    windows: (a) => {
      const n = a.name.toLowerCase();
      if (/setup/.test(n)) return 0;
      if (/portable/.test(n)) return 1;
      if (/msi/.test(n)) return 2;
      return 3;
    },
    linux: (a) => {
      const n = a.name.toLowerCase();
      if (/appimage/.test(n)) return 0;
      if (/\.deb/.test(n)) return 1;
      if (/\.rpm/.test(n)) return 2;
      if (/\.snap/.test(n)) return 3;
      if (/flatpak/.test(n)) return 4;
      return 5;
    },
  };

  function assetCard(asset, platform) {
    const el = document.createElement("div");
    el.className = "dl-card";
    el.innerHTML =
      '<div class="dl-card-top">' +
        '<span class="dl-type"></span>' +
        '<span class="dl-name"></span>' +
      "</div>" +
      '<div class="dl-meta">' +
        '<span class="dl-size"></span>' +
        '<span class="dl-count"></span>' +
      "</div>" +
      '<a class="btn btn-primary btn-sm" target="_blank" rel="noopener">تحميل مباشر</a>';

    $(".dl-type", el).textContent = getAssetLabel(asset.name);
    $(".dl-name", el).textContent = asset.name;
    $(".dl-size", el).textContent = "الحجم: " + formatSize(asset.size);
    $(".dl-count", el).textContent = "▼ " + formatNumber(asset.count) + " تحميل";
    const btn = $(".btn", el);
    btn.href = asset.url;
    btn.setAttribute("aria-label", "تحميل " + asset.name);
    return el;
  }

  /* ---------- الإحصائيات: مصدر حي ثم احتياطي ---------- */
  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function pickAssets(latest) {
    const out = { windows: [], linux: [] };
    if (latest && latest.assets && !Array.isArray(latest.assets)) {
      out.windows = Array.isArray(latest.assets.windows) ? latest.assets.windows.slice() : [];
      out.linux = Array.isArray(latest.assets.linux) ? latest.assets.linux.slice() : [];
    } else {
      const assets = latest && Array.isArray(latest.assets) ? latest.assets : [];
      for (const a of assets) {
        const n = a.name.toLowerCase();
        if (/\.zip/i.test(n)) out.windows.push(a);
        else if (/appimage|\.deb|\.rpm|\.snap|flatpak|tar\.gz/i.test(n)) out.linux.push(a);
      }
    }
    out.windows.sort((a, b) => PLATFORM_PRIORITY.windows(a) - PLATFORM_PRIORITY.windows(b));
    out.linux.sort((a, b) => PLATFORM_PRIORITY.linux(a) - PLATFORM_PRIORITY.linux(b));
    return out;
  }

  function renderStats(stats, source) {
    const g = stats.github || {};
    const total = g.total_downloads;
    const releases = g.releases_count;
    const stars = g.stars;
    const latest = g.latest || {};
    const tag = latest.tag || "—";

    const nums = $$("[data-count]");
    nums.forEach((el) => {
      const target = el === nums[0] ? total : el === nums[1] ? releases : stars;
      countUp(el, target || 0, 1600);
    });

    $("#hero-version").textContent = (tag || "4.0.1").replace(/^v/, "");
    $("#win-version").textContent = tag;
    $("#linux-version").textContent = tag;

    if (source === "live") {
      $("#ft-total").textContent = formatNumber(total);
      $("#ft-releases").textContent = formatNumber(releases);
      $("#ft-stars").textContent = formatNumber(stars);
      $("#ft-updated").textContent = new Date().toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });
    } else {
      $("#ft-updated").textContent = formatDate(stats.updated_at) || formatDate(g.latest && g.latest.published);
      if (typeof total === "number") $("#ft-total").textContent = formatNumber(total);
      if (typeof releases === "number") $("#ft-releases").textContent = formatNumber(releases);
      if (typeof stars === "number") $("#ft-stars").textContent = formatNumber(stars);
    }

    const assets = pickAssets(latest);
    const winPanel = $("#win-assets");
    const linuxPanel = $("#linux-assets");

    if (assets.windows.length) {
      winPanel.innerHTML = "";
      assets.windows.forEach((a) => winPanel.appendChild(assetCard(a, "windows")));
    }
    if (assets.linux.length) {
      linuxPanel.innerHTML = "";
      assets.linux.forEach((a) => linuxPanel.appendChild(assetCard(a, "linux")));
    }
  }

  async function loadLiveStats() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.fetched < CACHE_TTL) {
        renderStats(cached.data, "live");
        initPrimaryButton(cached.data);
        return;
      }
      const [rels, repo] = await Promise.all([
        fetchWithTimeout(API_RELEASES, 10000),
        fetchWithTimeout(API_REPO, 10000),
      ]);

      let total = 0;
      const latest = rels[0] || {};
      const flatAssets = (latest.assets || []).map((a) => ({
        name: a.name,
        size: a.size,
        download_count: a.download_count,
        url: a.browser_download_url || a.url,
      }));
      const allAssets = [];
      for (const r of rels) {
        for (const a of r.assets || []) {
          total += a.download_count || 0;
          allAssets.push(a);
        }
      }

      const data = {
        fetched: Date.now(),
        data: {
          updated_at: new Date().toISOString(),
          github: {
            total_downloads: total,
            releases_count: rels.length,
            assets_count: allAssets.length,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            latest: {
              tag: latest.tag_name,
              name: latest.name,
              published: latest.published_at,
              url: latest.html_url,
              assets: flatAssets,
            },
          },
        },
      };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
      renderStats(data.data, "live");
      initPrimaryButton(data.data);
    } catch {
      try {
        const fallback = await fetchWithTimeout(STATS_URL, 8000);
        renderStats(fallback, "snapshot");
        initPrimaryButton(fallback);
      } catch {
        /* بقيّ الهيكل الثابت */
      }
    }
  }

  function countUp(el, target, duration) {
    if (!el || typeof target !== "number") return;
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNumber(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- زر التحميل الأساسي حسب النظام ---------- */
  function initPrimaryButton(stats) {
    const btn = $("#btn-primary-download");
    const label = $("#btn-primary-label");
    const hint = $("#os-hint");
    const os = detectOS();

    const latest = (stats && stats.github && stats.github.latest) || {};
    let assets = [];
    if (latest.assets && Array.isArray(latest.assets)) assets = latest.assets;
    else if (latest.assets) {
      assets = [].concat(latest.assets.windows || [], latest.assets.linux || []);
    }
    const find = (re) => assets.find((a) => re.test(a.name.toLowerCase()));

    if (os === "windows") {
      const target = find(/setup.*\.zip/) || find(/portable.*\.zip/) || find(/\.zip/) || find(/setup/) || find(/portable/);
      if (target) {
        btn.href = target.url;
        label.textContent = "حمّل لنظام Windows";
        hint.textContent = "✓ تم اكتشاف نظامك — " + getAssetLabel(target.name) + " · " + formatSize(target.size);
      }
    } else if (os === "linux") {
      const target = find(/\.deb/) || find(/appimage/);
      if (target) {
        btn.href = target.url;
        label.textContent = "حمّل لنظام Linux";
        hint.textContent = "✓ تم اكتشاف نظامك — " + getAssetLabel(target.name) + " · " + formatSize(target.size);
      }
    } else if (os === "mac") {
      label.textContent = "حمّل من الإصدارات";
      hint.textContent = "لم يُنشر إصدار رسمي لـ macOS بعد — تابع صفحة الإصدارات أو ابنِه من الكود.";
    } else {
      label.textContent = "حمّل الآن";
      hint.textContent = "اختر نظامك من الأقسام أدناه للحصول على الصيغة المناسبة.";
    }
  }

  /* ---------- التبويبات ---------- */
  function initTabs() {
    // تبويبات المنصات
    const tabs = $$("#platform-tabs .dl-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
        $$(".dl-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        const panel = $('.dl-panel[data-panel="' + tab.dataset.platform + '"]');
        if (panel) panel.classList.add("active");
      });
    });

    // تبويبات لقطات الشاشة
    const shots = $$(".shot-tab");
    shots.forEach((tab) => {
      tab.addEventListener("click", () => {
        shots.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        const img = $("#shot-img");
        const caption = $("#shot-caption");
        const dark = tab.dataset.shot === "dark";
        img.style.opacity = "0";
        setTimeout(() => {
          img.src = dark ? "assets/screenshot-dark.png" : "assets/screenshot-light.png";
          img.alt = dark ? "لقطة شاشة للتطبيق في الوضع الليلي" : "لقطة شاشة للتطبيق في الوضع النهاري";
          caption.textContent = dark ? "الوضع الليلي" : "الوضع النهاري";
          img.style.opacity = "1";
        }, 180);
      });
    });
  }

  /* ---------- أزرار النسخ ---------- */
  function initCopyButtons() {
    $$(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.dataset.copy;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        const original = btn.textContent;
        btn.textContent = "✓ تم النسخ";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1800);
      });
    });
  }

  /* ---------- حركات الظهور + تظليل التنقل ---------- */
  function initReveal() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function initScrollspy() {
    const links = $$(".nav-links a");
    const sections = links
      .map((l) => $(l.getAttribute("href")))
      .filter(Boolean);

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = "#" + e.target.id;
            links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- القائمة على الجوال ---------- */
  function initMobileMenu() {
    const btn = $("#menu-btn");
    const links = $("#nav-links");
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      btn.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
    $$("#nav-links a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- زر العودة للأعلى ---------- */
  function initBackTop() {
    const btn = $("#back-top");
    const onScroll = () => btn.classList.toggle("show", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------- التشغيل ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();

    initTheme();
    initTabs();
    initCopyButtons();
    initReveal();
    initScrollspy();
    initMobileMenu();
    initBackTop();

    // الخطوات: ملء سريع من اللقطة المحلية ثم تحديث حي
    loadLiveStats();
  });
})();

<p align="center">
  <img src="resources/icons/icon.png" alt="شعار التقوى" width="120" height="120" />
</p>

<h1 align="center">التقوى — Altaqwaa</h1>

<p align="center">
  <b>مصحف ومكتبة إسلامية شاملة لسطح المكتب</b><br/>
  يعمل دون اتصال بالإنترنت · مجاني ومفتوح المصدر إلى الأبد (GPL-3.0)
</p>

<p align="center">
  <a href="https://github.com/rn0x/altaqwaa-desktop/releases/latest"><img src="https://img.shields.io/github/v/release/rn0x/altaqwaa-desktop?color=%230f766e&label=%D8%A7%D9%84%D8%A5%D8%B5%D8%AF%D8%A7%D8%B1" alt="آخر إصدار" /></a>
  <a href="https://github.com/rn0x/altaqwaa-desktop/blob/v4/LICENSE"><img src="https://img.shields.io/badge/الرخصة-GPL--3.0-success" alt="الرخصة" /></a>
  <a href="#"><img src="https://img.shields.io/badge/المنصات-Linux%20%7C%20Windows-teal" alt="المنصات" /></a>
  <a href="https://github.com/rn0x/altaqwaa-desktop/releases"><img src="https://img.shields.io/github/downloads/rn0x/altaqwaa-desktop/total?color=%230f766e&label=%D8%A7%D9%84%D8%AA%D8%AD%D9%85%D9%8A%D9%84%D8%A7%D8%AA" alt="إجمالي التحميلات" /></a>
  <a href="https://github.com/rn0x/altaqwaa-desktop/stargazers"><img src="https://img.shields.io/github/stars/rn0x/altaqwaa-desktop?label=%D8%A7%D9%84%D9%86%D8%AC%D9%88%D9%85" alt="النجوم" /></a>
</p>

<p align="center">
  <a href="https://flathub.org/en/apps/org.altaqwaa.Altaqwaa"><img src="https://flathub.org/assets/badges/flathub-badge-en.png" alt="Download on Flathub" height="64" /></a>
  <a href="https://snapcraft.io/altaqwaa"><img src="https://snapcraft.io/static/images/badges/en/snap-store-black.svg" alt="Get it from the Snap Store" height="64" /></a>
  <a href="https://github.com/rn0x/altaqwaa-desktop/releases/latest"><img src="https://img.shields.io/badge/تحميل_من_Releases-4.0.0-181717?logo=github" alt="التحميل من GitHub Releases" height="64" /></a>
</p>

تطبيق إسلامي متكامل يضع المصحف والمكتبة بين يديك دون إنترنت: النص القرآني بالخط العثماني (مجمع الملك فهد)، التفسير الميسر، الأذكار، حصن المسلم، مواقيت الصلاة، المسبحة، وأكثر من 35,000 مادة إسلامية — كلها محلياً على جهازك، بلا حسابات ولا تتبع ولا خوادم.

> **English:** Altaqwaa is an offline-first Islamic desktop application built with Electron + React: full Quran (Uthmani script), Tafsir, adhkar, Hisn al-Muslim, prayer times, tasbih, and a 35,000+ item Islamic library. No accounts, no tracking, no third-party servers.

---

## جدول المحتويات

- [التنزيل](#التنزيل)
- [المميزات](#المميزات)
- [لقطات الشاشة](#لقطات-الشاشة)
- [التطوير](#التطوير)
- [البناء والتغليف](#البناء-والتغليف)
- [بنية المشروع](#بنية-المشروع)
- [الأمان والخصوصية](#الأمان-والخصوصية)
- [المساهمة](#المساهمة)
- [الترخيص](#الترخيص)

---

## التنزيل

### 🪟 Windows

| النسخة | الرابط المباشر |
|---|---|
| **المثبّت** (NSIS — يدعم تغيير مسار التثبيت) | [Altaqwaa-Setup-4.0.0.zip](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/Altaqwaa-Setup-4.0.0.zip) |
| **المحمولة** (بدون تثبيت) | [Altaqwaa-4.0.0-portable.zip](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/Altaqwaa-4.0.0-portable.zip) |

### 🐧 Linux

| الطريقة | الأمر / الرابط |
|---|---|
| **Snap Store** | `sudo snap install altaqwaa` — [snapcraft.io/altaqwaa](https://snapcraft.io/altaqwaa) |
| **Flathub** | `flatpak install flathub org.altaqwaa.Altaqwaa` — [flathub.org](https://flathub.org/en/apps/org.altaqwaa.Altaqwaa) |
| **AppImage** | [Altaqwaa-4.0.0.AppImage](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/Altaqwaa-4.0.0.AppImage) — ثم `chmod +x` |
| **deb** (Debian/Ubuntu) | [altaqwaa_4.0.0_amd64.deb](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/altaqwaa_4.0.0_amd64.deb) |
| **rpm** (Fedora/RHEL) | [altaqwaa-4.0.0.x86_64.rpm](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/altaqwaa-4.0.0.x86_64.rpm) |
| **أرشيف tar.gz** | [altaqwaa-4.0.0.tar.gz](https://github.com/rn0x/altaqwaa-desktop/releases/download/v4.0.0/altaqwaa-4.0.0.tar.gz) |

> جميع الإصدارات السابقة: [GitHub Releases](https://github.com/rn0x/altaqwaa-desktop/releases) · الملفات غير موقّعة رقمياً — قد تظهر تحذيرات SmartScreen على Windows.

### من الكود المصدري

> **متطلب أساسي: [Git LFS](https://git-lfs.com)** — ملفات البيانات الكبيرة (القرآن، المكتبة، الصوتيات) مخزنة عبر Git LFS؛ بدون تفعيله لن يعمل التطبيق.

```bash
git lfs install                                   # مرة واحدة على جهازك
git clone https://github.com/rn0x/altaqwaa-desktop.git
cd altaqwaa-desktop
npm install
npm start
```

---

## المميزات

- **المصحف كاملاً** — نص بخط عثماني (مجمع الملك فهد)، مع التحكم بحجم الخط ووضع القراءة المريح
- **التفسير الميسر** — تفسير معاصر لكل آية، بجانب الآية مباشرة
- **الأذكار** — أذكار الصباح والمساء مع تذكيرات صوتية في الأوقات المحددة
- **حصن المسلم** — الأذكار والأدعية حسب الموقف، منقحة
- **مواقيت الصلاة** — حساب محلي بـ 10 طرق حسابية (لا يُرسل موقعك لأي جهة)، مع تحديد الموقع يدوياً أو عبر GPS
- **الأذان** — تنبيه وصوت الأذان عند دخول الوقت، مع خيار إضافة صوت أذان من جهازك
- **المسبحة** — تسبيح مع إحصائيات يومية وشهرية وسنوية، وأذكار مخصصة
- **المكتبة** — أكثر من 35,000 مادة: خطب، فتاوى، كتب، تاريخ إسلامي، أسئلة ومسابقات، تنقّب بذكاء
- **القراء** — تلاوات بث مباشر، أو تحميل محلي للاستماع بدون إنترنت
- **إذاعات قرآنية** — بث مباشر لقنوات قرآنية متعددة (177 إذاعة)
- **بحث عربي ذكي** — تصحيح إملائي، اقتراحات، وترجيح دلالي (BM25) على كامل المكتبة
- **الوضع الليلي والنهاري** — تصميم عربي RTL أنيق مع وضعين كاملين
- **الخصوصية أولاً** — كل البيانات محلية: لا حسابات، لا تتبع، لا خوادم طرف ثالث
- **فحص التحديثات تلقائياً** — يتحقق من إصدار جديد من المستودع الرسمي على GitHub ويخبرك عند توفره

---

## لقطات الشاشة

| الوضع الليلي | الوضع النهاري |
|---|---|
| ![الوضع الليلي](screenshots/home-dark.png) | ![الوضع النهاري](screenshots/home-light.png) |

---

## التطوير

المتطلبات: **Node.js 20+** و **npm** و **Git LFS**.

```bash
npm install                # تثبيت الاعتماديات
npm run dev                # بيئة التطوير (Hot Reload) — Vite + Electron
npm test                   # تشغيل الاختبارات (27 اختباراً)
```

> المكتبة مرفقة كاملة في `resources/library/` (لقطة جاهزة ~344MB): تُنسخ إلى بيانات المستخدم تلقائياً في أول تشغيل (~2 ثانية) — لا تحتاج إنترنت ولا خط أنابيب بناء.

---

## البناء والتغليف

> كل أمر تغليف يبني الواجهة (React) تلقائياً ثم يبدأ التغليف — المخرجات في `dist/`.

```bash
npm run pack:linux         # AppImage + deb + rpm + flatpak + tar.gz
npm run pack:snap          # Snap فقط (يتطلب snapcraft + LXD)
npm run pack:win           # Windows: Setup.exe (NSIS) + Portable.exe
npm run pack:mac           # macOS (يجب البناء من macOS أو CI)
```

أوامر مفصّلة أكثر: `pack:appimage` · `pack:deb` · `pack:rpm` · `pack:flatpak` · `pack:pacman` · `pack:tar` · `pack:win:portable` · `dist` (لمنصة الجهاز الحالي) · `clean`.

### المتطلبات حسب المنصة

| الحزمة | المتطلبات الإضافية |
|---|---|
| **deb / rpm** | `libxcrypt-compat` على Fedora/RHEL (يوفّر `libcrypt.so.1` لأداة fpm) |
| **Flatpak** | `flatpak` + `flatpak-builder` + بيئة `org.freedesktop.Platform//24.08` وقاعدة `Electron2.BaseApp//24.08` |
| **Snap** | `snapcraft` + `LXD`؛ على Fedora أضِف `lxdbr0` لمنطقة trusted في firewalld وإلا تتجمد الحاوية على "Timed out waiting for networking" |
| **Windows (من Linux)** | Wine (لتضمين الأيقونة ومعلومات الإصدار) — غير مطلوب عند البناء من Windows نفسه |
| **pacman** | `makepkg` — يتطلب Arch Linux أو CI |

> **ملاحظة Fedora**: `/tmp` ذاكرة مؤقتة (tmpfs) وقد تمتلئ مع حجم المكتبة — استخدم `TMPDIR=/var/tmp npx electron-builder --linux …` عند فشل الحزم برسالة `Disk quota exceeded`.

---

## بنية المشروع

```
├── electron/            ← الخلفية (ESM)
│   ├── main.mjs           الدخول: الإقلاع، العلبة، فحص التحديثات
│   ├── preload.cjs        جسر معزول → window.altaqwaa
│   ├── core/              منطق نقي: المسارات، البحث العربي (BM25)، المكتبة…
│   ├── services/          خدمات المجالات: الصلاة، الأذان، التحديثات، التنبيهات…
│   ├── ipc/               معالجات IPC (تحقق + تحديد معدل)
│   └── window/            النافذة + بروتوكول altaqwaa://
├── renderer/             ← الواجهة (React 19 + Vite) — 16 صفحة، RTL، وضعان
├── resources/            ← الأصول المرفقة: القرآن، المكتبة (~344MB)، الأذكار، الأصوات (Git LFS)
├── screenshots/          لقطات التوثيق
├── test/                 اختبارات ESM (node --test)
└── scripts/              dev.mjs (بيئة التطوير)
```

---

## الأمان والخصوصية

- `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false`
- الواجهة لا تتواصل إلا عبر الجسر الضيق `window.altaqwaa`
- إجبار HTTPS، حدود لحجم الاستجابات، وكتابة ذرّية للملفات
- لا تُرسل بياناتك لأي جهة: المكتبة والتسبيحات والإحداثيات والإعدادات كلها محلية

---

## المساهمة

أهلاً بك في المساهمة! يمكنك:

- الإبلاغ عن خطأ أو اقتراح ميزة عبر [Issues](https://github.com/rn0x/altaqwaa-desktop/issues)
- المساهمة بكود عبر [Pull Requests](https://github.com/rn0x/altaqwaa-desktop/pulls)
- دعم المشروع مالياً عبر [GitHub Sponsors](https://github.com/sponsors/rn0x)

قبل الشروع: شغّل `npm test` وتأكد من اجتياز جميع الاختبارات.

---

## الترخيص

هذا المشروع مرخّص بموجب **[GNU General Public License v3.0](LICENSE)** — مجاني ومفتوح المصدر إلى الأبد.

- المستودع: [github.com/rn0x/altaqwaa-desktop](https://github.com/rn0x/altaqwaa-desktop)
- الإصدارات: [GitHub Releases](https://github.com/rn0x/altaqwaa-desktop/releases)

> هذا التطبيق صدقة جارية لكل من ساهم فيه أو نشره — ولا تحرمونا من دعائكم.

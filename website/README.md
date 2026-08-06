# موقع التقوى الرسمي للتحميل

صفحة هبوط (Landing Page) ثابتة 100% — HTML + CSS + JavaScript خالص، بدون أي اعتماديات أو خطوات بناء.
جاهزة للنشر على **GitHub Pages** أو أي استضافة ثابتة (Cloudflare Pages / Netlify / Vercel / أي خادم).

## البنية

```
website/
├── index.html             ← الصفحة الرئيسية (RTL عربية، SEO كاملة)
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/style.css      ← نظام التصميم (ليلي/نهاري · متجاوب)
│   ├── js/main.js         ← التفاعلات والإحصائيات الحية
│   ├── stats.json         ← لقطة إحصائيات (يُحدّثها GitHub Actions)
│   ├── icon.png · favicon.svg
│   └── screenshot-*.png
```

## النشر على GitHub Pages (تلقائي)

1. ارفع الكود إلى فرع `main` — العملية `.github/workflows/deploy-pages.yml` تنشر تلقائياً
   عند أي تعديل داخل `website/**`.
2. من إعدادات المستودع: **Settings ← Pages ← Source: GitHub Actions**.
3. الموقع سيظهر على: `https://<اسمك>.github.io/altaqwaa-desktop/`

> يعمل أيضاً بنشر الفرع/المجلد مباشرة: اختر `main` + `/website` من إعدادات Pages.

## النشر على استضافة أخرى

الموقع ثابت بالكامل بمسارات نسبية — ارفع محتويات `website/` كما هي إلى جذر الاستضافة
(Netlify Drop / Cloudflare Pages / أي CDN)، ولا حاجة لأي إعداد.

## الإحصائيات الحية

- المتصفح يجلب **بيانات حية من GitHub API** عند فتح الصفحة (عدّادات تحميل الإصدارات،
  عدد الإصدارات، النجوم) مع تخزين مؤقت 6 ساعات.
- عند تعذّر الوصول لـ GitHub API، يقرأ لقطة `assets/stats.json` كاحتياطي.
- العملية `.github/workflows/update-stats.yml` تعيد توليد اللقطة **يومياً** (وأيضاً عند
  نشر إصدار جديد) تلقائياً وترفعها للمستودع.

### لماذا لا توجد أرقام لـ Flathub و Snap؟

كلاهما لا يوفّر عدّادات تحميل عامة عبر واجهات برمجية عامة، لذلك يعرض الموقع عدّادات
GitHub Releases الرسمية فقط (واضحة المصدر، وليست تخمينية) مع رابطي المتجرين.

## ملاحظات

- `sitemap.xml` و `robots.txt` يشيران لـ `altaqwaa.i8x.net` — غيّرهما إن كنت تنشر على نطاق آخر.
- لتجربة محلية: `python3 -m http.server 8899` داخل `website/` ثم افتح `http://localhost:8899`.

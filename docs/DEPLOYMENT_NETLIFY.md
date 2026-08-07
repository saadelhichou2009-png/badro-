# نشر الواجهة الأمامية على Netlify — TradePulse

## ⚠️ تنبيه مهم قبل البدء

Netlify يستضيف **الواجهة الأمامية فقط** (Next.js). لا يمكنه استضافة:
- الـ **Backend** (Express + Node.js طويل التشغيل)
- **PostgreSQL** (قاعدة البيانات)
- **Redis** (الـ Cache)

لذلك يجب نشر الـ Backend في مكان آخر **أولاً** (VPS عبر `docs/DEPLOYMENT_VPS.md`، أو خدمة مُدارة مثل Render / Railway / Fly.io)، ثم توصيل الواجهة به عبر متغير بيئة.

---

## 1) انشر الـ Backend أولاً واحصل على رابطه

مثال: `https://api.yourdomain.com` (عبر VPS) أو `https://tradepulse-backend.onrender.com` (عبر Render).

تأكد أن الـ Backend يعمل ويرد على:
```bash
curl https://your-backend-url/health
```

## 2) أنشئ الموقع على Netlify

### عبر واجهة Netlify مباشرة (الأسهل)
1. ادفع مجلد `frontend/` إلى مستودع Git (GitHub/GitLab/Bitbucket) — يجب أن يكون `frontend` إما مستودعاً منفصلاً أو تحدد **Base directory** إن كان جزءاً من مستودع أكبر.
2. من لوحة Netlify: **Add new site → Import an existing project** → اختر المستودع.
3. إعدادات البناء (يقرأها Netlify تلقائياً من `netlify.toml` الموجود في `frontend/`، لكن تأكد يدوياً من):
   - **Base directory**: `frontend` (إذا كان المستودع يحتوي المشروع كاملاً وليس الواجهة فقط)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### أو عبر Netlify CLI
```bash
cd frontend
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## 3) اضبط متغير البيئة (خطوة إلزامية)

من لوحة تحكم الموقع في Netlify: **Site settings → Environment variables** أضف:

| المتغير | القيمة |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url/api/v1` |

> بما أن هذا المتغير يبدأ بـ `NEXT_PUBLIC_`، يتم تضمينه في كود المتصفح وقت البناء — لذا **أعد نشر الموقع (Trigger deploy) بعد أي تعديل عليه**.

## 4) اسمح للواجهة بالوصول للـ Backend (CORS)

في إعدادات الـ Backend (`backend/.env`)، أضف دومين Netlify إلى `CORS_ORIGINS`:

```
CORS_ORIGINS=https://your-site-name.netlify.app,https://your-custom-domain.com
```

ثم أعد تشغيل الـ Backend لتفعيل التغيير.

## 5) اجعل الموقع عاماً (وليس Private)

هذه هي المشكلة التي ظهرت في لقطة الشاشة سابقاً — مشاريع Netlify الجديدة على بعض الخطط تكون **خاصة (Private)** افتراضياً:

1. من لوحة تحكم الموقع: **Site configuration → Visitor access** (أو الشريط الأخضر أعلى المعاينة مباشرة).
2. اختر **Public** بدلاً من **Private**، أو أدر قائمة الأعضاء المسموح لهم بالوصول إذا أردت إبقاءه خاصاً لفريقك فقط.

## 6) (اختياري) دومين مخصص + SSL

**Domain settings → Add custom domain** — Netlify يصدر شهادة SSL تلقائياً (Let's Encrypt) خلال دقائق بعد ربط الدومين.

---

## التحقق بعد النشر

- افتح رابط الموقع (`https://your-site-name.netlify.app`) — يجب أن تظهر صفحة تسجيل الدخول مباشرة (وليس 404)، لأن `src/app/page.tsx` يُحوّل تلقائياً إلى `/login`.
- جرّب تسجيل حساب جديد؛ إذا ظهر خطأ شبكة، تحقق من:
  1. صحة `NEXT_PUBLIC_API_URL` (بدون `/` زائدة في النهاية، ومع `/api/v1`)
  2. أن `CORS_ORIGINS` في الـ Backend يتضمن دومين Netlify **بالضبط** (بروتوكول https وبدون `/` في النهاية)
  3. أن الـ Backend يعمل فعلاً (`curl .../health`)

## استكشاف الأخطاء الشائعة على Netlify تحديداً

| المشكلة | السبب | الحل |
|---|---|---|
| صفحة 404 "Page introuvable" فور فتح الرابط | البناء فشل، أو `publish` directory خاطئ، أو البلجن غير مُثبَّت | تحقق من سجل الـ Deploy في Netlify، وتأكد من وجود `@netlify/plugin-nextjs` في `netlify.toml` و`package.json` |
| "Ce projet est privé" | الموقع بوضع Private افتراضياً | الخطوة 5 أعلاه |
| الصفحة تفتح لكن كل طلبات API تفشل (Network Error) | `NEXT_PUBLIC_API_URL` غير مضبوط أو خاطئ | اضبطه من Environment variables وأعد النشر |
| خطأ CORS في console المتصفح | دومين Netlify غير مُدرَج في `CORS_ORIGINS` بالـ Backend | حدّث `CORS_ORIGINS` وأعد تشغيل الـ Backend |
| الموقع يعمل لكن تسجيل الدخول لا يحفظ الجلسة | طبيعي إذا كان الـ Backend غير مستضاف بعد (لا يوجد رد فعلي) | تأكد من ربط Backend حقيقي أولاً |

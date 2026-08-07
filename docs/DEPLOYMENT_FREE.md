# النشر المجاني بالكامل — TradePulse (بدون بطاقة ائتمان)

هذا الدليل ينشر المشروع كاملاً **مجاناً 100%** باستخدام:

| الخدمة | الاستخدام | لماذا مجانية دائماً |
|---|---|---|
| **Neon** (neon.tech) | قاعدة بيانات PostgreSQL | Free tier دائم: 0.5GB تخزين، لا يحتاج بطاقة ائتمان |
| **Upstash** (upstash.com) | Redis (اختياري) | Free tier دائم: 10,000 أمر/يوم، لا يحتاج بطاقة ائتمان |
| **Render** (render.com) | استضافة الـ Backend (Node.js) | Free tier دائم لخدمات Web Service، لا يحتاج بطاقة ائتمان |
| **Netlify** (netlify.com) | استضافة الواجهة الأمامية (Next.js) | Free tier دائم، فعّلته بالفعل |

> ⚠️ القيد الوحيد: الخطة المجانية في Render "تنام" الخدمة بعد 15 دقيقة من عدم الاستخدام، فأول طلب بعدها يأخذ 30-50 ثانية ليستيقظ السيرفر (Cold Start). هذا طبيعي تماماً في الخطط المجانية ولا يوجد حل مجاني بديل تفادياً لذلك، لكنه لا يؤثر على عمل المشروع.

---

## الخطوة 1: قاعدة البيانات المجانية (Neon)

1. اذهب إلى [neon.tech](https://neon.tech) → **Sign up** (يمكنك الدخول مباشرة بحساب GitHub/Google بدون بطاقة).
2. أنشئ مشروعاً جديداً (**Create a project**) — اختر أي اسم واختر أقرب منطقة جغرافية لك.
3. من لوحة المشروع، اذهب لتبويب **Connection Details** وانسخ **Connection string** — يكون بالشكل:
   ```
   postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. احتفظ بهذا الرابط — ستحتاجه في الخطوة 3 كقيمة لـ `DATABASE_URL`.

---

## الخطوة 2: Redis المجاني (Upstash) — اختياري لكن موصى به

النظام يعمل بدون Redis (يتعطل الـ Caching فقط دون أي خطأ)، لكن تفعيله يسرّع لوحة التحكم.

1. اذهب إلى [upstash.com](https://upstash.com) → **Sign up** (بحساب GitHub مباشرة).
2. **Create Database** → اختر **Redis** → اختر أي اسم ومنطقة قريبة منك → **Regional** (وليس Global، أبسط وكافٍ لمشروعنا).
3. من لوحة قاعدة البيانات، انسخ **"Redis Connect URL"** — يكون بالشكل:
   ```
   rediss://default:xxxxxxxxxxxx@region-name-12345.upstash.io:6379
   ```
4. احتفظ به لقيمة `REDIS_URL`.

---

## الخطوة 3: نشر الـ Backend (Render)

1. ادفع مجلد المشروع (أو مجلد `backend/` تحديداً) إلى مستودع GitHub.
2. اذهب إلى [render.com](https://render.com) → **Sign up** بحساب GitHub.
3. **New → Web Service** → اربط المستودع الذي رفعته.
4. الإعدادات:
   - **Root Directory**: `backend` (إن كان المستودع يحوي المشروع كاملاً)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Instance Type**: **Free**
5. أضف متغيرات البيئة التالية من قسم **Environment**:

   | المتغير | القيمة |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | رابط Neon من الخطوة 1 |
   | `REDIS_URL` | رابط Upstash من الخطوة 2 (اتركه فارغاً إن تخطيته) |
   | `JWT_ACCESS_SECRET` | نص عشوائي طويل (ولّده بأمر `openssl rand -hex 32` أو أي مولّد كلمات مرور) |
   | `JWT_REFRESH_SECRET` | نص عشوائي طويل آخر مختلف |
   | `API_KEY_SECRET` | نص عشوائي طويل ثالث مختلف |
   | `APP_URL` | رابط موقع Netlify الخاص بك (مثال: `https://tredirbot.netlify.app`) |
   | `CORS_ORIGINS` | نفس رابط Netlify بالضبط |
   | `BCRYPT_SALT_ROUNDS` | `12` |

6. اضغط **Create Web Service**. سيبدأ البناء تلقائياً (يأخذ دقيقتين إلى خمس دقائق).
7. بعد نجاح النشر، انسخ رابط الخدمة من أعلى الصفحة (مثال: `https://tradepulse-backend.onrender.com`).
8. تحقق:
   ```bash
   curl https://tradepulse-backend.onrender.com/health
   ```

> 💡 ملف `render.yaml` الموجود في جذر المشروع يحتوي هذه الإعدادات جاهزة — يمكنك استخدام **"New → Blueprint"** في Render بدلاً من الخطوات اليدوية أعلاه، فيقرأه Render تلقائياً ويولّد أسرار JWT/API_KEY عشوائياً بنفسه.

---

## الخطوة 4: ربط الواجهة الأمامية (Netlify) بالـ Backend الجديد

بما أن موقعك على Netlify (`tredirbot.netlify.app`) منشور بالفعل:

1. من لوحة تحكم الموقع في Netlify: **Site configuration → Environment variables**.
2. عدّل أو أضف:
   ```
   NEXT_PUBLIC_API_URL = https://tradepulse-backend.onrender.com/api/v1
   ```
3. **مهم جداً**: اذهب لتبويب **Deploys** واضغط **Trigger deploy → Deploy site** — القيمة الجديدة لا تُطبَّق إلا بعد إعادة بناء كاملة (لأنها تُدمَج في الكود وقت البناء).

---

## الخطوة 5: التحقق النهائي

1. افتح `https://tredirbot.netlify.app/login` وجرّب تسجيل الدخول بالحساب الذي أنشأته سابقاً.
2. إن ظهر نفس الخطأ، افتح **Developer Tools → Network** وشاهد تفاصيل رد الخادم الفعلي.
3. إن كانت هذه أول محاولة تسجيل دخول بعد نشر الـ Backend حديثاً، شغّل أولاً إنشاء المستخدم من جديد (قاعدة Neon فارغة تماماً في البداية):
   ```bash
   curl -X POST https://tradepulse-backend.onrender.com/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Saad","lastName":"Elhichou","email":"saadelhichou@gmail.com","password":"Str0ng@Pass123"}'
   ```
   (النظام يتطلب تفعيل البريد لاحقاً — بما أن SMTP غير مُعد، راجع القسم التالي)

---

## ⚠️ ملاحظة: تفعيل البريد الإلكتروني بدون SMTP مدفوع

بدون إعداد SMTP، لن يصل بريد التفعيل فعلياً (الكود يسجّل ذلك في الـ logs فقط ولا يوقف التسجيل). للتجربة السريعة **بدون** خدمة بريد:

**خيار مجاني لـ SMTP**: [Resend](https://resend.com) يعطي 100 بريد/يوم مجاناً بدون بطاقة ائتمان، أو [Brevo](https://www.brevo.com) (سابقاً Sendinblue) يعطي 300 بريد/يوم مجاناً. أنشئ حساباً واحصل على SMTP credentials وضعها في متغيرات Render:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=<مفتاح API من Resend>
SMTP_FROM=onboarding@resend.dev
```

بدون هذا، يمكنك تفعيل الحساب يدوياً من قاعدة البيانات مباشرة عبر Neon (تبويب **SQL Editor** في لوحة Neon):
```sql
UPDATE users SET "isEmailVerified" = true WHERE email = 'saadelhichou@gmail.com';
```

---

## ملخص الروابط النهائية

| المكوّن | الرابط |
|---|---|
| الواجهة | `https://tredirbot.netlify.app` |
| الـ Backend API | `https://tradepulse-backend.onrender.com/api/v1` |
| قاعدة البيانات | Neon Dashboard |
| Redis | Upstash Dashboard |

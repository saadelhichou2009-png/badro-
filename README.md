<p align="center">
  <img src="./docs/assets/banner.svg" alt="TradePulse banner" width="100%" />
</p>

# TradePulse — منصة تحليل حسابات التداول

منصة SaaS احترافية لتحليل حسابات MT4/MT5 تلقائياً (مشابهة لـ Myfxbook / FX Blue)، من ربط الحساب عبر Expert Advisor إلى لوحة تحكم كاملة بالإحصائيات والرسوم البيانية.

## حالة المشروع: ✅ كل المراحل مكتملة

| المرحلة | المحتوى | الحالة |
|---|---|---|
| 1 | هيكل المشروع، Prisma Schema الكاملة، نظام المصادقة الكامل (Auth)، إدارة الملف الشخصي، Docker، ملفات البيئة | ✅ |
| 2 | وحدة الحسابات (Trading Accounts) + توليد/تجديد API Keys + وحدة استقبال بيانات الـ EA (account-info, trades, ping) | ✅ |
| 3 | وحدة الصفقات (Trades) + البحث/الفلترة/Pagination + وحدة الإحصائيات (Statistics) الكاملة مع Win Rate, Profit Factor, Drawdown... إلخ | ✅ |
| 4 | Expert Advisor لـ MT4 (MQL4) و MT5 (MQL5) كاملين | ✅ |
| 5 | الواجهة الأمامية Next.js + TailwindCSS + TypeScript (تسجيل الدخول، Dashboard، الرسوم البيانية، جدول الصفقات) | ✅ |
| 6 | Background Jobs (إعادة حساب الإحصائيات، رصد الحسابات المنقطعة)، Caching بـ Redis، Notifications | ✅ |
| 7 | التوثيق الكامل (نشر VPS، ربط MT4/MT5 خطوة بخطوة، مرجع API) + اختبارات Integration | ✅ |

## 📚 التوثيق

- [`docs/SETUP.md`](./docs/SETUP.md) — التثبيت والتشغيل (محلي + Docker)
- [`docs/EA_INSTALLATION.md`](./docs/EA_INSTALLATION.md) — تركيب الـ EA على MT4/MT5 خطوة بخطوة
- [`docs/DEPLOYMENT_FREE.md`](./docs/DEPLOYMENT_FREE.md) — 🆓 نشر المشروع كاملاً مجاناً 100% (Neon + Upstash + Render + Netlify)
- [`docs/DEPLOYMENT_VPS.md`](./docs/DEPLOYMENT_VPS.md) — النشر الكامل على VPS مع SSL
- [`docs/DEPLOYMENT_NETLIFY.md`](./docs/DEPLOYMENT_NETLIFY.md) — نشر الواجهة الأمامية على Netlify (مع ملاحظة: الـ Backend يحتاج استضافة منفصلة)
- [`docs/API.md`](./docs/API.md) — مرجع كل Endpoints الـ API

## هيكل المشروع

```
trading-platform/
├── backend/                 # Node.js + Express + TypeScript + Prisma
│   ├── src/
│   │   ├── modules/         # auth, users, accounts, trades, statistics...
│   │   ├── common/          # middlewares, errors, decorators
│   │   ├── config/          # env
│   │   ├── database/        # prisma client, redis
│   │   ├── jobs/             # background jobs (المرحلة 6)
│   │   └── utils/
│   ├── prisma/schema.prisma # قاعدة البيانات الكاملة (8 جداول)
│   └── Dockerfile
├── frontend/                 # Next.js (المرحلة 5)
├── ea/
│   ├── MT4/                  # Expert Advisor بلغة MQL4 (المرحلة 4)
│   └── MT5/                  # Expert Advisor بلغة MQL5 (المرحلة 4)
├── docker/
│   ├── docker-compose.yml       # إعداد الإنتاج
│   └── docker-compose.dev.yml   # إعداد التطوير
└── docs/                      # التوثيق الكامل (المرحلة 7)
```

## قاعدة البيانات (جاهزة بالكامل)

8 جداول مترابطة عبر Prisma:
`User`, `Session`, `TradingAccount`, `EquityHistory`, `Trade`, `Statistics`, `ApiKey`, `Notification`, `Log`

راجع `backend/prisma/schema.prisma` للتفاصيل الكاملة (Enums، العلاقات، الفهارس Indexes).

## نظام المصادقة (جاهز بالكامل)

كل المتطلبات المطلوبة تم تنفيذها في `backend/src/modules/auth`:

- `POST /api/v1/auth/register` — إنشاء حساب (مع تشفير bcrypt وإرسال بريد تفعيل)
- `POST /api/v1/auth/verify-email` — تفعيل البريد الإلكتروني
- `POST /api/v1/auth/login` — تسجيل الدخول (JWT Access + Refresh Token، مع تسجيل الجلسة)
- `POST /api/v1/auth/refresh` — تجديد access token
- `POST /api/v1/auth/logout` — تسجيل خروج (إبطال جلسة واحدة)
- `POST /api/v1/auth/logout-all` — تسجيل خروج من كل الأجهزة
- `POST /api/v1/auth/forgot-password` — طلب إعادة تعيين كلمة المرور
- `POST /api/v1/auth/reset-password` — تعيين كلمة مرور جديدة عبر التوكن
- `POST /api/v1/auth/change-password` — تغيير كلمة المرور (محمي)
- `GET  /api/v1/auth/me` — بيانات المستخدم الحالي (محمي)
- `GET/PATCH /api/v1/users/me` — عرض/تحديث الملف الشخصي (محمي)

**الحماية المطبّقة:** Helmet, CORS مقيّد, Rate Limiting (عام + صارم على auth), Validation بـ Zod، تشفير bcrypt (12 rounds)، JWT بسرّين منفصلين (access/refresh)، Audit Logs لكل عملية حساسة، حماية من SQL Injection عبر Prisma (parameterized queries)، معالجة أخطاء مركزية.

## وحدة الحسابات (جاهزة بالكامل)

`backend/src/modules/accounts` — كل المسارات محمية بـ JWT (المستخدم المسجل فقط):

- `POST /api/v1/accounts` — ربط حساب تداول جديد (MT4/MT5) وتوليد مفتاح API (يُعرض مرة واحدة فقط)
- `GET /api/v1/accounts` — قائمة حسابات المستخدم (مع Pagination)
- `GET /api/v1/accounts/:id` — تفاصيل حساب واحد + إحصائياته
- `PATCH /api/v1/accounts/:id` — تحديث اسم الحساب / الخصوصية
- `DELETE /api/v1/accounts/:id` — حذف الحساب (يحذف صفقاته وسجلاته تلقائياً عبر Cascade)
- `POST /api/v1/accounts/:id/regenerate-key` — إبطال المفتاح القديم فوراً وتوليد مفتاح جديد

## وحدة استقبال بيانات الـ EA (جاهزة بالكامل)

`backend/src/modules/ingest` — محمية بهيدر `X-API-Key` (وليس JWT)، وهي التي سيتصل بها Expert Advisor المرحلة القادمة:

- `GET /api/v1/ingest/ping` — تحقق أن المفتاح صالح والاتصال يعمل
- `POST /api/v1/ingest/account-info` — إرسال لقطة الحساب (balance, equity, margin, freeMargin, marginLevel) كل دقيقة، ويُسجَّل تلقائياً في `EquityHistory` لرسم Equity Curve لاحقاً
- `POST /api/v1/ingest/trades` — إرسال دفعة صفقات (حتى 1000 صفقة) بعملية upsert آمنة بدون تكرار (بالاعتماد على ticket)
- `POST /api/v1/ingest/trade` — إرسال صفقة واحدة فور حدوثها (فتح/تعديل/إغلاق)

**ملاحظة:** الحساب يتحول تلقائياً من `PENDING` إلى `ACTIVE` عند أول استقبال بيانات، ولديه Rate Limit مستقل (`EA_INGEST_RATE_LIMIT_MAX`) بالاعتماد على مفتاح الـ API وليس IP، لأن عدة حسابات EA قد تشارك نفس عنوان الـ VPS.

مثال إرسال بيانات من طرف EA (سيُستخدم هذا الشكل بالضبط في المرحلة 4):

```bash
curl -X POST http://localhost:4000/api/v1/ingest/account-info \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tpk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"balance":10000,"equity":10250.5,"margin":120,"freeMargin":10130.5,"marginLevel":8541.2}'
```

## التشغيل السريع (Development)

```bash
cd backend
cp .env.example .env     # عدّل القيم (خصوصاً الأسرار وكلمات المرور)
npm install
npx prisma migrate dev --name init
npm run prisma:seed      # إنشاء حساب Admin افتراضي
npm run dev               # يعمل على http://localhost:4000
```

أو عبر Docker (بيئة تطوير كاملة: Postgres + Redis + Backend):

```bash
cd docker
docker compose -f docker-compose.dev.yml up --build
```

## اختبار سريع لواجهة التسجيل

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ahmed","lastName":"Ali","email":"ahmed@example.com","password":"Str0ng@Pass"}'
```

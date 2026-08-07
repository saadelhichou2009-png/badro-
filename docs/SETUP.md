# دليل التثبيت والتشغيل — TradePulse

## المتطلبات
- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (اختياري لكن موصى به - النظام يعمل بدونه مع تعطيل الـ Cache فقط)
- Docker وDocker Compose (للتشغيل المُعبّأ)

---

## 1) التشغيل بدون Docker (تطوير محلي)

### أ) قاعدة البيانات والـ Backend

```bash
cd backend
cp .env.example .env
```

عدّل `.env` وضع القيم الحقيقية، خصوصاً:
- `DATABASE_URL` — رابط اتصال PostgreSQL
- `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` — نصوص عشوائية طويلة (32+ حرف)
- `API_KEY_SECRET` — نص عشوائي آخر يُستخدم لتشفير (HMAC) مفاتيح الـ API

```bash
npm install
npx prisma migrate dev --name init   # ينشئ كل الجداول في القاعدة
npm run prisma:seed                   # ينشئ حساب Admin افتراضي (admin@tradingplatform.local / Admin@12345)
npm run dev                           # يعمل على http://localhost:4000
```

تحقق من عمل الخادم:
```bash
curl http://localhost:4000/health
```

### ب) الواجهة الأمامية

```bash
cd frontend
cp .env.example .env   # عدّل NEXT_PUBLIC_API_URL إذا لزم
npm install
npm run dev            # يعمل على http://localhost:3000
```

---

## 2) التشغيل عبر Docker (تطوير)

```bash
cd docker
docker compose -f docker-compose.dev.yml up --build
```

يشغّل PostgreSQL وRedis والـ Backend معاً. بعد التشغيل، نفّذ الهجرة مرة واحدة:

```bash
docker exec -it trading_backend_dev npx prisma migrate dev --name init
docker exec -it trading_backend_dev npm run prisma:seed
```

---

## 3) التشغيل عبر Docker (إنتاج)

راجع [`DEPLOYMENT_VPS.md`](./DEPLOYMENT_VPS.md) للتفاصيل الكاملة لنشر المشروع على خادم VPS من الصفر.

---

## 4) إعداد قاعدة البيانات يدوياً (بدون Docker)

```sql
CREATE USER trading_user WITH PASSWORD 'كلمة_مرور_قوية';
CREATE DATABASE trading_platform OWNER trading_user;
GRANT ALL PRIVILEGES ON DATABASE trading_platform TO trading_user;
```

ثم ضع رابط الاتصال في `DATABASE_URL`:
```
DATABASE_URL=postgresql://trading_user:كلمة_مرور_قوية@localhost:5432/trading_platform?schema=public
```

---

## 5) أوامر مفيدة

| الأمر | الوصف |
|---|---|
| `npm run prisma:studio` | فتح واجهة رسومية لتصفح قاعدة البيانات |
| `npm run prisma:migrate:dev` | إنشاء هجرة جديدة بعد تعديل `schema.prisma` |
| `npm run test` | تشغيل اختبارات الوحدة (Unit Tests) |
| `npm run test:cov` | تشغيل الاختبارات مع تقرير التغطية |
| `npm run lint` | فحص جودة الكود |

---

## 6) ربط أول حساب MT4/MT5

1. سجّل دخولك في الواجهة → اذهب لصفحة **الحسابات** → **ربط حساب جديد**.
2. املأ البيانات (اسم الحساب، رقم الحساب، الوسيط، السيرفر، المنصة).
3. عند الحفظ، ستظهر لك **مفتاح API** مرة واحدة فقط — انسخه فوراً.
4. اتبع دليل [`EA_INSTALLATION.md`](./EA_INSTALLATION.md) لتركيب الـ Expert Advisor في MT4/MT5 باستخدام هذا المفتاح.

# مرجع API الكامل — TradePulse

الرابط الأساسي: `https://api.yourdomain.com/api/v1` (أو `http://localhost:4000/api/v1` محلياً)

جميع الردود بصيغة JSON: `{ success: boolean, message?: string, data?: ... }`

---

## المصادقة (Auth) — `/auth`

| الطريقة | المسار | الوصف | محمي؟ |
|---|---|---|---|
| POST | `/auth/register` | إنشاء حساب جديد | لا |
| POST | `/auth/verify-email` | تفعيل البريد الإلكتروني عبر التوكن | لا |
| POST | `/auth/login` | تسجيل الدخول (يُعيد accessToken + refreshToken) | لا |
| POST | `/auth/refresh` | تجديد accessToken باستخدام refreshToken | لا |
| POST | `/auth/logout` | تسجيل خروج (إبطال جلسة واحدة) | لا |
| POST | `/auth/logout-all` | تسجيل خروج من كل الأجهزة | نعم (JWT) |
| POST | `/auth/forgot-password` | طلب رابط إعادة تعيين كلمة المرور بالبريد | لا |
| POST | `/auth/reset-password` | تعيين كلمة مرور جديدة عبر التوكن | لا |
| POST | `/auth/change-password` | تغيير كلمة المرور (بمعرفة الحالية) | نعم |
| GET | `/auth/me` | بيانات هوية المستخدم من التوكن | نعم |

**مثال تسجيل دخول:**
```bash
curl -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Str0ng@Pass"}'
```
الرد يحتوي `data.accessToken` — أرفقه في كل طلب لاحق كـ `Authorization: Bearer <token>`.

---

## المستخدم (Users) — `/users` (كل المسارات محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/users/me` | عرض الملف الشخصي |
| PATCH | `/users/me` | تحديث الاسم/المنطقة الزمنية/الصورة |
| POST | `/users/me/deactivate` | تعطيل الحساب |

---

## حسابات التداول (Accounts) — `/accounts` (محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| POST | `/accounts` | ربط حساب MT4/MT5 جديد + توليد مفتاح API (يظهر مرة واحدة فقط) |
| GET | `/accounts` | قائمة حسابات المستخدم (مع Pagination) |
| GET | `/accounts/:id` | تفاصيل حساب واحد |
| PATCH | `/accounts/:id` | تعديل اسم الحساب أو خاصية العرض العام |
| DELETE | `/accounts/:id` | حذف الحساب وكل صفقاته |
| POST | `/accounts/:id/regenerate-key` | إبطال المفتاح الحالي وتوليد مفتاح جديد |

**مثال ربط حساب:**
```bash
curl -X POST $API/accounts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"accountName":"حسابي الرئيسي","accountNumber":"123456","broker":"Exness","server":"Exness-Real","platform":"MT5","currency":"USD","leverage":100,"initialBalance":1000}'
```

---

## الصفقات (Trades) — `/accounts/:accountId/trades` (محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/accounts/:accountId/trades` | قائمة الصفقات (بحث/فلترة/ترتيب/Pagination) |
| GET | `/accounts/:accountId/trades/symbols` | قائمة الأزواج التي تم تداولها |
| GET | `/accounts/:accountId/trades/:tradeId` | تفاصيل صفقة واحدة |

**معاملات query لقائمة الصفقات:** `page`, `limit`, `symbol`, `type`, `status`, `search`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`

---

## الإحصائيات (Statistics) — `/accounts/:accountId/statistics` (محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/statistics` | كل المؤشرات (Win Rate, Profit Factor, Drawdown...) |
| GET | `/statistics/equity-curve` | نقاط Equity/Balance عبر الزمن |
| GET | `/statistics/daily-profit` | الأرباح مجمّعة يومياً |
| GET | `/statistics/weekly-profit` | الأرباح مجمّعة أسبوعياً |
| GET | `/statistics/monthly-profit` | الأرباح مجمّعة شهرياً |
| GET | `/statistics/distributions` | توزيع الأرباح حسب اليوم/الزوج/الساعة (لبناء Heatmap) |
| POST | `/statistics/recalculate` | إعادة حساب فورية يدوية |

---

## لوحة التحكم (Dashboard) — `/dashboard` (محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/dashboard` | نظرة عامة مجمّعة على كل حسابات المستخدم |
| GET | `/dashboard/:accountId` | لوحة تحكم حساب واحد (بيانات الحساب + إحصائياته) |

---

## الإشعارات (Notifications) — `/notifications` (محمية بـ JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/notifications?unread=true` | قائمة الإشعارات (اختيارياً غير المقروءة فقط) |
| PATCH | `/notifications/:id/read` | تحديد إشعار كمقروء |
| PATCH | `/notifications/read-all` | تحديد كل الإشعارات كمقروءة |

---

## استقبال بيانات الـ EA (Ingest) — `/ingest` (محمية بـ `X-API-Key`، **ليست** JWT)

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/ingest/ping` | تأكيد صلاحية مفتاح الـ API |
| POST | `/ingest/account-info` | لقطة الحساب (balance/equity/margin...) — تُسجَّل في Equity History وتُعيد حساب الإحصائيات |
| POST | `/ingest/trades` | دفعة صفقات (حتى 1000) — upsert بالاعتماد على `ticket` |
| POST | `/ingest/trade` | صفقة واحدة فورية |

**الهيدر المطلوب لكل طلبات ingest:**
```
X-API-Key: tpk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**مثال (يُستخدم داخلياً من الـ EA، وليس من الواجهة):**
```bash
curl -X POST $API/ingest/account-info \
  -H "X-API-Key: $ACCOUNT_API_KEY" -H "Content-Type: application/json" \
  -d '{"balance":10500.50,"equity":10320.10,"margin":200,"freeMargin":10120.10,"marginLevel":5160}'
```

---

## رموز الحالة (HTTP Status Codes)

| الكود | المعنى |
|---|---|
| 200 / 201 | نجاح |
| 400 | طلب غير صالح |
| 401 | غير مصرح (توكن/مفتاح مفقود أو غير صالح) |
| 403 | ممنوع (صلاحيات غير كافية أو حساب معطل) |
| 404 | العنصر غير موجود |
| 409 | تعارض (بريد إلكتروني مكرر مثلاً) |
| 422 | فشل التحقق من صحة المدخلات (تفاصيل الحقول في `errors`) |
| 429 | تجاوز حد الطلبات المسموح (Rate Limit) |
| 500 | خطأ داخلي في الخادم |

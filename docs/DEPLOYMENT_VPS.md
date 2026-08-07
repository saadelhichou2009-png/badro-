# دليل النشر على VPS (Production) — TradePulse

يفترض هذا الدليل خادم Ubuntu 22.04 نظيف، ودومين يشير إلى IP الخادم (سجل A).

---

## 1) تجهيز الخادم

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# تفعيل جدار الحماية
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 2) تثبيت Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable docker
```

## 3) استنساخ المشروع

```bash
git clone <رابط_مستودعك> trading-platform
cd trading-platform
```

## 4) ضبط متغيرات البيئة للإنتاج

```bash
cd backend && cp .env.example .env
```

عدّل القيم التالية إلزامياً:
- `NODE_ENV=production`
- `DATABASE_URL` بكلمة مرور قوية وفريدة
- `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` و `API_KEY_SECRET`: نصوص عشوائية 64 حرف على الأقل (استخدم `openssl rand -hex 32`)
- `APP_URL` و `CORS_ORIGINS`: دومين الواجهة الفعلي (مثال: `https://app.yourdomain.com`)
- `API_URL`: دومين الـ API (مثال: `https://api.yourdomain.com`)
- إعدادات SMTP الحقيقية لإرسال بريد التفعيل وإعادة تعيين كلمة المرور

```bash
cd ../frontend && cp .env.example .env
```
عدّل `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`

## 5) تشغيل الحاويات

```bash
cd ../docker
docker compose up -d --build
```

## 6) تنفيذ هجرة قاعدة البيانات

```bash
docker exec -it trading_backend npx prisma migrate deploy
docker exec -it trading_backend npm run prisma:seed
```

**غيّر كلمة مرور حساب الـ Admin الافتراضي فوراً بعد أول تسجيل دخول.**

## 7) تركيب شهادة SSL (Let's Encrypt) عبر Nginx كـ Reverse Proxy

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

مثال إعداد Nginx لتوجيه الدومينين إلى الحاويات (`/etc/nginx/sites-available/trading-platform`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/trading-platform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# إصدار شهادات SSL تلقائياً لكلا الدومينين
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

Certbot يجدد الشهادات تلقائياً كل 90 يوماً عبر cron مدمج.

## 8) النسخ الاحتياطي لقاعدة البيانات (موصى به يومياً)

```bash
# مثال سكربت يومي عبر cron
docker exec trading_postgres pg_dump -U trading_user trading_platform | gzip > backup_$(date +%F).sql.gz
```

أضفه إلى `crontab -e`:
```
0 3 * * * /path/to/backup-script.sh
```

## 9) المراقبة الأساسية

```bash
docker compose logs -f backend     # سجلات الـ Backend لحظياً
docker compose ps                  # حالة كل الحاويات
curl https://api.yourdomain.com/health
```

## 10) التحديث لاحقاً

```bash
git pull
docker compose up -d --build
docker exec -it trading_backend npx prisma migrate deploy
```

# Pro Teach — zamonaviy kasblar markazi sayti

Qo'qon shahridagi **Pro Teach** (ProTeach Academy — «Noldan IT mutaxassisigacha») o'quv markazi uchun
3 tilli (o'zbek, rus, ingliz) veb-sayt va o'zbek tilidagi admin panel.

## Imkoniyatlar

**Ochiq sayt** (`/uz/`, `/ru/`, `/en/`)
- Bosh sahifa: hero, markaz videosi, «Biz haqimizda» va afzalliklar, kurslar, yozilish formasi, kontaktlar va Yandex xarita
- Har bir kurs uchun alohida sahifa: `/uz/kurslar/:slug`, `/ru/kursy/:slug`, `/en/courses/:slug`
- Kursga yozilish formasi sahifa yangilanmasdan yuboriladi; telefon maskasi (`+998 XX XXX XX XX`)
- Spamdan himoya: yashirin honeypot maydon, IP bo'yicha limit (10 daqiqada 10 ta), server tomonida validatsiya
- Bir raqamdan 24 soat ichida takror kelgan ariza bloklanmaydi, «Takroriy» deb belgilanadi
- Telefonda pastda suzib turuvchi «Qo'ng'iroq qilish» tugmasi
- SEO: title/description, Open Graph, `hreflang`, `sitemap.xml`, `robots.txt`, JSON-LD (EducationalOrganization + LocalBusiness, Course)
- 404 va 500 sahifalari uch tilda; til tanlovi eslab qolinadi

**Admin panel** (`/admin`)
- Dashboard: yangi/jami arizalar, faol kurslar, haftalik grafik, oxirgi arizalar
- Arizalar: qidiruv, filtr, saralash, sahifalash, holat (Yangi / Bog'lanildi / Qabul qilindi / Rad etildi), admin izohi, **CSV va Excel (.xlsx) eksport**
- Kurslar: 3 tilda qo'shish/tahrirlash, rasm yuklash (avtomatik WebP), faol/nofaol, drag-and-drop tartiblash, o'chirish (arizalar saqlanib qoladi)
- Video: progress bar bilan yuklash, ko'rish, almashtirish, o'chirish, poster rasm, saytda ko'rsatish/yashirish
- Bog'lanish ma'lumotlari, sayt matnlari (hero, «Biz haqimizda», afzalliklar) — kod yozmasdan
- Sozlamalar: parolni o'zgartirish, adminlar qo'shish/o'chirish, Telegram holati va sinov xabari
- Yangi ariza kelganda menyuda «Yangi» belgisi (har daqiqada yangilanadi) va Telegram xabari

## Texnologiyalar

Node.js 22+ · Express 5 · EJS (server tomonida render) · SQLite (`better-sqlite3`) · vanilla JS/CSS (framework yo'q)
· `multer` + `sharp` (fayl yuklash, rasm optimallashtirish) · `helmet`, `express-rate-limit`, `bcrypt`, `express-session`, CSRF himoyasi.

## Papka tuzilishi

```
proteach/
├── server.js                 # kirish nuqtasi
├── src/
│   ├── app.js                # Express: xavfsizlik, statik fayllar, sessiya, xatolar
│   ├── config.js             # .env sozlamalari
│   ├── db/                   # SQLite ulanishi, migratsiyalar, seed, sessiya ombori
│   ├── i18n/                 # uz.js, ru.js, en.js — barcha tarjimalar
│   ├── middleware/           # csrf, auth, rate limit, fayl yuklash, shablon yordamchilari
│   ├── routes/               # ochiq sayt, SEO, admin/* bo'limlari
│   ├── services/             # kurslar, arizalar, sozlamalar, adminlar, media, telegram
│   └── utils/                # validatsiya, telefon, slug, CSV/XLSX, formatlash
├── views/                    # EJS shablonlar (public/ — sayt, admin/ — panel)
├── public/                   # css, js, img (logo, favicon, og-image), fonts
├── scripts/                  # build-assets.js (brend fayllari), backup.js (zaxira)
├── deploy/nginx.conf         # Nginx namunasi
├── ecosystem.config.js       # PM2 konfiguratsiyasi
├── data/                     # SQLite baza (avtomatik yaratiladi, git'ga kirmaydi)
└── uploads/                  # yuklangan video va rasmlar (git'ga kirmaydi)
```

## O'rnatish (lokal kompyuterda)

Talab: **Node.js 22 yoki undan yangi** (LTS tavsiya etiladi).

```bash
npm install
cp .env.example .env          # Windows: copy .env.example .env
```

`.env` faylini oching va kamida quyidagilarni to'ldiring:

```ini
NODE_ENV=development
HOST=0.0.0.0
SITE_URL=http://localhost:3000
SESSION_SECRET=<64+ belgili tasodifiy satr>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<kuchli parol, kamida 8 belgi>
```

Tasodifiy kalit yaratish: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Ishga tushirish:

```bash
npm run dev       # ishlab chiqish rejimi (fayl o'zgarsa avtomatik qayta yuklanadi)
npm start         # oddiy ishga tushirish
```

Sayt: http://localhost:3000 · Admin panel: http://localhost:3000/admin

Birinchi ishga tushganda baza avtomatik yaratiladi: `.env` dagi login/parol bilan administrator,
4 ta boshlang'ich kurs (Frontend Developer, SMM, Sun'iy intellekt, Kompyuter savodxonligi) va kontaktlar.

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Serverni ishga tushirish |
| `npm run dev` | Ishlab chiqish rejimi (`node --watch`) |
| `npm run seed` | Yetishmayotgan boshlang'ich ma'lumotlarni qo'shish (mavjudlariga tegmaydi) |
| `npm run seed -- --force` | Kontaktlar va sayt matnlarini standart holatga qaytarish, seed kurslarini qayta yozish (arizalarga tegmaydi) |
| `npm run backup` | Bazaning zaxira nusxasini `backups/` ga olish |
| `npm run assets` | Logodan favicon, og:image va logo fayllarini qayta yaratish |

## .env sozlamalari

| O'zgaruvchi | Tavsif | Standart |
|---|---|---|
| `NODE_ENV` | `production` yoki `development` | `development` |
| `PORT`, `HOST` | Server porti va manzili (Nginx ortida: `127.0.0.1`) | `3000`, `0.0.0.0` |
| `SITE_URL` | Saytning to'liq manzili (canonical, sitemap, OG uchun) | `http://localhost:3000` |
| `SESSION_SECRET` | Sessiya va CSRF kaliti, **kamida 32 belgi** (production'da majburiy) | — |
| `SESSION_MAX_AGE_HOURS` | Admin faolsizlikdan so'ng necha soatda chiqariladi | `8` |
| `COOKIE_SECURE` | `auto` / `true` / `false` | `auto` |
| `TRUST_PROXY` | Ishonchli proksi (Nginx shu serverda bo'lsa `loopback`) | `loopback` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Birinchi administrator (faqat baza bo'sh bo'lganda ishlatiladi) | `admin`, — |
| `MAX_VIDEO_MB` | Video hajmi chegarasi | `200` |
| `MAX_IMAGE_MB` | Rasm hajmi chegarasi | `8` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram bildirishnoma (bo'sh bo'lsa o'chiq) | — |
| `APP_TIMEZONE` | Sanalarni ko'rsatish mintaqasi | `Asia/Tashkent` |
| `DB_FILE`, `UPLOADS_DIR` | Baza fayli va yuklamalar papkasi | `data/proteach.db`, `uploads` |

## Admin panel

1. `/admin` ga kiring — `.env` dagi `ADMIN_USERNAME` va `ADMIN_PASSWORD`.
2. **Birinchi ish:** «Sozlamalar» → parolni o'zgartiring. (Keyin `.env` dagi parol endi ishlatilmaydi.)
3. «Kurslar» → har bir kursga narx va davomiylikni kiriting. Narx bo'sh bo'lsa, saytda «Narxi: bog'laning» chiqadi.
4. «Bog'lanish» → telefonlar, manzil, ish vaqti, ijtimoiy tarmoqlarni tekshiring.

Xavfsizlik: 15 daqiqada 10 ta noto'g'ri urinishdan so'ng login vaqtincha bloklanadi; parol o'zgartirilganda
boshqa qurilmalardagi sessiyalar yopiladi; admin sahifalari `noindex` (qidiruv tizimlariga ko'rinmaydi).

### Video yuklash

«Video» bo'limi → faylni tanlang (MP4 yoki WEBM, `MAX_VIDEO_MB` gacha) → «Yuklash». Progress bar yuklanishni ko'rsatadi.
- Tez yuklanishi uchun videoni **H.264 (MP4), 720p yoki 1080p** formatida tayyorlang.
- Poster rasm (ixtiyoriy) — video boshlanishidan oldin ko'rinadigan muqova.
- «Saytdan yashirish» — videoni o'chirmasdan bo'limni yashiradi. Video yuklanmagan bo'lsa, bo'lim saytda umuman ko'rinmaydi.

### Telegram bildirishnoma

1. Telegramda **@BotFather** → `/newbot` → token oling.
2. Botga `/start` yozing (yoki botni guruhga qo'shing).
3. Chat ID ni aniqlang (masalan, **@userinfobot** orqali; guruh ID'si `-100...` bilan boshlanadi).
4. `.env` ga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` ni yozing, serverni qayta ishga tushiring (`pm2 restart proteach`).
5. «Sozlamalar» → «Sinov xabarini yuborish».

Bot ishlamasa ham ariza bazaga saqlanadi — xato faqat server logiga yoziladi.

## Ma'lumotlarni zaxiralash

Barcha ma'lumotlar ikki joyda:
- **`data/proteach.db`** — kurslar, arizalar, sozlamalar, adminlar
- **`uploads/`** — video, poster va kurs rasmlari

Zaxira olish (sayt ishlab turganda ham xavfsiz):

```bash
npm run backup                     # backups/proteach-YYYY-MM-DD_HH-MM.db (oxirgi 30 tasi saqlanadi)
tar -czf uploads-$(date +%F).tar.gz uploads/
```

Har kuni avtomatik zaxira (cron, 03:00):

```bash
crontab -e
0 3 * * * cd /var/www/proteach && /usr/bin/npm run backup >> /var/log/proteach-backup.log 2>&1
```

> Bazani oddiy `cp` bilan nusxalash ham mumkin, lekin buning uchun avval saytni to'xtating (`pm2 stop proteach`),
> chunki SQLite WAL rejimida ishlaydi (`proteach.db-wal` fayli ham bor). `npm run backup` buni o'zi to'g'ri bajaradi.

Tiklash: `pm2 stop proteach` → zaxira faylni `data/proteach.db` o'rniga ko'chiring (`-wal`, `-shm` fayllarini o'chiring) → `pm2 start proteach`.

## Netlify'ga joylash (bepul)

Loyiha Netlify'da ham to'liq ishlaydi — alohida server va baza kerak emas:

- `public/` — statik fayllar (CSS, JS, rasmlar), Netlify CDN beradi
- `netlify/functions/server.js` — sahifalar, admin panel, forma (Netlify Function)
- Ma'lumotlar bazasi (SQLite fayli) va yuklangan rasmlar — **Netlify Blobs**da saqlanadi (avtomatik)

Sozlash:

1. Loyihani GitHub'ga yuklang va Netlify'da **Add new project → Import from Git** orqali ulang.
   Build sozlamalari `netlify.toml` dan o'qiladi — hech narsa o'zgartirish shart emas.
2. Netlify → **Site configuration → Environment variables** bo'limida kiriting:
   - `ADMIN_USERNAME` — masalan `admin`
   - `ADMIN_PASSWORD` — kamida 8 belgili kuchli parol (birinchi administrator shu bilan yaratiladi)
   - ixtiyoriy: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, o'z domeningiz bo'lsa `SITE_URL=https://proteach.uz`
3. **Deploys → Trigger deploy → Deploy site**. Tayyor: sayt `https://<nom>.netlify.app`, admin — `/admin`.

Netlify'dagi farqlar:

| | Oddiy server (VPS) | Netlify |
|---|---|---|
| Video | Fayl yuklash (200 MB gacha) yoki YouTube | Faqat **YouTube havolasi** (funksiyaga so'rov ~6 MB bilan cheklangan) |
| Rasm hajmi | 8 MB gacha | 4 MB gacha |
| Baza | `data/proteach.db` | Netlify Blobs (`proteach` ombori) |
| Zaxira | `npm run backup` | Netlify → **Blobs** bo'limidan `db/proteach.sqlite` ni yuklab olish |

> Bir vaqtda kelgan arizalar yo'qolmaydi: baza shartli yoziladi (ETag), ikki nusxa bir vaqtda yozsa,
> keyingisi eng yangi versiyani olib, o'z o'zgarishini uning ustida qayta bajaradi.

## VPS ga joylash (Ubuntu 22.04 / 24.04)

### 1. Node.js va PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2
```

### 2. Loyihani serverga ko'chirish

```bash
sudo mkdir -p /var/www/proteach && sudo chown $USER:$USER /var/www/proteach
# git orqali:   git clone <repo-manzili> /var/www/proteach
# yoki lokal kompyuterdan:  rsync -av --exclude node_modules --exclude data --exclude uploads ./ user@server:/var/www/proteach/
cd /var/www/proteach
npm ci --omit=dev
cp .env.example .env && nano .env
```

`.env` da production uchun: `NODE_ENV=production`, `HOST=127.0.0.1`, `SITE_URL=https://proteach.uz`,
yangi `SESSION_SECRET`, kuchli `ADMIN_PASSWORD`.

### 3. PM2 bilan ishga tushirish

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # chiqqan buyruqni nusxalab bajaring — server qayta yonganda sayt avtomatik ishga tushadi
pm2 logs proteach    # loglarni ko'rish
```

> SQLite bitta jarayon bilan ishlaydi — PM2 `cluster` rejimi yoki bir nechta instance ishlatmang.

### 4. Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/proteach.uz
sudo ln -s /etc/nginx/sites-available/proteach.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> ⚠️ **MUHIM — `client_max_body_size`.** Nginx standart holatda atigi **1 MB** gacha so'rovni qabul qiladi.
> Video yuklash ishlashi uchun `deploy/nginx.conf` da `client_max_body_size 220M;` qatori bor —
> bu qiymat `.env` dagi `MAX_VIDEO_MB` dan **biroz katta** bo'lishi shart. `MAX_VIDEO_MB` ni
> o'zgartirsangiz (masalan 500), Nginx'da ham `client_max_body_size 520M;` qiling va `sudo systemctl reload nginx`.
> Aks holda katta video yuklanganda «413 Request Entity Too Large» xatosi chiqadi.

`deploy/nginx.conf` da yuklangan fayllar `/var/www/proteach/uploads/` dan to'g'ridan-to'g'ri beriladi —
loyiha boshqa papkada bo'lsa, `alias` yo'llarini moslang.

### 5. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d proteach.uz -d www.proteach.uz
sudo certbot renew --dry-run      # avtomatik yangilanishni tekshirish
```

Domen DNS'ida `A` yozuvi server IP manziliga yo'naltirilgan bo'lishi kerak.

### 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Yangilash (yangi versiyani joylash)

```bash
cd /var/www/proteach
npm run backup
git pull            # yoki rsync
npm ci --omit=dev
pm2 restart proteach
```

Baza tuzilmasi o'zgargan bo'lsa, migratsiyalar server ishga tushganda avtomatik qo'llanadi.

## Muammolar va yechimlar

| Belgi | Sabab va yechim |
|---|---|
| Video yuklashda «413» xatosi | Nginx `client_max_body_size` kichik — yuqoridagi bo'limga qarang |
| Admin panelga kirib bo'lmayapti (sahifa qayta loginga qaytadi) | Sayt HTTPS'siz ochilgan va `COOKIE_SECURE=true`. HTTPS ni sozlang yoki `COOKIE_SECURE=auto` qiling |
| «Sahifa eskirgan» xabari | Brauzer cookie'larni bloklayapti yoki sahifa juda uzoq ochiq turgan — sahifani yangilang |
| Server ishga tushmayapti: `SESSION_SECRET` | Production rejimida kamida 32 belgili kalit majburiy |
| Admin parolini unutdingiz | Serverda: `pm2 stop proteach`, so'ng `node -e "const db=require('better-sqlite3')('data/proteach.db');db.prepare('DELETE FROM admins').run()"`, `.env` dagi `ADMIN_PASSWORD` ni yangilang va `pm2 start proteach` — admin qayta yaratiladi |
| Telegram xabar kelmayapti | Token/chat ID ni tekshiring, botga `/start` yozilganini tekshiring, `pm2 logs proteach` |

## Brend fayllari

Logo `proteach_logo.jpg` dan avtomatik tayyorlangan (`npm run assets`): `public/img/logo-light.png` (qorong'i fon uchun),
`logo-dark.png` (yorug' fon uchun), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`, `og-image.jpg` (1200×630).
Logo almashtirilsa, yangi faylni `proteach_logo.jpg` nomi bilan loyiha ildiziga qo'yib, `npm run assets` ni ishga tushiring
(`scripts/build-assets.js` dagi kesish koordinatalarini yangi logoga moslash kerak bo'lishi mumkin).

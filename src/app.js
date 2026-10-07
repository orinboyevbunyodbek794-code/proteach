/**
 * Express ilovasi: xavfsizlik, statik fayllar, sessiya, marshrutlar va xatolarni qayta ishlash.
 */
'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const log = require('./logger');
const runtime = require('./runtime');
const { session } = require('./middleware/session');
const { csrf } = require('./middleware/csrf');
const { locals } = require('./middleware/locals');
const { generalLimiter } = require('./middleware/rate-limits');
const media = require('./services/media');
const { renderPublicError, renderAdminError, detectLang } = require('./routes/errors');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));
  if (config.isProd) app.enable('view cache');

  // --- Xavfsizlik sarlavhalari (CSP: faqat o'z fayllarimiz + xarita va YouTube iframe) ---
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ytimg.com'],
          mediaSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: [
            'https://yandex.ru', 'https://yandex.uz', 'https://yandex.com',
            'https://www.google.com', 'https://maps.google.com',
            'https://www.youtube-nocookie.com', 'https://www.youtube.com',
          ],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: config.isProd ? { maxAge: 31536000, includeSubDomains: false } : false,
    })
  );

  // Netlify javoblarni o'zi siqadi (gzip/brotli)
  if (!runtime.isNetlify) app.use(compression());

  // --- Statik fayllar (Netlify'da public/ ni CDN beradi, bu yerga yetib kelmaydi) ---
  const longCache = config.isProd ? '30d' : 0;
  app.use(express.static(path.join(config.root, 'public'), { maxAge: longCache, index: false }));
  if (runtime.isNetlify) {
    // Yuklangan rasmlar Netlify Blobs'dan; nomlari takrorlanmas — CDN uzoq keshlaydi
    app.get(['/uploads/courses/:file', '/uploads/video/:file'], async (req, res, next) => {
      try {
        const dir = req.path.split('/')[2];
        const file = await media.readFile(`${dir}/${req.params.file}`);
        if (!file) return next();
        res.set('Content-Type', file.type);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.set('Netlify-CDN-Cache-Control', 'public, max-age=31536000, immutable');
        res.send(file.buffer);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const uploadsOpts = { maxAge: '30d', index: false, dotfiles: 'deny', fallthrough: true };
    app.use('/uploads/courses', express.static(media.DIRS.courses, uploadsOpts));
    app.use('/uploads/video', express.static(media.DIRS.video, uploadsOpts));
  }

  app.use(generalLimiter);
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: false, limit: '256kb', parameterLimit: 500 }));
  app.use(express.json({ limit: '64kb' }));

  // --- Netlify: har so'rovda bazaning eng yangi versiyasi, javobdan oldin o'zgarishlarni saqlash ---
  if (runtime.isNetlify) app.use(require('./middleware/netlify-db'));

  // --- Admin sessiyasi (imzolangan cookie, faqat /admin yo'lida yuboriladi) ---
  app.use('/admin', session);

  app.use(locals);
  app.use(csrf);

  // --- Marshrutlar ---
  app.use(require('./routes/seo'));
  app.use('/admin', require('./routes/admin'));
  app.use(require('./routes/public'));

  // --- 404 ---
  app.use((req, res) => {
    if (req.path.startsWith('/admin')) return renderAdminError(req, res, 404);
    renderPublicError(req, res, 404);
  });

  // --- Xatolar ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const isAdmin = req.path.startsWith('/admin');
    if (err.code === 'EBADCSRFTOKEN') {
      log.warn(`CSRF rad etildi: ${req.method} ${req.originalUrl} (${req.ip})`);
      if (req.get('x-requested-with') === 'fetch' || req.get('x-requested-with') === 'XMLHttpRequest') {
        const t = require('./i18n').translator(detectLang(req));
        return res.status(403).json({
          ok: false,
          message: isAdmin ? 'Sahifa eskirgan. Sahifani yangilab, qaytadan urinib ko\'ring.' : t('form.errors.csrf'),
        });
      }
      return isAdmin ? renderAdminError(req, res, 403) : renderPublicError(req, res, 403);
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).type('text/plain; charset=utf-8').send("So'rov hajmi juda katta.");
    }
    if (err.status && err.status >= 400 && err.status < 500) {
      // Ommaviy saytda noto'g'ri manzil (masalan, buzilgan URL) — foydalanuvchi uchun "sahifa topilmadi"
      return isAdmin ? renderAdminError(req, res, err.status) : renderPublicError(req, res, 404);
    }
    log.error(`${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return;
    return isAdmin ? renderAdminError(req, res, 500) : renderPublicError(req, res, 500);
  });

  // Uzilib qolgan video yuklashlar qoldiqlarini tozalash (faqat server rejimida)
  if (!runtime.isNetlify) {
    media.cleanupTmp();
    setInterval(media.cleanupTmp, 6 * 3600 * 1000).unref();
  }

  return app;
}

module.exports = { createApp };

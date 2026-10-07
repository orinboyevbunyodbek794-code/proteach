/**
 * Express ilovasi: xavfsizlik, statik fayllar, sessiya, marshrutlar va xatolarni qayta ishlash.
 */
'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const config = require('./config');
const log = require('./logger');
const { SqliteSessionStore } = require('./db/session-store');
const { csrf } = require('./middleware/csrf');
const { locals } = require('./middleware/locals');
const { generalLimiter } = require('./middleware/rate-limits');
const { DIRS, cleanupTmp } = require('./services/media');
const { renderPublicError, renderAdminError, detectLang } = require('./routes/errors');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));
  if (config.isProd) app.enable('view cache');

  // --- Xavfsizlik sarlavhalari (CSP: faqat o'z fayllarimiz + Yandex/Google xarita iframe) ---
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: [
            'https://yandex.ru', 'https://yandex.uz', 'https://yandex.com',
            'https://www.google.com', 'https://maps.google.com',
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

  app.use(compression());

  // --- Statik fayllar ---
  const longCache = config.isProd ? '30d' : 0;
  app.use(express.static(path.join(config.root, 'public'), { maxAge: longCache, index: false }));
  const uploadsOpts = { maxAge: '30d', index: false, dotfiles: 'deny', fallthrough: true };
  app.use('/uploads/courses', express.static(DIRS.courses, uploadsOpts));
  app.use('/uploads/video', express.static(DIRS.video, uploadsOpts));

  app.use(generalLimiter);
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: false, limit: '256kb', parameterLimit: 500 }));
  app.use(express.json({ limit: '64kb' }));

  // --- Admin sessiyasi (cookie faqat /admin yo'lida yuboriladi) ---
  const ttlMs = config.sessionMaxAgeHours * 3600 * 1000;
  app.use(
    '/admin',
    session({
      name: 'pt.sid',
      secret: config.sessionSecret,
      store: new SqliteSessionStore({ ttlMs }),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/admin', maxAge: ttlMs },
    })
  );

  app.use(csrf);
  app.use(locals);

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

  // Uzilib qolgan video yuklashlar qoldiqlarini tozalash
  cleanupTmp();
  setInterval(cleanupTmp, 6 * 3600 * 1000).unref();

  return app;
}

module.exports = { createApp };

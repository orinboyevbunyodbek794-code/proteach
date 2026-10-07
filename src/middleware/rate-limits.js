/**
 * So'rovlar sonini cheklash (IP bo'yicha).
 */
'use strict';

const { rateLimit } = require('express-rate-limit');
const { translator } = require('../i18n');

const common = { standardHeaders: 'draft-7', legacyHeaders: false };

/** Kursga yozilish formasi: 10 daqiqada 10 ta ariza (bitta Wi-Fi dagi bir nechta o'quvchi uchun yetarli) */
const applyLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60 * 1000,
  limit: 10,
  handler(req, res) {
    const t = translator(res.locals.lang || 'uz');
    if (req.get('x-requested-with') === 'fetch') {
      return res.status(429).json({ ok: false, message: t('form.errors.rateLimit') });
    }
    res.status(429).type('text/plain; charset=utf-8').send(t('form.errors.rateLimit'));
  },
});

/** Admin login: 15 daqiqada 10 ta muvaffaqiyatsiz urinish */
const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler(req, res) {
    res.status(429).render('admin/login', {
      title: 'Kirish',
      error: "Juda ko'p noto'g'ri urinish. 15 daqiqadan so'ng qayta urinib ko'ring.",
      username: '',
      next: '/admin',
    });
  },
});

/** Umumiy himoya: 1 daqiqada 300 ta so'rov (statik fayllardan tashqari) */
const generalLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 300,
  message: "Juda ko'p so'rov. Birozdan so'ng urinib ko'ring.",
});

module.exports = { applyLimiter, loginLimiter, generalLimiter };

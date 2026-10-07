/**
 * Netlify rejimi: so'rov boshida bazaning eng yangi versiyasini yuklaydi,
 * javob yuborilishidan oldin esa o'zgarishlarni Netlify Blobs'ga saqlaydi.
 * Saqlab bo'lmasa — foydalanuvchiga "saqlanmadi" deb aytiladi (ma'lumot jim yo'qolmaydi).
 */
'use strict';

const log = require('../logger');
const netlifyDb = require('../db/netlify-db');

const FAIL_TEXT = "Ma'lumotni saqlashda xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.";

module.exports = async function netlifyDbMiddleware(req, res, next) {
  try {
    await netlifyDb.ready();
  } catch (err) {
    return next(err);
  }

  const originalEnd = res.end;
  let flushing = false;
  res.end = function patchedEnd(...args) {
    if (flushing) return originalEnd.apply(this, args);
    flushing = true;
    netlifyDb.flush().then(
      () => originalEnd.apply(this, args),
      (err) => {
        log.error('Netlify: bazani saqlab bo\'lmadi', err);
        if (!res.headersSent) {
          res.statusCode = 503;
          for (const h of ['Content-Length', 'Location', 'Set-Cookie', 'ETag']) res.removeHeader(h);
          const isJson = (req.get('accept') || '').includes('application/json') || req.get('x-requested-with');
          if (isJson) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return originalEnd.call(this, JSON.stringify({ ok: false, message: FAIL_TEXT }));
          }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        originalEnd.call(this, FAIL_TEXT);
      }
    );
    return this;
  };
  next();
};

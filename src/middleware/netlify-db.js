/**
 * Netlify rejimi: so'rov boshida bazaning eng yangi versiyasini yuklaydi,
 * javob yuborilishidan oldin esa o'zgarishlarni Netlify Blobs'ga saqlaydi.
 * Saqlab bo'lmasa — foydalanuvchiga "saqlanmadi" deb aytiladi (ma'lumot jim yo'qolmaydi).
 *
 * Bitta nusxa ichida so'rovlar navbat bilan bajariladi (xotiradagi baza umumiy),
 * turli nusxalar orasidagi ziddiyatni esa src/db/netlify-db.js (ETag) hal qiladi.
 */
'use strict';

const log = require('../logger');
const netlifyDb = require('../db/netlify-db');

const FAIL_TEXT = "Ma'lumotni saqlashda xatolik yuz berdi. Iltimos, birozdan so'ng qaytadan urinib ko'ring.";
const LOCK_TIMEOUT_MS = 25000;

// Oddiy navbat (mutex): har bir so'rov oldingisi tugashini kutadi
let queue = Promise.resolve();
function acquire() {
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const ready = queue.then(() => {
    let released = false;
    const timer = setTimeout(() => {
      log.warn("Netlify: so'rov qulfi muddati tugadi — majburan bo'shatildi");
      done();
    }, LOCK_TIMEOUT_MS);
    function done() {
      if (released) return;
      released = true;
      clearTimeout(timer);
      release();
    }
    return done;
  });
  queue = queue.then(() => current);
  return ready;
}

module.exports = async function netlifyDbMiddleware(req, res, next) {
  const release = await acquire();
  res.once('close', release); // mijoz uzilsa ham navbat to'xtab qolmasin

  try {
    await netlifyDb.ready();
  } catch (err) {
    release();
    return next(err);
  }

  const originalEnd = res.end;
  let flushing = false;
  res.end = function patchedEnd(...args) {
    if (flushing) return originalEnd.apply(this, args);
    flushing = true;
    netlifyDb.flush().then(
      () => {
        release();
        originalEnd.apply(this, args);
      },
      (err) => {
        release();
        log.error("Netlify: bazani saqlab bo'lmadi", err);
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

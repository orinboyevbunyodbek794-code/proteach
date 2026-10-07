/**
 * CSRF himoyasi (imzolangan "double submit cookie" usuli).
 *
 * Brauzerga tasodifiy qiymatli httpOnly cookie beriladi, formaga esa shu qiymatning
 * HMAC imzosi yoziladi. POST so'rovda imzo cookie bilan mos kelishi shart.
 * Token formada (_csrf), sarlavhada (X-CSRF-Token) yoki multipart formalar uchun
 * manzil so'rovida (?_csrf=) yuborilishi mumkin.
 */
'use strict';

const crypto = require('crypto');
const config = require('../config');

const COOKIE = 'pt_csrf';
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function sign(raw) {
  return crypto.createHmac('sha256', config.sessionSecret).update('csrf:' + raw).digest('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function csrf(req, res, next) {
  let raw = req.cookies && req.cookies[COOKIE];
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) {
    raw = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE, raw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      path: '/',
      maxAge: 365 * 24 * 3600 * 1000,
    });
    req.csrfFresh = true;
  }
  const token = sign(raw);
  res.locals.csrfToken = token;

  if (SAFE.has(req.method)) return next();

  const sent =
    req.get('x-csrf-token') ||
    (req.body && typeof req.body._csrf === 'string' && req.body._csrf) ||
    (typeof req.query._csrf === 'string' && req.query._csrf) ||
    '';
  if (!req.csrfFresh && sent && safeEqual(sent, token)) return next();

  const err = new Error('CSRF token noto\'g\'ri yoki eskirgan');
  err.status = 403;
  err.code = 'EBADCSRFTOKEN';
  next(err);
}

module.exports = { csrf };

/**
 * Admin sessiyasi — imzolangan (HMAC) cookie. Serverda ham, Netlify'da ham bir xil ishlaydi:
 * alohida sessiya ombori kerak emas.
 *
 * Cookie ichida: adminId, sessiya versiyasi (parol almashtirilsa oshadi — eski sessiyalar bekor),
 * flash xabarlar va amal qilish muddati. Muddat har so'rovda yangilanadi (faolsizlik bo'yicha).
 * API express-session ga o'xshash: req.session.regenerate/save/destroy.
 */
'use strict';

const crypto = require('crypto');
const onHeaders = require('on-headers');
const config = require('../config');

const COOKIE = 'pt_admin';
const PATH = '/admin';

function hmac(data) {
  return crypto.createHmac('sha256', config.sessionSecret).update('session:' + data).digest('base64url');
}

function encode(obj) {
  const data = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${data}.${hmac(data)}`;
}

function decode(value) {
  if (typeof value !== 'string' || !value.includes('.')) return null;
  const [data, sig] = value.split('.');
  const expected = hmac(data);
  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return obj && typeof obj === 'object' && obj.exp > Date.now() ? obj : null;
  } catch {
    return null;
  }
}

function session(req, res, next) {
  const ttlMs = config.sessionMaxAgeHours * 3600 * 1000;
  const incoming = decode(req.cookies && req.cookies[COOKIE]);
  const state = { destroyed: false };
  const sess = Object.assign(Object.create(null), incoming ? incoming.s : {});

  Object.defineProperties(sess, {
    regenerate: { value: (cb) => { for (const k of Object.keys(sess)) delete sess[k]; state.destroyed = false; if (cb) cb(); } },
    save: { value: (cb) => { if (cb) cb(); } },
    destroy: { value: (cb) => { for (const k of Object.keys(sess)) delete sess[k]; state.destroyed = true; if (cb) cb(); } },
  });
  req.session = sess;

  onHeaders(res, () => {
    const secure = config.cookieSecure === 'auto' ? req.secure : config.cookieSecure;
    const opts = { httpOnly: true, sameSite: 'lax', secure, path: PATH };
    const data = Object.fromEntries(Object.entries(sess).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)));
    if (state.destroyed || !Object.keys(data).length) {
      if (incoming) res.clearCookie(COOKIE, opts);
      return;
    }
    res.cookie(COOKIE, encode({ s: data, exp: Date.now() + ttlMs }), { ...opts, maxAge: ttlMs });
  });
  next();
}

module.exports = { session, COOKIE };

/**
 * Admin panel uchun: kirish talabi, flash xabarlar, noindex sarlavhalar.
 */
'use strict';

const admins = require('../services/admins');

/** So'rov JSON javob kutyaptimi (fetch / XHR) */
function wantsJson(req) {
  return (
    req.get('x-requested-with') === 'XMLHttpRequest' ||
    req.get('x-requested-with') === 'fetch' ||
    (req.get('accept') || '').includes('application/json')
  );
}

/** Faqat /admin ichidagi xavfsiz qaytish manzili */
function safeNext(value) {
  const v = String(value || '');
  return /^\/admin(\/[\w\-./?=&%]*)?$/.test(v) && !v.startsWith('//') ? v : '/admin';
}

function requireAuth(req, res, next) {
  const id = req.session && req.session.adminId;
  const admin = id ? admins.findById(id) : null;
  if (admin) {
    req.admin = admin;
    res.locals.admin = admin;
    return next();
  }
  if (req.session && id) delete req.session.adminId; // o'chirilgan admin sessiyasi
  if (wantsJson(req)) return res.status(401).json({ ok: false, error: 'Sessiya tugagan. Qaytadan kiring.' });
  const nextUrl = req.method === 'GET' ? `?next=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect('/admin/login' + nextUrl);
}

/** Admin sahifalari qidiruv tizimlariga ko'rinmasin va keshlanmasin */
function adminHeaders(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.set('Cache-Control', 'no-store');
  next();
}

/** Flash xabarlar: req.flash('success', 'Saqlandi') -> keyingi sahifada ko'rinadi */
function flash(req, res, next) {
  req.flash = (type, message) => {
    if (!req.session) return;
    req.session.flash = req.session.flash || [];
    req.session.flash.push({ type, message });
  };
  res.locals.flash = (req.session && req.session.flash) || [];
  if (req.session && req.session.flash) delete req.session.flash;
  next();
}

module.exports = { wantsJson, safeNext, requireAuth, adminHeaders, flash };

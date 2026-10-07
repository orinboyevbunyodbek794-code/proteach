/**
 * Admin kirishi va chiqishi.
 */
'use strict';

const express = require('express');
const log = require('../../logger');
const admins = require('../../services/admins');
const { safeNext } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rate-limits');
const v = require('../../utils/validate');

const router = express.Router();

router.get('/login', (req, res) => {
  const found = req.session.adminId ? admins.findById(req.session.adminId) : null;
  if (found && found.session_version === req.session.ver) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Kirish',
    error: admins.count() === 0 ? setupMessage() : null,
    username: '',
    next: safeNext(req.query.next),
  });
});

/** Administrator hali yaratilmagan (Netlify'da ADMIN_PASSWORD kiritilmagan) */
function setupMessage() {
  return "Administrator hali yaratilmagan. Netlify > Site configuration > Environment variables bo'limida ADMIN_USERNAME va ADMIN_PASSWORD (kamida 8 belgi) ni kiriting, so'ng saytni qayta deploy qiling.";
}

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const username = v.line(req.body.username, 64);
    const password = String(req.body.password || '').slice(0, 200);
    const nextUrl = safeNext(req.body.next);
    const admin = username && password ? await admins.authenticate(username, password) : null;
    if (!admin) {
      log.warn(`Admin kirishi muvaffaqiyatsiz: "${username}" (${req.ip})`);
      return res.status(401).render('admin/login', {
        title: 'Kirish',
        error: "Login yoki parol noto'g'ri.",
        username,
        next: nextUrl,
      });
    }
    // Sessiya fiksatsiyasidan himoya: yangi sessiya ID
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.adminId = admin.id;
      req.session.ver = admin.session_version;
      req.session.save((err2) => {
        if (err2) return next(err2);
        log.info(`Admin kirdi: ${admin.username} (${req.ip})`);
        res.redirect(nextUrl);
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect('/admin/login');
  });
});

module.exports = router;

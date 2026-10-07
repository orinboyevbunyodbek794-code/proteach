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
  if (req.session.adminId && admins.findById(req.session.adminId)) return res.redirect('/admin');
  res.render('admin/login', { title: 'Kirish', error: null, username: '', next: safeNext(req.query.next) });
});

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
    res.clearCookie('pt.sid', { path: '/admin' });
    res.redirect('/admin/login');
  });
});

module.exports = router;

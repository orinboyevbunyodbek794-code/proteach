/**
 * Admin panel (/admin): kirish, dashboard va bo'limlar.
 */
'use strict';

const express = require('express');
const { requireAuth, adminHeaders, flash } = require('../../middleware/auth');
const applications = require('../../services/applications');
const courses = require('../../services/courses');
const telegram = require('../../services/telegram');

const router = express.Router();

router.use(adminHeaders);
router.use(flash);

// Kirish / chiqish — autentifikatsiyasiz
router.use(require('./auth'));

// Qolgan hamma sahifalar faqat tizimga kirganlar uchun
router.use(requireAuth);

// Sidebar uchun: yangi arizalar soni
router.use((req, res, next) => {
  res.locals.newCount = applications.countNew();
  res.locals.path = req.originalUrl.split('?')[0];
  next();
});

const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

/** Oxirgi 7 kunlik arizalar uchun SVG ustunli grafik geometriyasi */
function weekChart(days) {
  const W = 700;
  const H = 240;
  const pad = { top: 28, right: 8, bottom: 44, left: 34 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const maxCount = Math.max(0, ...days.map((d) => d.count));
  const niceMax = maxCount <= 4 ? 4 : Math.ceil(maxCount / 4) * 4;
  const slot = plotW / days.length;
  const barW = Math.min(44, slot * 0.46);
  const bars = days.map((d, i) => {
    const h = (d.count / niceMax) * plotH;
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    const [yy, mm, dd] = d.key.split('-');
    const weekday = WEEKDAYS[new Date(`${d.key}T00:00:00Z`).getUTCDay()];
    const isToday = i === days.length - 1;
    const r = Math.min(4, h);
    const path = h > 0
      ? `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${y + h}Z`
      : '';
    return {
      count: d.count, isToday, x, y, h, w: barW, path,
      cx: x + barW / 2, slotX: pad.left + i * slot, slotW: slot,
      label: isToday ? 'Bugun' : weekday, date: `${dd}.${mm}`, fullDate: `${dd}.${mm}.${yy}`,
      showValue: d.count > 0 && (isToday || d.count === maxCount),
    };
  });
  const grid = [0, 0.5, 1].map((f) => ({ y: pad.top + plotH - f * plotH, value: Math.round(f * niceMax) }));
  return { W, H, pad, plotH, bars, grid, baseline: pad.top + plotH };
}

router.get('/', (req, res) => {
  const stats = applications.dashboardStats();
  res.render('admin/dashboard', {
    title: 'Dashboard',
    active: 'dashboard',
    stats,
    chart: weekChart(stats.days),
    activeCourses: courses.countActive(),
    totalCourses: courses.listAll().length,
    telegramOn: telegram.isConfigured(),
    STATUS_LABELS: applications.STATUS_LABELS,
  });
});

// Badge uchun yengil so'rov (har daqiqada)
router.get('/api/badge', (req, res) => {
  res.json({ ok: true, newCount: res.locals.newCount });
});

router.use('/video', require('./video'));
router.use('/courses', require('./courses'));
router.use('/applications', require('./applications'));
router.use('/contacts', require('./contacts'));
router.use('/content', require('./content'));
router.use('/settings', require('./settings'));

module.exports = router;

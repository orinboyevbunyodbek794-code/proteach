/**
 * Arizalar: jadval, qidiruv/filtr, holat va izoh, o'chirish, CSV/Excel eksport.
 */
'use strict';

const express = require('express');
const applications = require('../../services/applications');
const courses = require('../../services/courses');
const { wantsJson } = require('../../middleware/auth');
const { formatPhone } = require('../../utils/phone');
const { formatDateTime } = require('../../utils/format');
const { toCsv } = require('../../utils/csv');
const { toXlsx } = require('../../utils/xlsx');
const v = require('../../utils/validate');

const router = express.Router();
const PER_PAGE = 20;

function readFilters(query) {
  return {
    q: v.line(query.q, 80),
    course: query.course === 'deleted' ? 'deleted' : v.id(query.course) ? String(v.id(query.course)) : '',
    status: v.oneOf(query.status, applications.STATUSES, ''),
    sort: query.sort === 'old' ? 'old' : 'new',
  };
}

/** Filtrlar saqlangan holda havola yasash */
function queryString(filters, extra = {}) {
  const params = new URLSearchParams();
  for (const [k, val] of Object.entries({ ...filters, ...extra })) {
    if (val && !(k === 'sort' && val === 'new') && !(k === 'page' && Number(val) === 1)) params.set(k, val);
  }
  const s = params.toString();
  return s ? '?' + s : '';
}

router.get('/', (req, res) => {
  const filters = readFilters(req.query);
  const page = v.id(req.query.page) || 1;
  const result = applications.list(filters, { page, perPage: PER_PAGE });
  res.render('admin/applications/list', {
    title: 'Arizalar',
    active: 'applications',
    filters,
    result,
    counts: applications.statusCounts(),
    courseOptions: courses.listAll(),
    STATUSES: applications.STATUSES,
    STATUS_LABELS: applications.STATUS_LABELS,
    CATEGORY_LABELS: applications.CATEGORY_LABELS,
    qs: (extra) => queryString(filters, extra),
    returnTo: req.originalUrl,
  });
});

function exportData(req) {
  const rows = applications.exportRows(readFilters(req.query));
  const headers = ['ID', 'Sana', 'Ism-familiya', 'Telefon', 'Kurs', 'Toifa', 'Izoh', 'Til', 'Holat', 'Admin izohi', 'Takroriy'];
  const data = rows.map((r) => [
    String(r.id),
    formatDateTime(r.created_at),
    r.name,
    formatPhone(r.phone),
    r.course_name_snapshot,
    applications.CATEGORY_LABELS[r.category] || '',
    r.comment,
    String(r.lang).toUpperCase(),
    applications.STATUS_LABELS[r.status] || r.status,
    r.admin_note,
    r.is_duplicate ? 'Ha' : '',
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return { headers, data, filename: `proteach-arizalar-${stamp}` };
}

router.get('/export.csv', (req, res) => {
  const { headers, data, filename } = exportData(req);
  // Telefon raqam oldidagi tab — Excel uni formula/son deb o'zgartirmasligi uchun
  const rows = data.map((r) => r.map((cell, i) => (i === 3 ? { value: '\t' + cell, raw: true } : cell)));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.send(toCsv(headers, rows));
});

router.get('/export.xlsx', (req, res) => {
  const { headers, data, filename } = exportData(req);
  const buf = toXlsx(headers, data, { sheetName: 'Arizalar', widths: [6, 17, 26, 20, 28, 18, 40, 6, 15, 34, 10] });
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(buf);
});

router.get('/:id', (req, res, next) => {
  const app = applications.get(v.id(req.params.id));
  if (!app) return next();
  const course = app.course_id ? courses.getById(app.course_id) : null;
  res.render('admin/applications/show', {
    title: `Ariza #${app.id}`,
    active: 'applications',
    app,
    course,
    STATUSES: applications.STATUSES,
    STATUS_LABELS: applications.STATUS_LABELS,
    CATEGORY_LABELS: applications.CATEGORY_LABELS,
    duplicateHours: applications.DUPLICATE_WINDOW_HOURS,
    back: safeBack(req.query.back),
  });
});

function safeBack(value) {
  const s = String(value || '');
  return /^\/admin\/applications(\?[\w\-.=&%+]*)?$/.test(s) ? s : '/admin/applications';
}

// To'liq tahrirlash (holat + admin izohi)
router.post('/:id', (req, res, next) => {
  const id = v.id(req.params.id);
  const updated = applications.update(id, {
    status: v.oneOf(req.body.status, applications.STATUSES, ''),
    adminNote: v.multiline(req.body.admin_note, 2000),
  });
  if (!updated) return next();
  req.flash('success', 'Ariza yangilandi.');
  res.redirect(`/admin/applications/${id}?back=${encodeURIComponent(safeBack(req.body.back))}`);
});

// Ro'yxatdan tezkor holat o'zgartirish (fetch yoki oddiy forma)
router.post('/:id/status', (req, res, next) => {
  const id = v.id(req.params.id);
  const status = v.oneOf(req.body.status, applications.STATUSES, '');
  if (!status) return res.status(400).json({ ok: false, message: "Holat noto'g'ri." });
  const updated = applications.update(id, { status });
  if (!updated) return next();
  const message = `#${id}: holat "${applications.STATUS_LABELS[status]}" ga o'zgartirildi.`;
  if (wantsJson(req)) return res.json({ ok: true, status, newCount: applications.countNew(), message });
  req.flash('success', message);
  res.redirect(safeBack(req.body.back));
});

router.post('/:id/delete', (req, res, next) => {
  const id = v.id(req.params.id);
  if (!applications.remove(id)) return next();
  req.flash('success', `Ariza #${id} o'chirildi.`);
  res.redirect(safeBack(req.body.back));
});

module.exports = router;

/**
 * Kursga yozilish arizalari.
 */
'use strict';

const { getDb } = require('../db');
const { dayKey } = require('../utils/format');

const STATUSES = ['new', 'contacted', 'accepted', 'rejected'];
const CATEGORIES = ['school', 'student', 'worker', 'other'];
const DUPLICATE_WINDOW_HOURS = 24;

const STATUS_LABELS = {
  new: 'Yangi',
  contacted: "Bog'lanildi",
  accepted: 'Qabul qilindi',
  rejected: 'Rad etildi',
};

const CATEGORY_LABELS = {
  school: "Maktab o'quvchisi",
  student: 'Talaba',
  worker: 'Ishlovchi',
  other: 'Boshqa',
};

function searchText(name, phone) {
  return `${String(name).toLowerCase()} ${String(phone).replace(/\D/g, '')}`;
}

/**
 * Yangi ariza. Shu raqamdan yaqinda ariza kelgan bo'lsa ham saqlanadi,
 * faqat "takroriy" deb belgilanadi.
 */
function create({ name, phone, courseId, courseName, category, comment, lang }) {
  const db = getDb();
  const dup = db
    .prepare(`SELECT 1 FROM applications WHERE phone = ? AND created_at >= datetime('now', ?) LIMIT 1`)
    .get(phone, `-${DUPLICATE_WINDOW_HOURS} hours`);
  const info = db
    .prepare(
      `INSERT INTO applications (name, phone, course_id, course_name_snapshot, category, comment, lang, is_duplicate, search_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, phone, courseId || null, courseName || '', category || '', comment || '', lang, dup ? 1 : 0, searchText(name, phone));
  return get(info.lastInsertRowid);
}

function get(id) {
  return getDb().prepare('SELECT * FROM applications WHERE id = ?').get(id) || null;
}

function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

/** Filtrlar: q (ism/telefon), course ('' | id | 'deleted'), status, sort ('new'|'old') */
function buildWhere({ q = '', course = '', status = '' } = {}) {
  const where = [];
  const params = [];
  const query = String(q).trim().toLowerCase();
  if (query) {
    const digits = query.replace(/\D/g, '');
    const terms = [`search_text LIKE ? ESCAPE '\\'`];
    params.push(`%${escapeLike(query)}%`);
    if (digits.length >= 3 && digits !== query) {
      terms.push(`search_text LIKE ? ESCAPE '\\'`);
      params.push(`%${digits}%`);
    }
    where.push(`(${terms.join(' OR ')})`);
  }
  if (course === 'deleted') {
    where.push('course_id IS NULL');
  } else if (course && /^\d+$/.test(String(course))) {
    where.push('course_id = ?');
    params.push(Number(course));
  }
  if (STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

function orderBy(sort) {
  return sort === 'old' ? 'ORDER BY created_at ASC, id ASC' : 'ORDER BY created_at DESC, id DESC';
}

function list(filters = {}, { page = 1, perPage = 20 } = {}) {
  const db = getDb();
  const { sql, params } = buildWhere(filters);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM applications ${sql}`).get(...params).n;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const rows = db
    .prepare(`SELECT * FROM applications ${sql} ${orderBy(filters.sort)} LIMIT ? OFFSET ?`)
    .all(...params, perPage, (current - 1) * perPage);
  return { rows, total, pages, page: current, perPage };
}

function exportRows(filters = {}) {
  const { sql, params } = buildWhere(filters);
  return getDb().prepare(`SELECT * FROM applications ${sql} ${orderBy(filters.sort)}`).all(...params);
}

function update(id, { status, adminNote }) {
  const app = get(id);
  if (!app) return null;
  getDb()
    .prepare('UPDATE applications SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(STATUSES.includes(status) ? status : app.status, adminNote != null ? adminNote : app.admin_note, id);
  return get(id);
}

function remove(id) {
  return getDb().prepare('DELETE FROM applications WHERE id = ?').run(id).changes > 0;
}

function countNew() {
  return getDb().prepare("SELECT COUNT(*) AS n FROM applications WHERE status = 'new'").get().n;
}

/** Holatlar bo'yicha soni: { all, new, contacted, accepted, rejected } */
function statusCounts() {
  const counts = { all: 0, new: 0, contacted: 0, accepted: 0, rejected: 0 };
  for (const r of getDb().prepare('SELECT status, COUNT(*) AS n FROM applications GROUP BY status').all()) {
    if (r.status in counts) counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

/** Dashboard uchun: jami, yangi, oxirgi 5 ta va oxirgi 7 kunlik grafik */
function dashboardStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) AS n FROM applications').get().n;
  const latest = db.prepare('SELECT * FROM applications ORDER BY created_at DESC, id DESC LIMIT 5').all();

  // Oxirgi 7 kun (Toshkent vaqti bo'yicha), bugun ham kiradi
  const days = [];
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days.push({ key: dayKey(d), date: d, count: 0 });
  }
  const since = new Date(now - 8 * 86400000).toISOString().replace('T', ' ').slice(0, 19);
  const recent = db.prepare('SELECT created_at FROM applications WHERE created_at >= ?').all(since);
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const r of recent) {
    const d = byKey.get(dayKey(r.created_at));
    if (d) d.count++;
  }
  const weekTotal = days.reduce((s, d) => s + d.count, 0);
  return { total, newCount: countNew(), latest, days, weekTotal };
}

module.exports = {
  STATUSES,
  STATUS_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  DUPLICATE_WINDOW_HOURS,
  create,
  get,
  list,
  exportRows,
  update,
  remove,
  countNew,
  statusCounts,
  dashboardStats,
};

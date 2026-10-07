/**
 * Kurslar bilan ishlash.
 */
'use strict';

const { getDb } = require('../db');
const { slugify } = require('../utils/slug');
const { pick, LANGS } = require('../i18n');

const PRICE_PERIODS = ['month', 'course'];

// Admin tanlashi mumkin bo'lgan kartochka belgilari (views/partials/icons.ejs da mavjud)
const ICONS = [
  'code', 'megaphone', 'sparkles', 'monitor', 'palette', 'chart', 'camera', 'book',
  'briefcase', 'rocket', 'target', 'layers', 'lightbulb', 'globe', 'users', 'wrench', 'sun', 'award',
];

// Admin panelda ko'rsatiladigan o'zbekcha nomlar
const ICON_LABELS = {
  code: 'Kod', megaphone: 'Megafon', sparkles: 'AI / uchqun', monitor: 'Monitor', palette: 'Palitra',
  chart: 'Grafik', camera: 'Kamera', book: 'Kitob', briefcase: 'Portfel', rocket: 'Raketa', target: 'Nishon',
  layers: 'Qatlamlar', lightbulb: "G'oya", globe: 'Globus', users: 'Odamlar', wrench: 'Kalit', sun: 'Quyosh', award: 'Mukofot',
};

function parseLearn(value) {
  try {
    const arr = JSON.parse(value || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

/** Bazadagi qatorni qulay obyektga aylantiradi */
function fromRow(row) {
  if (!row) return null;
  const tri = (prefix) => Object.fromEntries(LANGS.map((l) => [l, row[`${prefix}_${l}`] || '']));
  return {
    id: row.id,
    slug: row.slug,
    name: tri('name'),
    short: tri('short'),
    description: tri('description'),
    learn: Object.fromEntries(LANGS.map((l) => [l, parseLearn(row[`learn_${l}`])])),
    duration: tri('duration'),
    price: row.price,
    pricePeriod: row.price_period,
    image: row.image,
    icon: row.icon,
    isActive: !!row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Sayt uchun: tanlangan tildagi qiymatlar (bo'sh bo'lsa o'zbekchasi) */
function localize(course, lang) {
  const learn = course.learn[lang] && course.learn[lang].length ? course.learn[lang] : course.learn.uz;
  return {
    id: course.id,
    slug: course.slug,
    name: pick(course.name, lang),
    short: pick(course.short, lang),
    description: pick(course.description, lang),
    learn,
    duration: pick(course.duration, lang),
    price: course.price,
    pricePeriod: course.pricePeriod,
    image: course.image,
    icon: course.icon,
    updatedAt: course.updatedAt,
  };
}

function listAll() {
  return getDb().prepare('SELECT * FROM courses ORDER BY sort_order, id').all().map(fromRow);
}

function listActive() {
  return getDb().prepare('SELECT * FROM courses WHERE is_active = 1 ORDER BY sort_order, id').all().map(fromRow);
}

function countActive() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM courses WHERE is_active = 1').get().n;
}

function getById(id) {
  return fromRow(getDb().prepare('SELECT * FROM courses WHERE id = ?').get(id));
}

function getBySlug(slug) {
  return fromRow(getDb().prepare('SELECT * FROM courses WHERE slug = ?').get(slug));
}

function getActiveById(id) {
  return fromRow(getDb().prepare('SELECT * FROM courses WHERE id = ? AND is_active = 1').get(id));
}

function slugTaken(slug, excludeId = 0) {
  return !!getDb().prepare('SELECT 1 FROM courses WHERE slug = ? AND id != ?').get(slug, excludeId || 0);
}

/** Bo'sh bo'lmagan va takrorlanmaydigan slug */
function uniqueSlug(source, excludeId = 0) {
  const base = slugify(source) || 'kurs';
  let slug = base;
  for (let i = 2; slugTaken(slug, excludeId); i++) slug = `${base}-${i}`;
  return slug;
}

function toParams(data) {
  const p = {
    slug: data.slug,
    price: data.price == null ? null : data.price,
    price_period: PRICE_PERIODS.includes(data.pricePeriod) ? data.pricePeriod : 'month',
    image: data.image || null,
    icon: ICONS.includes(data.icon) ? data.icon : 'code',
    is_active: data.isActive ? 1 : 0,
  };
  for (const l of LANGS) {
    p[`name_${l}`] = data.name[l] || '';
    p[`short_${l}`] = data.short[l] || '';
    p[`description_${l}`] = data.description[l] || '';
    p[`learn_${l}`] = JSON.stringify(data.learn[l] || []);
    p[`duration_${l}`] = data.duration[l] || '';
  }
  return p;
}

const COLUMNS = [
  'slug', 'price', 'price_period', 'image', 'icon', 'is_active',
  ...LANGS.flatMap((l) => [`name_${l}`, `short_${l}`, `description_${l}`, `learn_${l}`, `duration_${l}`]),
];

function create(data) {
  const db = getDb();
  const p = toParams(data);
  p.sort_order = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM courses').get().n;
  const cols = [...COLUMNS, 'sort_order'];
  const info = db
    .prepare(`INSERT INTO courses (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
    .run(p);
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const p = toParams(data);
  p.id = id;
  getDb()
    .prepare(`UPDATE courses SET ${COLUMNS.map((c) => `${c} = @${c}`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`)
    .run(p);
  return getById(id);
}

function setImage(id, image) {
  getDb().prepare('UPDATE courses SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(image, id);
}

function setActive(id, active) {
  getDb()
    .prepare('UPDATE courses SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(active ? 1 : 0, id);
  return getById(id);
}

/** Kursni o'chiradi. Arizalar saqlanadi (course_id NULL bo'ladi, nomi snapshot'da qoladi). */
function remove(id) {
  const course = getById(id);
  if (!course) return null;
  getDb().prepare('DELETE FROM courses WHERE id = ?').run(id);
  return course;
}

/** Berilgan tartibda sort_order ni qayta yozadi */
function reorder(ids) {
  const db = getDb();
  const all = listAll().map((c) => c.id);
  const ordered = [];
  for (const id of ids) if (all.includes(id) && !ordered.includes(id)) ordered.push(id);
  for (const id of all) if (!ordered.includes(id)) ordered.push(id); // ro'yxatda yo'qlari oxiriga
  const stmt = db.prepare('UPDATE courses SET sort_order = ? WHERE id = ?');
  db.transaction(() => ordered.forEach((id, i) => stmt.run(i + 1, id)))();
}

/** Bir pog'ona yuqoriga / pastga */
function move(id, direction) {
  const ids = listAll().map((c) => c.id);
  const i = ids.indexOf(id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  reorder(ids);
}

module.exports = {
  ICONS,
  ICON_LABELS,
  PRICE_PERIODS,
  fromRow,
  localize,
  listAll,
  listActive,
  countActive,
  getById,
  getBySlug,
  getActiveById,
  slugTaken,
  uniqueSlug,
  create,
  update,
  setImage,
  setActive,
  remove,
  reorder,
  move,
};

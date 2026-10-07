/**
 * Sozlamalar (settings jadvali, JSON qiymatlar):
 *   contacts — telefonlar, manzil, ish vaqti, ijtimoiy tarmoqlar, xarita
 *   video    — o'quv markazi videosi va posteri
 *   content  — sayt matnlari (hero, biz haqimizda, afzalliklar)
 * Kesh ishlatilmaydi: saqlangan o'zgarish saytda darhol ko'rinadi.
 */
'use strict';

const { getDb } = require('../db');
const { dicts, LANGS } = require('../i18n');

function get(key, def = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return def;
  try {
    return JSON.parse(row.value);
  } catch {
    return def;
  }
}

function set(key, value) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

function setIfMissing(key, value) {
  getDb().prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

const emptyI18n = () => ({ uz: '', ru: '', en: '' });

const CONTACT_DEFAULTS = {
  phones: [],
  address: emptyI18n(),
  hours: emptyI18n(),
  email: '',
  instagram: '',
  telegram: '',
  facebook: '',
  youtube: '',
  mapLink: '',
  mapEmbed: '',
};

function getContacts() {
  const stored = get('contacts', {}) || {};
  return { ...CONTACT_DEFAULTS, ...stored, phones: Array.isArray(stored.phones) ? stored.phones : [] };
}

function saveContacts(contacts) {
  set('contacts', { ...CONTACT_DEFAULTS, ...contacts });
}

const VIDEO_DEFAULTS = { file: '', mime: '', size: 0, poster: '', visible: true, uploadedAt: '' };

function getVideo() {
  return { ...VIDEO_DEFAULTS, ...(get('video', {}) || {}) };
}

function saveVideo(patch) {
  set('video', { ...getVideo(), ...patch });
}

/** i18n lug'atlaridagi standart matnlar ({uz, ru, en} ko'rinishida) */
function defaultContent() {
  const tri = (path) => {
    const out = {};
    for (const lang of LANGS) out[lang] = path.split('.').reduce((a, k) => a[k], dicts[lang]);
    return out;
  };
  return {
    hero_title: tri('hero.title'),
    hero_subtitle: tri('hero.subtitle'),
    about_title: tri('about.title'),
    about_text: tri('about.text'),
    advantages: dicts.uz.advantages.map((adv, i) => ({
      icon: adv.icon,
      title: Object.fromEntries(LANGS.map((l) => [l, dicts[l].advantages[i].title])),
      text: Object.fromEntries(LANGS.map((l) => [l, dicts[l].advantages[i].text])),
    })),
  };
}

/** Admin saqlagan matnlar; bo'sh maydonlar standart matn bilan to'ldiriladi */
function getContent() {
  const def = defaultContent();
  const stored = get('content', {}) || {};
  const merge = (a, b) => {
    const out = {};
    for (const lang of LANGS) out[lang] = (b && b[lang] && String(b[lang]).trim()) || a[lang];
    return out;
  };
  const advantages =
    Array.isArray(stored.advantages) && stored.advantages.length ? stored.advantages : def.advantages;
  return {
    hero_title: merge(def.hero_title, stored.hero_title),
    hero_subtitle: merge(def.hero_subtitle, stored.hero_subtitle),
    about_title: merge(def.about_title, stored.about_title),
    about_text: merge(def.about_text, stored.about_text),
    advantages,
  };
}

function saveContent(content) {
  set('content', content);
}

module.exports = {
  get,
  set,
  setIfMissing,
  getContacts,
  saveContacts,
  getVideo,
  saveVideo,
  getContent,
  saveContent,
  defaultContent,
};

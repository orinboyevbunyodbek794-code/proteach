/**
 * Ko'p tillilik: uz (asosiy), ru, en.
 * Til URL orqali tanlanadi: /uz/, /ru/, /en/
 */
'use strict';

const dicts = {
  uz: require('./uz'),
  ru: require('./ru'),
  en: require('./en'),
};

const LANGS = ['uz', 'ru', 'en'];
const DEFAULT_LANG = 'uz';

// Kurs sahifasi manzilidagi segment har bir tilda o'z so'zi bilan
const COURSE_SEGMENT = { uz: 'kurslar', ru: 'kursy', en: 'courses' };

function isLang(value) {
  return LANGS.includes(value);
}

function lookup(dict, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict);
}

/** t('nav.home') — tanlangan tilda, topilmasa o'zbekchada */
function translator(lang) {
  const dict = dicts[lang] || dicts[DEFAULT_LANG];
  return function t(key) {
    const v = lookup(dict, key);
    if (v !== undefined) return v;
    const fallback = lookup(dicts[DEFAULT_LANG], key);
    return fallback !== undefined ? fallback : key;
  };
}

/** {uz, ru, en} obyektdan kerakli tildagi qiymat (bo'sh bo'lsa o'zbekchasi) */
function pick(obj, lang) {
  if (!obj || typeof obj !== 'object') return obj || '';
  return (obj[lang] && String(obj[lang]).trim()) || obj[DEFAULT_LANG] || '';
}

function homePath(lang) {
  return `/${lang}/`;
}

function coursePath(lang, slug) {
  return `/${lang}/${COURSE_SEGMENT[lang]}/${encodeURIComponent(slug)}`;
}

module.exports = { dicts, LANGS, DEFAULT_LANG, COURSE_SEGMENT, isLang, translator, pick, homePath, coursePath };

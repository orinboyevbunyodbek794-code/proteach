/**
 * Kiruvchi ma'lumotlarni tozalash va tekshirish uchun kichik yordamchilar.
 */
'use strict';

// Boshqaruv belgilari (yangi qator va tabdan tashqari) olib tashlanadi
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

/** Bir qatorli matn: bo'shliqlar yig'iladi, uzunlik kesiladi */
function line(value, max = 200) {
  if (Array.isArray(value)) value = value[0];
  return String(value == null ? '' : value)
    .replace(CONTROL, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/** Ko'p qatorli matn */
function multiline(value, max = 5000) {
  if (Array.isArray(value)) value = value[0];
  return String(value == null ? '' : value)
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/** Har bir qator — ro'yxat elementi */
function list(value, maxItems = 30, maxLen = 200) {
  return multiline(value, maxItems * (maxLen + 1))
    .split('\n')
    .map((l) => line(l.replace(/^[-•*]\s+/, ''), maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function intOrNull(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const s = String(value == null ? '' : value).replace(/[\s,.'_]/g, '');
  if (!s) return null;
  if (!/^\d+$/.test(s)) return NaN;
  const n = parseInt(s, 10);
  return n < min || n > max ? NaN : n;
}

function id(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function oneOf(value, allowed, def = '') {
  const v = line(value, 50);
  return allowed.includes(v) ? v : def;
}

/** http(s) havola; bo'sh bo'lsa ''; noto'g'ri bo'lsa null */
function url(value, { hosts = null } = {}) {
  const v = line(value, 500);
  if (!v) return '';
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return null;
  if (hosts && !hosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))) return null;
  return u.toString();
}

function email(value) {
  const v = line(value, 120);
  if (!v) return '';
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(v) ? v : null;
}

/** {uz, ru, en} ko'rinishidagi uch tilli maydonni formadan yig'adi: name_uz, name_ru, name_en */
function i18nFields(body, prefix, { max = 200, multi = false } = {}) {
  const out = {};
  for (const lang of ['uz', 'ru', 'en']) {
    const raw = body[`${prefix}_${lang}`];
    out[lang] = multi ? multiline(raw, max) : line(raw, max);
  }
  return out;
}

module.exports = { line, multiline, list, toArray, intOrNull, id, oneOf, url, email, i18nFields };

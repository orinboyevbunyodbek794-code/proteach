/**
 * Shablonlar (EJS) uchun umumiy yordamchilar va o'zgaruvchilar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const text = require('../utils/text');
const phone = require('../utils/phone');
const format = require('../utils/format');
const { urls } = require('../services/media');

// Statik fayl versiyasi (kesh yangilanishi uchun): /css/site.css?v=ab12cd34
const versionCache = new Map();
function asset(file) {
  if (!config.isProd || !versionCache.has(file)) {
    let v = '0';
    try {
      const content = fs.readFileSync(path.join(config.root, 'public', file));
      v = crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
    } catch {
      /* fayl topilmasa versiyasiz */
    }
    versionCache.set(file, v);
  }
  return `${file}?v=${versionCache.get(file)}`;
}

/** Narx: 450000 -> "450 000 so'm / oyiga"; bo'sh bo'lsa null */
function priceText(price, period, t) {
  if (price == null || price === '' || Number(price) <= 0) return null;
  const unit = period === 'course' ? t('courses.perCourse') : t('courses.perMonth');
  return `${format.formatNumber(price)} ${t('courses.currency')} / ${unit}`;
}

/** Ikonka: <%- h.icon('phone') %> (public/img/icons.svg dagi belgi) */
function icon(name, cls = '') {
  const safe = String(name).replace(/[^a-z0-9-]/g, '');
  const klass = ('icon ' + String(cls).replace(/[^\w\s-]/g, '')).trim();
  return `<svg class="${klass}" aria-hidden="true" focusable="false"><use href="${asset('/img/icons.svg')}#i-${safe}"></use></svg>`;
}

/** JSON-LD ni <script> ichiga xavfsiz joylash */
function jsonLd(data) {
  const BACKSLASH = String.fromCharCode(92);
  return JSON.stringify(data).replace(/</g, () => BACKSLASH + 'u003c');
}

/** Ko'plik shakli: plural('ru', 5, {one, few, many, other}) */
function plural(lang, n, forms) {
  if (!forms || typeof forms === 'string') return forms || '';
  const rule = new Intl.PluralRules(lang).select(n);
  return forms[rule] || forms.other || '';
}

const helpers = {
  plural,
  ...text,
  ...phone,
  ...format,
  asset,
  icon,
  jsonLd,
  priceText,
  urls,
  year: () => new Date().getFullYear(),
};

function locals(req, res, next) {
  res.locals.h = helpers;
  res.locals.siteUrl = config.siteUrl;
  res.locals.isProd = config.isProd;
  res.locals.currentPath = req.path;
  next();
}

module.exports = { locals, helpers, priceText };

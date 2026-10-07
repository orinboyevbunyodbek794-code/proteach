/**
 * 404 / 500 sahifalari: ochiq sayt uchun uch tilda, admin panel uchun o'zbekcha.
 */
'use strict';

const log = require('../logger');
const { isLang, DEFAULT_LANG, translator } = require('../i18n');

/** URL dagi birinchi segment, keyin cookie, bo'lmasa o'zbekcha */
function detectLang(req) {
  const first = (req.path || '').split('/')[1];
  if (isLang(first)) return first;
  const fromCookie = req.cookies && req.cookies.pt_lang;
  return isLang(fromCookie) ? fromCookie : DEFAULT_LANG;
}

function renderPublicError(req, res, status) {
  const lang = detectLang(req);
  const t = translator(lang);
  const is404 = status === 404;
  const code = status;
  const fallback = (err) => {
    log.error("Xato sahifasini chiqarib bo'lmadi", err);
    res.status(status).type('text/plain; charset=utf-8').send(`${code} — ${is404 ? t('errors.notFoundTitle') : t('errors.serverTitle')}`);
  };
  try {
    const { baseContext } = require('./context');
    const ctx = baseContext(lang);
    const data = {
      ...ctx,
      page: 'error',
      code,
      title: is404 ? t('errors.notFoundTitle') : status === 403 ? t('form.errors.csrf') : t('errors.serverTitle'),
      text: is404 ? t('errors.notFoundText') : status === 403 ? '' : t('errors.serverText'),
      meta: { ...ctx.meta, title: `${code} — Pro Teach`, robots: 'noindex' },
    };
    res.status(status).render('public/error', data, (err, html) => (err ? fallback(err) : res.send(html)));
  } catch (err) {
    fallback(err);
  }
}

const ADMIN_MESSAGES = {
  403: ['Ruxsat yo\'q', 'Sahifa eskirgan yoki xavfsizlik tekshiruvidan o\'tmadi. Sahifani yangilab, qaytadan urinib ko\'ring.'],
  404: ['Sahifa topilmadi', 'Bunday sahifa mavjud emas yoki o\'chirilgan.'],
  500: ['Serverda xatolik', 'Kutilmagan xatolik yuz berdi. Tafsilotlar server logida.'],
};

function renderAdminError(req, res, status) {
  const [title, text] = ADMIN_MESSAGES[status] || ADMIN_MESSAGES[status >= 500 ? 500 : 404];
  res.status(status).render('admin/error', { title, text, code: status }, (err, html) => {
    if (!err) return res.send(html);
    log.error("Admin xato sahifasini chiqarib bo'lmadi", err);
    res.type('text/plain; charset=utf-8').send(`${status} — ${title}`);
  });
}

module.exports = { detectLang, renderPublicError, renderAdminError };

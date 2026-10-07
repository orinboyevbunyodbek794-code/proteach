/**
 * Ochiq sayt: /uz/, /ru/, /en/ — bosh sahifa, kurs sahifalari, ariza yuborish.
 */
'use strict';

const express = require('express');
const config = require('../config');
const log = require('../logger');
const { LANGS, DEFAULT_LANG, COURSE_SEGMENT, isLang, translator, pick, homePath, coursePath } = require('../i18n');
const settings = require('../services/settings');
const courses = require('../services/courses');
const applications = require('../services/applications');
const telegram = require('../services/telegram');
const { urls } = require('../services/media');
const { normalizePhone } = require('../utils/phone');
const v = require('../utils/validate');
const { plain, truncate } = require('../utils/text');
const { applyLimiter } = require('../middleware/rate-limits');
const { baseContext, courseCard, organizationLd } = require('./context');

const router = express.Router();

const LANG_COOKIE = 'pt_lang';
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'ʻʼ‘’`-]{1,79}$/u;

/** Tilni o'rnatadi va tanlovni cookie da eslab qoladi */
function useLang(lang) {
  return (req, res, next) => {
    res.locals.lang = lang;
    res.locals.t = translator(lang);
    if (req.cookies[LANG_COOKIE] !== lang) {
      res.cookie(LANG_COOKIE, lang, { maxAge: 365 * 24 * 3600 * 1000, sameSite: 'lax', path: '/', secure: req.secure });
    }
    next();
  };
}

function videoData() {
  const video = settings.getVideo();
  if (!video.file || !video.visible) return null;
  return { url: urls.video(video.file), mime: video.mime, poster: urls.poster(video.poster) };
}

function localizedContent(lang) {
  const c = settings.getContent();
  return {
    heroTitle: pick(c.hero_title, lang),
    heroSubtitle: pick(c.hero_subtitle, lang),
    aboutTitle: pick(c.about_title, lang),
    aboutText: pick(c.about_text, lang),
    advantages: c.advantages
      .map((a) => ({ icon: a.icon, title: pick(a.title, lang), text: pick(a.text, lang) }))
      .filter((a) => a.title),
  };
}

// --- / -> tanlangan yoki standart til ---
router.get('/', (req, res) => {
  const saved = req.cookies[LANG_COOKIE];
  res.redirect(302, homePath(isLang(saved) ? saved : DEFAULT_LANG));
});

for (const lang of LANGS) {
  const setLang = useLang(lang);

  // Bosh sahifa
  router.get(`/${lang}`, setLang, (req, res) => {
    if (!req.path.endsWith('/')) {
      const qs = req.originalUrl.slice(req.originalUrl.indexOf('?') >= 0 ? req.originalUrl.indexOf('?') : req.originalUrl.length);
      return res.redirect(301, `/${lang}/${qs}`);
    }
    const ctx = baseContext(lang);
    const t = ctx.t;
    const active = courses.listActive().map((c) => courseCard(c, lang, t));
    const preselect = active.find((c) => c.slug === req.query.course);
    res.render('public/home', {
      ...ctx,
      page: 'home',
      content: localizedContent(lang),
      video: videoData(),
      courses: active,
      form: {
        selectedId: preselect ? preselect.id : null,
        applied: req.query.applied === '1',
        failed: req.query.error === '1',
        returnTo: homePath(lang),
      },
      jsonLd: [organizationLd(lang, ctx.contacts)],
    });
  });

  // Kurslar ro'yxati alohida sahifa emas — bosh sahifadagi bo'limga yo'naltiramiz
  for (const seg of new Set(Object.values(COURSE_SEGMENT))) {
    router.get(`/${lang}/${seg}`, (req, res) => res.redirect(301, `${homePath(lang)}#courses`));

    // Kurs sahifasi
    router.get(`/${lang}/${seg}/:slug`, setLang, (req, res, next) => {
      const slug = String(req.params.slug || '').toLowerCase();
      if (seg !== COURSE_SEGMENT[lang]) return res.redirect(301, coursePath(lang, slug));
      const course = courses.getBySlug(slug);
      if (!course || !course.isActive) return next(); // 404
      const ctx = baseContext(lang, (l) => coursePath(l, course.slug));
      const t = ctx.t;
      const card = courseCard(course, lang, t);
      const all = courses.listActive().map((c) => courseCard(c, lang, t));
      res.render('public/course', {
        ...ctx,
        page: 'course',
        course: card,
        courses: all,
        others: all.filter((c) => c.id !== card.id),
        form: { selectedId: card.id, applied: req.query.applied === '1', failed: req.query.error === '1', returnTo: card.url },
        meta: {
          ...ctx.meta,
          title: `${plain(card.name)} — Pro Teach`,
          description: truncate(card.short || card.description, 160),
        },
        ogImage: card.imageUrl ? config.siteUrl + card.imageUrl : ctx.ogImage,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: card.name,
            description: truncate(card.description || card.short, 300),
            url: config.siteUrl + card.url,
            inLanguage: lang,
            provider: { '@type': 'EducationalOrganization', name: 'Pro Teach', sameAs: config.siteUrl },
            ...(card.price ? { offers: { '@type': 'Offer', price: card.price, priceCurrency: 'UZS', category: 'Paid' } } : {}),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t('course.breadcrumbHome'), item: config.siteUrl + homePath(lang) },
              { '@type': 'ListItem', position: 2, name: card.name, item: config.siteUrl + card.url },
            ],
          },
        ],
      });
    });
  }

  // Ariza yuborish
  router.post(`/${lang}/apply`, setLang, applyLimiter, (req, res) => {
    const t = res.locals.t;
    const isFetch = req.get('x-requested-with') === 'fetch';
    const body = req.body || {};
    const returnTo = (() => {
      const r = v.line(body.return, 200);
      return r.startsWith(`/${lang}/`) && !r.startsWith('//') ? r.split('#')[0].split('?')[0] : homePath(lang);
    })();
    const done = (ok, payload = {}) => {
      if (isFetch) return res.status(ok ? 200 : payload.status || 422).json({ ok, ...payload });
      return res.redirect(303, `${returnTo}?${ok ? 'applied' : 'error'}=1#apply`);
    };
    const success = () => done(true, { title: t('form.successTitle'), message: t('form.successText') });

    // Honeypot: odamlar ko'rmaydigan maydon to'ldirilgan bo'lsa — bot. Jimgina "muvaffaqiyat" qaytaramiz.
    if (v.line(body.website, 200)) {
      log.warn(`Honeypot ishladi (${req.ip}) — ariza saqlanmadi`);
      return success();
    }

    const name = v.line(body.name, 120);
    const phone = normalizePhone(body.phone);
    const courseId = v.id(body.course);
    const course = courseId ? courses.getActiveById(courseId) : null;
    const category = v.oneOf(body.category, applications.CATEGORIES, '');
    const comment = v.multiline(body.comment, 2000);

    const errors = {};
    if (!NAME_RE.test(name) || name.length > 80) errors.name = t('form.errors.name');
    if (!phone) errors.phone = t('form.errors.phone');
    if (!course) errors.course = t('form.errors.course');
    if (comment.length > 500) errors.comment = t('form.errors.comment');
    if (Object.keys(errors).length) {
      return done(false, { errors, message: Object.values(errors)[0] });
    }

    try {
      const app = applications.create({
        name,
        phone,
        courseId: course.id,
        courseName: course.name.uz,
        category,
        comment,
        lang,
      });
      telegram.notifyNewApplication(app);
      return success();
    } catch (err) {
      log.error('Arizani saqlashda xato', err);
      return done(false, { status: 500, message: t('form.errors.generic') });
    }
  });
}

module.exports = router;

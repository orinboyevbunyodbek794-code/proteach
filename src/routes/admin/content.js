/**
 * Sayt matnlari: hero, "Biz haqimizda", afzalliklar (uch tilda).
 */
'use strict';

const express = require('express');
const settings = require('../../services/settings');
const courses = require('../../services/courses');
const { LANGS } = require('../../i18n');
const v = require('../../utils/validate');

const router = express.Router();
const MAX_ADVANTAGES = 8;

router.get('/', (req, res) => {
  res.render('admin/content', {
    title: 'Sayt matnlari',
    active: 'content',
    content: settings.getContent(),
    icons: courses.ICONS,
    iconLabels: courses.ICON_LABELS,
    maxAdvantages: MAX_ADVANTAGES,
  });
});

router.post('/', (req, res) => {
  const b = req.body;
  const col = (name) => v.toArray(b[name]);
  const icons = col('adv_icon');
  const advantages = [];
  for (let i = 0; i < icons.length && advantages.length < MAX_ADVANTAGES; i++) {
    const title = Object.fromEntries(LANGS.map((l) => [l, v.line(col(`adv_title_${l}`)[i], 80)]));
    const text = Object.fromEntries(LANGS.map((l) => [l, v.line(col(`adv_text_${l}`)[i], 300)]));
    if (!title.uz && !title.ru && !title.en) continue;
    advantages.push({ icon: v.oneOf(icons[i], courses.ICONS, 'sparkles'), title, text });
  }

  settings.saveContent({
    hero_title: v.i18nFields(b, 'hero_title', { max: 120 }),
    hero_subtitle: v.i18nFields(b, 'hero_subtitle', { max: 400 }),
    about_title: v.i18nFields(b, 'about_title', { max: 120 }),
    about_text: v.i18nFields(b, 'about_text', { max: 3000, multi: true }),
    advantages,
  });
  req.flash('success', 'Sayt matnlari saqlandi.');
  res.redirect('/admin/content');
});

router.post('/reset', (req, res) => {
  settings.saveContent({});
  req.flash('success', 'Sayt matnlari standart holatga qaytarildi.');
  res.redirect('/admin/content');
});

module.exports = router;

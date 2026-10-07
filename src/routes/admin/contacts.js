/**
 * Bog'lanish ma'lumotlari: telefonlar, manzil, ish vaqti, ijtimoiy tarmoqlar, xarita.
 */
'use strict';

const express = require('express');
const settings = require('../../services/settings');
const { normalizePhone, formatPhone } = require('../../utils/phone');
const v = require('../../utils/validate');

const router = express.Router();

const MAP_HOSTS = ['yandex.ru', 'yandex.uz', 'yandex.com', 'google.com'];

/** "@proteachuz" yoki "proteachuz" -> to'liq havola */
function socialUrl(value, base, hosts) {
  const s = v.line(value, 300);
  if (!s) return '';
  const handle = s.match(/^@?([A-Za-z0-9_.]{2,64})$/);
  if (handle) return `${base}${handle[1]}`;
  return v.url(s, { hosts });
}

/** Admin iframe kodini to'liq qo'yishi mumkin — undan src ajratib olinadi */
function mapEmbedUrl(value) {
  let s = v.line(value, 2000);
  if (!s) return '';
  const m = s.match(/src\s*=\s*["']([^"']+)["']/i);
  if (m) s = m[1];
  s = s.replace(/&amp;/g, '&');
  return v.url(s, { hosts: MAP_HOSTS });
}

function viewModel(c) {
  return { ...c, phonesDisplay: c.phones.map(formatPhone) };
}

router.get('/', (req, res) => {
  res.render('admin/contacts', { title: "Bog'lanish ma'lumotlari", active: 'contacts', c: viewModel(settings.getContacts()), errors: {} });
});

router.post('/', (req, res) => {
  const errors = {};
  const rawPhones = v.toArray(req.body.phones).map((p) => v.line(p, 40)).filter(Boolean).slice(0, 10);
  const phones = [];
  rawPhones.forEach((p) => {
    const n = normalizePhone(p);
    if (!n) errors.phones = `Noto'g'ri raqam: "${p}". Format: +998 XX XXX XX XX`;
    else if (!phones.includes(n)) phones.push(n);
  });

  const data = {
    phones,
    address: v.i18nFields(req.body, 'address', { max: 200 }),
    hours: v.i18nFields(req.body, 'hours', { max: 200 }),
    email: v.email(req.body.email),
    instagram: socialUrl(req.body.instagram, 'https://www.instagram.com/', ['instagram.com']),
    telegram: socialUrl(req.body.telegram, 'https://t.me/', ['t.me', 'telegram.me']),
    facebook: socialUrl(req.body.facebook, 'https://www.facebook.com/', ['facebook.com', 'fb.com']),
    youtube: socialUrl(req.body.youtube, 'https://www.youtube.com/@', ['youtube.com', 'youtu.be']),
    mapLink: v.url(req.body.map_link, { hosts: [...MAP_HOSTS, 'goo.gl', 'maps.app.goo.gl', '2gis.uz', '2gis.ru'] }),
    mapEmbed: mapEmbedUrl(req.body.map_embed),
  };

  if (data.email === null) errors.email = "Email manzili noto'g'ri.";
  if (data.instagram === null) errors.instagram = 'Instagram havolasi yoki @username kiriting.';
  if (data.telegram === null) errors.telegram = 'Telegram havolasi (t.me/...) yoki @username kiriting.';
  if (data.facebook === null) errors.facebook = "Facebook havolasi noto'g'ri.";
  if (data.youtube === null) errors.youtube = "YouTube havolasi noto'g'ri.";
  if (data.mapLink === null) errors.map_link = 'Xarita havolasi Yandex yoki Google Maps manzili bo\'lishi kerak.';
  if (data.mapEmbed === null) errors.map_embed = "Embed havolasi faqat Yandex yoki Google xaritasidan bo'lishi mumkin.";
  if (!phones.length && !errors.phones) errors.phones = 'Kamida bitta telefon raqam kiriting.';
  if (!data.address.uz) errors.address_uz = "Manzil (o'zbekcha) majburiy.";

  if (Object.keys(errors).length) {
    const view = { ...data, phones: rawPhones };
    for (const k of ['email', 'instagram', 'telegram', 'facebook', 'youtube', 'mapLink', 'mapEmbed']) {
      if (view[k] === null) view[k] = v.line(req.body[k === 'mapLink' ? 'map_link' : k === 'mapEmbed' ? 'map_embed' : k], 500);
    }
    return res.status(422).render('admin/contacts', {
      title: "Bog'lanish ma'lumotlari",
      active: 'contacts',
      c: { ...view, phonesDisplay: rawPhones },
      errors,
    });
  }

  settings.saveContacts(data);
  req.flash('success', "Bog'lanish ma'lumotlari saqlandi. Saytda darhol yangilandi.");
  res.redirect('/admin/contacts');
});

module.exports = router;

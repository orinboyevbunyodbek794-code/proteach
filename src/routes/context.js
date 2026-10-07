/**
 * Ochiq sayt sahifalari uchun umumiy ma'lumotlar: til, tarjima, kontaktlar, SEO.
 */
'use strict';

const config = require('../config');
const { LANGS, translator, pick, homePath, coursePath } = require('../i18n');
const settings = require('../services/settings');
const courses = require('../services/courses');
const { urls } = require('../services/media');
const { formatPhone, telHref } = require('../utils/phone');
const { priceText } = require('../middleware/locals');

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'telegram', label: 'Telegram', icon: 'telegram' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook' },
  { key: 'youtube', label: 'YouTube', icon: 'youtube' },
];

/** Havoladan @handle ajratish: https://instagram.com/proteachuz -> @proteachuz */
function handleOf(url) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean)[0];
    return seg ? '@' + seg.replace(/^@/, '') : '';
  } catch {
    return '';
  }
}

function publicContacts(lang) {
  const c = settings.getContacts();
  return {
    phones: c.phones.map((p) => ({ raw: p, display: formatPhone(p), href: telHref(p) })),
    address: pick(c.address, lang),
    hours: pick(c.hours, lang),
    email: c.email,
    socials: SOCIALS.filter((s) => c[s.key]).map((s) => ({ ...s, url: c[s.key], handle: handleOf(c[s.key]) })),
    mapLink: c.mapLink,
    mapEmbed: c.mapEmbed,
  };
}

/** Kursni sayt uchun tayyorlash: tarjima, havolalar, rasm, narx matni */
function courseCard(course, lang, t) {
  const c = courses.localize(course, lang);
  return {
    ...c,
    url: coursePath(lang, c.slug),
    imageUrl: urls.courseImage(c.image, 1200),
    imageSmall: urls.courseImage(c.image, 600),
    priceLabel: priceText(c.price, c.pricePeriod, t),
  };
}

/**
 * Har bir sahifa uchun asosiy kontekst.
 * @param {string} lang
 * @param {(l: string) => string} pathFor — shu sahifaning boshqa tillardagi manzili
 */
function baseContext(lang, pathFor = homePath) {
  const t = translator(lang);
  const alternates = Object.fromEntries(LANGS.map((l) => [l, pathFor(l)]));
  return {
    lang,
    t,
    langs: LANGS,
    langNames: { uz: 'Oʻzbekcha', ru: 'Русский', en: 'English' },
    alternates,
    canonical: config.siteUrl + alternates[lang],
    home: homePath(lang),
    contacts: publicContacts(lang),
    ogImage: config.siteUrl + '/img/og-image.jpg',
    meta: { title: t('meta.title'), description: t('meta.description'), type: 'website', robots: 'index, follow' },
    jsonLd: null,
  };
}

/** EducationalOrganization + LocalBusiness tuzilgan ma'lumot (Google uchun) */
function organizationLd(lang, contacts) {
  const t = translator(lang);
  return {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': config.siteUrl + '/#organization',
    name: 'Pro Teach',
    alternateName: 'ProTeach Academy',
    description: t('meta.description'),
    url: config.siteUrl + homePath(lang),
    logo: config.siteUrl + '/img/icon-512.png',
    image: config.siteUrl + '/img/og-image.jpg',
    foundingDate: '2022-07',
    telephone: contacts.phones.map((p) => p.raw),
    email: contacts.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contacts.address,
      addressLocality: lang === 'ru' ? 'Коканд' : lang === 'en' ? 'Kokand' : 'Qoʻqon',
      addressRegion: lang === 'ru' ? 'Ферганская область' : lang === 'en' ? 'Fergana Region' : 'Fargʻona viloyati',
      addressCountry: 'UZ',
    },
    hasMap: contacts.mapLink || undefined,
    sameAs: contacts.socials.map((s) => s.url),
    areaServed: 'Kokand, Uzbekistan',
  };
}

module.exports = { baseContext, publicContacts, courseCard, organizationLd, handleOf };

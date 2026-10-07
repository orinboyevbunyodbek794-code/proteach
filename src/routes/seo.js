/**
 * robots.txt, sitemap.xml (hreflang bilan) va web manifest.
 */
'use strict';

const express = require('express');
const config = require('../config');
const { LANGS, homePath, coursePath } = require('../i18n');
const courses = require('../services/courses');
const { parseDbDate } = require('../utils/format');

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /*/apply', '', `Sitemap: ${config.siteUrl}/sitemap.xml`, ''].join('\n')
  );
});

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(pathFor, lastmod, priority) {
  return LANGS.map((lang) => {
    const links = LANGS.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(config.siteUrl + pathFor(l))}"/>`
    );
    links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(config.siteUrl + pathFor('uz'))}"/>`);
    return [
      '  <url>',
      `    <loc>${xmlEscape(config.siteUrl + pathFor(lang))}</loc>`,
      ...links,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
      `    <priority>${priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  }).join('\n');
}

router.get('/sitemap.xml', (req, res) => {
  const active = courses.listActive();
  const newest = active.reduce((max, c) => (c.updatedAt > max ? c.updatedAt : max), '');
  const day = (s) => {
    const d = parseDbDate(s);
    return d ? d.toISOString().slice(0, 10) : '';
  };
  const parts = [urlEntry(homePath, day(newest), '1.0')];
  for (const c of active) parts.push(urlEntry((l) => coursePath(l, c.slug), day(c.updatedAt), '0.8'));
  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
      parts.join('\n') +
      '\n</urlset>\n'
  );
});

router.get('/site.webmanifest', (req, res) => {
  res.type('application/manifest+json').json({
    name: 'Pro Teach — zamonaviy kasblar markazi',
    short_name: 'Pro Teach',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d0f',
    theme_color: '#0d0d0f',
    icons: [
      { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  });
});

module.exports = router;

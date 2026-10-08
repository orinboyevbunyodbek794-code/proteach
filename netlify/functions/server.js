/**
 * Pro Teach — Netlify Function (v2, CommonJS).
 *
 * public/ dagi statik fayllarni Netlify CDN o'zi beradi (preferStatic),
 * qolgan barcha manzillar (sahifalar, admin panel, forma, sitemap) shu funksiyaga keladi.
 *
 * Nega CommonJS: Netlify v2 funksiyalarni bitta faylga yig'adi va paketlarni (express va h.k.)
 * alohida node_modules sifatida qo'shadi. CommonJS chiqishda `require("paket")` oddiy holda
 * qoladi va Netlify ularni to'g'ri topib arxivga kiritadi.
 */
'use strict';

const proteach = require('../../src/netlify/handler.js');

exports.default = async (request, context) => proteach.handle(request, context);

exports.config = {
  path: ['/', '/*'],
  preferStatic: true,
};

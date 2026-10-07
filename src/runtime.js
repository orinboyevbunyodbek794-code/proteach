/**
 * Ilova qayerda ishlayotganini aniqlaydi:
 *   server  — oddiy Node.js server (lokal kompyuter, VPS): SQLite fayl, uploads/ papka
 *   netlify — Netlify Functions: baza va fayllar Netlify Blobs'da saqlanadi
 * Netlify funksiyasi (netlify/functions/server.mjs) PROTEACH_RUNTIME=netlify ni o'rnatadi.
 */
'use strict';

const isNetlify = process.env.PROTEACH_RUNTIME === 'netlify';

module.exports = {
  isNetlify,
  name: isNetlify ? 'netlify' : 'server',
  // Netlify funksiyasiga so'rov hajmi ~6 MB bilan cheklangan — katta video yuklab bo'lmaydi
  videoUploadEnabled: !isNetlify,
};

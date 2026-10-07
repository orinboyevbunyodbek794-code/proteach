/**
 * Pro Teach — Netlify Function (v2).
 * public/ dagi statik fayllarni Netlify CDN o'zi beradi (preferStatic),
 * qolgan barcha manzillar (sahifalar, admin panel, forma, sitemap) shu funksiyaga keladi.
 */
import proteach from '../../src/netlify/handler.js';

export default async (request, context) => proteach.handle(request, context);

export const config = {
  path: ['/', '/*'],
  preferStatic: true,
};

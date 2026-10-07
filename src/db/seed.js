/**
 * Boshlang'ich ma'lumotlarni kiritish: 4 ta kurs, kontaktlar va admin.
 *
 *   npm run seed            — yetishmayotgan ma'lumotlarni qo'shadi (mavjudlariga tegmaydi)
 *   npm run seed -- --force — kontaktlar va sayt matnlarini standart holatga qaytaradi,
 *                             seed kurslarini qayta yozadi (arizalarga tegmaydi)
 *
 * Server birinchi marta ishga tushganda ham avtomatik chaqiriladi (bir martalik).
 */
'use strict';

const { LANGS } = require('../i18n');
const log = require('../logger');
const seedData = require('./seed-data');

function courseData(c) {
  return {
    slug: c.slug,
    name: c.name,
    short: c.short,
    description: c.description,
    learn: c.learn,
    duration: Object.fromEntries(LANGS.map((l) => [l, ''])),
    price: null,
    pricePeriod: 'month',
    image: null,
    icon: c.icon,
    isActive: true,
  };
}

function runSeed({ onlyIfFresh = false, force = false } = {}) {
  const settings = require('../services/settings');
  const courses = require('../services/courses');
  const { getDb } = require('./index');

  if (onlyIfFresh && settings.get('seeded_at')) return false;

  getDb().transaction(() => {
    // Kontaktlar
    if (force || !settings.get('contacts')) settings.saveContacts(seedData.contacts);
    if (force) settings.saveContent({});
    settings.setIfMissing('content', {});
    settings.setIfMissing('video', settings.getVideo());

    // Kurslar
    for (const c of seedData.courses) {
      const existing = courses.getBySlug(c.slug);
      if (!existing) {
        courses.create(courseData(c));
      } else if (force) {
        courses.update(existing.id, {
          ...courseData(c),
          price: existing.price,
          pricePeriod: existing.pricePeriod,
          duration: existing.duration,
          image: existing.image,
          isActive: existing.isActive,
        });
      }
    }
    settings.set('seeded_at', new Date().toISOString());
  })();

  log.info(`Boshlang'ich ma'lumotlar kiritildi${force ? ' (--force)' : ''}.`);
  return true;
}

module.exports = { runSeed };

// CLI: npm run seed
if (require.main === module) {
  const { migrate, closeDatabase } = require('./index');
  migrate();
  require('../services/admins').ensureFirstAdmin();
  require('../services/media').ensureDirs();
  runSeed({ force: process.argv.includes('--force') });
  closeDatabase();
}

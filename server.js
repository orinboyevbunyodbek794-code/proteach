/**
 * Pro Teach — kirish nuqtasi.
 * Bazani tayyorlaydi (migratsiya, birinchi admin, boshlang'ich ma'lumotlar) va HTTP serverni ishga tushiradi.
 */
'use strict';

const config = require('./src/config');
const log = require('./src/logger');
const { initDatabase } = require('./src/db');
const { createApp } = require('./src/app');

initDatabase();
const app = createApp();

const server = app.listen(config.port, config.host, () => {
  log.info(`Pro Teach ishga tushdi: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port} (${config.env})`);
});

// Katta videolarni sekin internetda yuklash uchun so'rov vaqtini uzaytiramiz
server.requestTimeout = 30 * 60 * 1000;
server.headersTimeout = 65 * 1000;
server.keepAliveTimeout = 61 * 1000;

function shutdown(signal) {
  log.info(`${signal} qabul qilindi, server to'xtatilmoqda...`);
  server.close(() => {
    require('./src/db').closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => log.error('unhandledRejection', err));

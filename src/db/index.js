/**
 * SQLite ulanishi va migratsiyalar.
 *   server  rejimi: better-sqlite3, data/proteach.db fayli
 *   netlify rejimi: sql.js (WebAssembly) + Netlify Blobs (src/db/netlify-db.js)
 * Barcha so'rovlar parametrlashtirilgan (prepared statements) — SQL inyeksiyadan himoya.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const log = require('../logger');
const runtime = require('../runtime');
const migrations = require('./migrations');

let db = null;

function getDb() {
  if (runtime.isNetlify) return require('./netlify-db').current();
  if (!db) {
    const Database = require('better-sqlite3');
    fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
    db = new Database(config.dbFile);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

function migrate() {
  const conn = getDb();
  const current = conn.pragma('user_version', { simple: true });
  const pending = migrations.filter((m) => m.version > current);
  for (const m of pending) {
    conn.transaction(() => {
      conn.exec(m.sql);
      conn.pragma(`user_version = ${m.version}`);
    })();
    log.info(`Migratsiya qo'llandi: v${m.version} — ${m.name}`);
  }
}

/** Server rejimida ishga tushganda: jadvallar, birinchi admin va boshlang'ich ma'lumotlar. */
function initDatabase() {
  migrate();
  require('../services/admins').ensureFirstAdmin();
  require('./seed').runSeed({ onlyIfFresh: true });
  require('../services/media').ensureDirs();
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, migrate, initDatabase, closeDatabase };

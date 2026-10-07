/**
 * Netlify rejimidagi baza: SQLite (sql.js, WebAssembly) xotirada ishlaydi,
 * fayl esa Netlify Blobs'da saqlanadi.
 *
 *   ready()  — har so'rov boshida: Blobs'dagi versiya o'zgargan bo'lsa, yangisini yuklaydi
 *              (o'zgarmagan bo'lsa ETag orqali 304 — tez)
 *   flush()  — javobdan oldin: o'zgarish bo'lsa, shartli yozish (If-Match).
 *              Boshqa nusxa ulgurib o'zgartirgan bo'lsa — eng yangi bazani olib,
 *              shu so'rovdagi buyruqlarni uning ustida qayta bajaradi. Hech narsa yo'qolmaydi.
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const log = require('../logger');
const { SqlJsAdapter } = require('./sqljs-adapter');

const STORE = 'proteach';
const KEY = 'db/proteach.sqlite';
const MAX_ATTEMPTS = 6;

let SQL = null;
let adapter = null;
let etag = null; // Blobs'dagi versiya belgisi (shartli yozish uchun)
let exists = false; // Blobs'da baza fayli bormi

function store() {
  const { getStore } = require('@netlify/blobs');
  return getStore({ name: STORE, consistency: 'strong' });
}

async function engine() {
  if (!SQL) {
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs({ wasmBinary: fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm')) });
  }
  return SQL;
}

function open(bytes) {
  return new SqlJsAdapter(bytes ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database());
}

/** Netlify'da SESSION_SECRET berilmagan bo'lsa — bazada saqlanadigan tasodifiy kalit */
function ensureSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 32) return;
  const settings = require('../services/settings');
  let sec = settings.get('security', null);
  if (!sec || !sec.secret) {
    sec = { secret: crypto.randomBytes(48).toString('hex'), createdAt: new Date().toISOString() };
    settings.set('security', sec);
  }
  config.sessionSecret = sec.secret;
}

/** Jadvallar, birinchi admin, boshlang'ich ma'lumotlar — jurnalga yozilmaydi */
function bootstrap(a) {
  a.system(() => {
    require('./index').migrate();
    require('../services/admins').ensureFirstAdmin();
    require('./seed').runSeed({ onlyIfFresh: true });
    ensureSecret();
  });
}

function current() {
  if (!adapter) throw new Error('Netlify bazasi hali yuklanmagan (ready() chaqirilmagan)');
  return adapter;
}

async function ready() {
  await engine();
  const res = await store().getWithMetadata(KEY, { type: 'arrayBuffer', etag: adapter && etag ? etag : undefined });
  if (!res) {
    // Blobs'da baza yo'q — birinchi ishga tushish (yoki o'chirilgan)
    if (!adapter || exists) {
      if (adapter) adapter.close();
      adapter = open(null);
      etag = null;
      exists = false;
      bootstrap(adapter);
      log.info('Netlify: yangi baza yaratildi');
    }
    return adapter;
  }
  if (adapter && res.data === null) return adapter; // o'zgarmagan (304)
  if (adapter) adapter.close();
  adapter = open(res.data);
  etag = res.etag || null;
  exists = true;
  bootstrap(adapter); // migratsiya kerak bo'lsa — dirty bo'ladi va saqlanadi
  adapter.log = [];
  return adapter;
}

async function flush() {
  if (!adapter || !adapter.dirty) return;
  const s = store();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const bytes = adapter.export();
    // ETag bor — faqat o'zgarmagan bo'lsa yozamiz; fayl yo'q — faqat yangi bo'lsa;
    // ETag noma'lum (kutilmagan holat) — shartsiz yozamiz
    const conditions = etag ? { onlyIfMatch: etag } : exists ? {} : { onlyIfNew: true };
    const result = await s.set(KEY, new Blob([bytes]), conditions);
    if (result.modified) {
      etag = result.etag || null;
      exists = true;
      adapter.dirty = false;
      adapter.log = [];
      return;
    }
    // Boshqa nusxa bazani o'zgartirgan — eng yangisini olib, buyruqlarni qayta bajaramiz
    const pending = adapter.log;
    const latest = await s.getWithMetadata(KEY, { type: 'arrayBuffer' });
    adapter.close();
    adapter = open(latest ? latest.data : null);
    etag = latest ? latest.etag || null : null;
    exists = Boolean(latest);
    bootstrap(adapter);
    adapter.log = [];
    adapter.transaction(() => pending.forEach((entry) => adapter.replay(entry)))();
    adapter.dirty = true;
    log.warn(`Netlify: baza ziddiyati (urinish ${attempt}) — ${pending.length} ta buyruq yangi versiyada qayta bajarildi`);
  }
  throw new Error("Bazani saqlab bo'lmadi: bir vaqtda juda ko'p o'zgarish");
}

module.exports = { ready, flush, current };

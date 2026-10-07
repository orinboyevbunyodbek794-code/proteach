/**
 * Ma'lumotlar bazasining zaxira nusxasi:  npm run backup
 * Sayt ishlab turgan paytda ham xavfsiz (SQLite online backup API).
 * Natija: backups/proteach-YYYY-MM-DD_HH-MM.db  (eng oxirgi 30 tasi saqlanadi)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../src/config');

const KEEP = 30;
const dir = path.join(config.root, 'backups');

async function main() {
  if (!fs.existsSync(config.dbFile)) throw new Error('Baza topilmadi: ' + config.dbFile);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const target = path.join(dir, `proteach-${stamp}.db`);
  const db = new Database(config.dbFile, { readonly: true });
  await db.backup(target);
  db.close();
  console.log('Zaxira nusxa yaratildi:', target);

  const old = fs.readdirSync(dir).filter((f) => /^proteach-.*\.db$/.test(f)).sort().reverse().slice(KEEP);
  for (const f of old) fs.rmSync(path.join(dir, f));
  if (old.length) console.log(`Eski nusxalar o'chirildi: ${old.length} ta`);
}

main().catch((err) => {
  console.error('Zaxiralashda xato:', err.message);
  process.exit(1);
});

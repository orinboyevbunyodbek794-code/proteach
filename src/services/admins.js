/**
 * Administratorlar: parollar bcrypt bilan saqlanadi.
 */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const config = require('../config');
const log = require('../logger');

const ROUNDS = 12;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD = 8;

// Foydalanuvchi topilmaganda ham bcrypt tekshiruvi bajariladi (vaqt bo'yicha farq bilinmasin)
let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), ROUNDS);
  return dummyHash;
}

function count() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM admins').get().n;
}

function list() {
  return getDb().prepare('SELECT id, username, created_at, last_login_at FROM admins ORDER BY id').all();
}

function findById(id) {
  return getDb().prepare('SELECT id, username, created_at, last_login_at FROM admins WHERE id = ?').get(id) || null;
}

function validateUsername(username) {
  return USERNAME_RE.test(username || '');
}

function validatePassword(password) {
  const p = String(password || '');
  return p.length >= MIN_PASSWORD && p.length <= 128;
}

/** Login tekshiruvi. Muvaffaqiyatli bo'lsa admin obyekti, aks holda null */
async function authenticate(username, password) {
  const row = getDb().prepare('SELECT * FROM admins WHERE username = ?').get(String(username || '').trim());
  const ok = await bcrypt.compare(String(password || ''), row ? row.password_hash : getDummyHash());
  if (!row || !ok) return null;
  getDb().prepare('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
  return findById(row.id);
}

async function verifyPassword(id, password) {
  const row = getDb().prepare('SELECT password_hash FROM admins WHERE id = ?').get(id);
  if (!row) return false;
  return bcrypt.compare(String(password || ''), row.password_hash);
}

async function create(username, password) {
  const hash = await bcrypt.hash(password, ROUNDS);
  const info = getDb().prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  return findById(info.lastInsertRowid);
}

function exists(username) {
  return !!getDb().prepare('SELECT 1 FROM admins WHERE username = ?').get(username);
}

async function changePassword(id, password) {
  const hash = await bcrypt.hash(password, ROUNDS);
  getDb().prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, id);
}

function remove(id) {
  return getDb().prepare('DELETE FROM admins WHERE id = ?').run(id).changes > 0;
}

/** Birinchi ishga tushishda .env dagi ADMIN_USERNAME / ADMIN_PASSWORD bilan admin yaratadi */
function ensureFirstAdmin() {
  if (count() > 0) return;
  let username = config.adminUsername;
  let password = config.adminPassword;
  if (!validateUsername(username)) {
    log.warn(`ADMIN_USERNAME noto'g'ri ("${username}") — "admin" ishlatiladi.`);
    username = 'admin';
  }
  if (!validatePassword(password)) {
    if (config.isProd) {
      throw new Error(`ADMIN_PASSWORD .env faylida kamida ${MIN_PASSWORD} belgidan iborat bo'lishi shart.`);
    }
    password = crypto.randomBytes(9).toString('base64url');
    log.warn(`ADMIN_PASSWORD berilmagan. Vaqtinchalik parol yaratildi: ${password} (kirgach almashtiring!)`);
  }
  getDb().prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, bcrypt.hashSync(password, ROUNDS));
  log.info(`Birinchi administrator yaratildi: ${username}`);
}

module.exports = {
  MIN_PASSWORD,
  count,
  list,
  findById,
  validateUsername,
  validatePassword,
  authenticate,
  verifyPassword,
  create,
  exists,
  changePassword,
  remove,
  ensureFirstAdmin,
};

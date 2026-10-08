/**
 * Barcha sozlamalar .env faylidan (Netlify'da — sayt Environment variables bo'limidan) o'qiladi.
 * Namuna: .env.example
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const runtime = require('./runtime');

/**
 * Loyiha ildizi (views/ va public/ joylashgan papka).
 * Netlify funksiyasi bitta faylga yig'ilganda __dirname o'zgaradi — shuning uchun
 * yuqoriga qarab views/ papkasi bor joyni qidiramiz.
 */
function findRoot() {
  const candidates = [];
  for (let dir = __dirname; ; dir = path.dirname(dir)) {
    candidates.push(dir);
    if (path.dirname(dir) === dir) break;
  }
  if (process.env.LAMBDA_TASK_ROOT) candidates.push(process.env.LAMBDA_TASK_ROOT);
  candidates.push(process.cwd());
  return candidates.find((d) => fs.existsSync(path.join(d, 'views', 'public', 'home.ejs'))) || path.join(__dirname, '..');
}

const ROOT = findRoot();
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
const env = process.env.NODE_ENV || (runtime.isNetlify ? 'production' : 'development');
const isProd = env === 'production';

function int(name, def) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
}

function resolveDir(value, def) {
  const p = value && value.trim() ? value.trim() : def;
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

let sessionSecret = (process.env.SESSION_SECRET || '').trim();
if (!sessionSecret || sessionSecret.length < 32) {
  if (runtime.isNetlify) {
    // Netlify'da kalit berilmasa, birinchi ishga tushishda bazada yaratiladi (src/db/netlify-db.js)
    sessionSecret = '';
  } else if (isProd) {
    throw new Error('SESSION_SECRET .env faylida kamida 32 belgidan iborat bo\'lishi shart (production rejimi).');
  } else {
    // Dev rejimida vaqtinchalik kalit: server qayta ishga tushganda sessiyalar bekor bo'ladi
    sessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[config] SESSION_SECRET berilmagan — vaqtinchalik kalit ishlatilmoqda (faqat dev uchun).');
  }
}

function cookieSecure() {
  const v = (process.env.COOKIE_SECURE || 'auto').trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return 'auto';
}

function trustProxy() {
  // Netlify funksiyasida so'rov bitta "proksi" (bizning ko'prik) orqali keladi
  if (runtime.isNetlify) return 1;
  const v = (process.env.TRUST_PROXY || 'loopback').trim();
  if (v === 'false' || v === '0') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v; // masalan: loopback, "loopback, 10.0.0.1"
}

// Netlify o'zi URL (asosiy domen) o'zgaruvchisini beradi
const siteUrl = process.env.SITE_URL || (runtime.isNetlify ? process.env.URL : '') || 'http://localhost:3000';

module.exports = {
  root: ROOT,
  env,
  isProd,
  host: process.env.HOST || '0.0.0.0',
  port: int('PORT', 3000),
  siteUrl: siteUrl.replace(/\/+$/, ''),
  sessionSecret,
  sessionMaxAgeHours: int('SESSION_MAX_AGE_HOURS', 8),
  cookieSecure: cookieSecure(),
  trustProxy: trustProxy(),
  adminUsername: (process.env.ADMIN_USERNAME || 'admin').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  maxVideoMb: int('MAX_VIDEO_MB', 200),
  // Netlify funksiyasiga so'rov ~6 MB bilan cheklangan (base64 bilan) — rasm 4 MB gacha
  maxImageMb: runtime.isNetlify ? Math.min(int('MAX_IMAGE_MB', 4), 4) : int('MAX_IMAGE_MB', 8),
  telegram: {
    token: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID || '').trim(),
  },
  timezone: process.env.APP_TIMEZONE || 'Asia/Tashkent',
  dbFile: resolveDir(process.env.DB_FILE, 'data/proteach.db'),
  uploadsDir: resolveDir(process.env.UPLOADS_DIR, 'uploads'),
  langs: ['uz', 'ru', 'en'],
  defaultLang: 'uz',
};

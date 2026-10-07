/**
 * Barcha sozlamalar .env faylidan o'qiladi. Namuna: .env.example
 */
'use strict';

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const ROOT = path.join(__dirname, '..');
const env = process.env.NODE_ENV || 'development';
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
  if (isProd) {
    throw new Error('SESSION_SECRET .env faylida kamida 32 belgidan iborat bo\'lishi shart (production rejimi).');
  }
  // Dev rejimida vaqtinchalik kalit: server qayta ishga tushganda sessiyalar bekor bo'ladi
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] SESSION_SECRET berilmagan — vaqtinchalik kalit ishlatilmoqda (faqat dev uchun).');
}

function cookieSecure() {
  const v = (process.env.COOKIE_SECURE || 'auto').trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return 'auto';
}

function trustProxy() {
  const v = (process.env.TRUST_PROXY || 'loopback').trim();
  if (v === 'false' || v === '0') return false;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v; // masalan: loopback, "loopback, 10.0.0.1"
}

module.exports = {
  root: ROOT,
  env,
  isProd,
  host: process.env.HOST || '0.0.0.0',
  port: int('PORT', 3000),
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  sessionSecret,
  sessionMaxAgeHours: int('SESSION_MAX_AGE_HOURS', 8),
  cookieSecure: cookieSecure(),
  trustProxy: trustProxy(),
  adminUsername: (process.env.ADMIN_USERNAME || 'admin').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  maxVideoMb: int('MAX_VIDEO_MB', 200),
  maxImageMb: int('MAX_IMAGE_MB', 8),
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

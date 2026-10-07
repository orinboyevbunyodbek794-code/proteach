/**
 * Sana va narxlarni ko'rsatish.
 * Bazada vaqt UTC da saqlanadi ("YYYY-MM-DD HH:MM:SS"), ko'rsatishda Toshkent vaqtiga o'tkaziladi.
 */
'use strict';

const config = require('../config');

function parseDbDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parts(date) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = {};
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
  return p;
}

/** 07.10.2026 14:32 */
function formatDateTime(value) {
  const d = parseDbDate(value);
  if (!d) return '';
  const p = parts(d);
  return `${p.day}.${p.month}.${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** 07.10.2026 */
function formatDate(value) {
  const d = parseDbDate(value);
  if (!d) return '';
  const p = parts(d);
  return `${p.day}.${p.month}.${p.year}`;
}

/** Toshkent vaqti bo'yicha kun kaliti: 2026-10-07 */
function dayKey(value) {
  const d = parseDbDate(value);
  if (!d) return '';
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 1500000 -> "1 500 000" (bo'linmas bo'shliq bilan) */
function formatNumber(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

module.exports = { parseDbDate, formatDateTime, formatDate, dayKey, formatNumber };

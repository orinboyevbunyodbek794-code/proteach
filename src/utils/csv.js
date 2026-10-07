/**
 * Excel uchun CSV: UTF-8 BOM (o'zbek/rus harflari buzilmaydi), ";" ajratgich
 * (O'zbekiston/Rossiya hududiy sozlamalaridagi Excel shuni kutadi).
 */
'use strict';

const BOM = '﻿';
const SEP = ';';

function cell(value, { raw = false } = {}) {
  let s = value == null ? '' : String(value);
  // CSV-inyeksiyadan himoya: formulaga o'xshash boshlanishlar zararsizlantiriladi
  if (!raw && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[";\n\r]/.test(s) || s !== s.trim()) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * @param {string[]} headers
 * @param {Array<Array<{value:any, raw?:boolean}|any>>} rows
 */
function toCsv(headers, rows) {
  const lines = [headers.map((h) => cell(h)).join(SEP)];
  for (const row of rows) {
    lines.push(
      row
        .map((c) => (c && typeof c === 'object' && 'value' in c ? cell(c.value, { raw: c.raw }) : cell(c)))
        .join(SEP)
    );
  }
  return BOM + lines.join('\r\n') + '\r\n';
}

module.exports = { toCsv };

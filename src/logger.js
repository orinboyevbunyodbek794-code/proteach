/** Oddiy logger: vaqt belgisi bilan konsolga yozadi (PM2 / systemd loglarga yig'adi). */
'use strict';

function stamp() {
  return new Date().toISOString();
}

function fmt(args) {
  return args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : a));
}

module.exports = {
  info: (...args) => console.log(`[${stamp()}] INFO `, ...fmt(args)),
  warn: (...args) => console.warn(`[${stamp()}] WARN `, ...fmt(args)),
  error: (...args) => console.error(`[${stamp()}] ERROR`, ...fmt(args)),
};

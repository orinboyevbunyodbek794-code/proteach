/**
 * sql.js (WebAssembly SQLite) ustidan better-sqlite3 ga mos kichik qatlam.
 * Servislar ikkala muhitda ham bir xil kod bilan ishlaydi: prepare().get/all/run, exec, pragma, transaction.
 *
 * Har bir yozuvchi buyruq (run/exec) adapter.log ga yoziladi — Netlify'da bir vaqtda ikki nusxa
 * bazani o'zgartirsa, yangi nusxa ustiga shu buyruqlar qayta bajariladi (src/db/netlify-db.js).
 */
'use strict';

function normalize(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return Number(value);
  return value;
}

/** better-sqlite3 uslubidagi parametrlar -> sql.js bind formati */
function bindParams(args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0]) && !(args[0] instanceof Uint8Array)) {
    const named = {};
    for (const [k, v] of Object.entries(args[0])) named[/^[@:$]/.test(k) ? k : '@' + k] = normalize(v);
    return named;
  }
  return args.map(normalize);
}

class Statement {
  constructor(adapter, sql) {
    this.adapter = adapter;
    this.sql = sql;
  }

  _each(args, onRow) {
    const stmt = this.adapter.raw.prepare(this.sql);
    try {
      const params = bindParams(args);
      if (Array.isArray(params) ? params.length : Object.keys(params).length) stmt.bind(params);
      while (stmt.step()) {
        if (onRow(stmt.getAsObject()) === false) break;
      }
    } finally {
      stmt.free();
    }
  }

  get(...args) {
    let row;
    this._each(args, (r) => {
      row = r;
      return false;
    });
    return row;
  }

  all(...args) {
    const rows = [];
    this._each(args, (r) => {
      rows.push(r);
    });
    return rows;
  }

  run(...args) {
    const params = bindParams(args);
    this.adapter.raw.run(this.sql, params);
    this.adapter._record({ type: 'run', sql: this.sql, params });
    const changes = this.adapter.raw.getRowsModified();
    const res = this.adapter.raw.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowid = res.length ? res[0].values[0][0] : 0;
    return { changes, lastInsertRowid };
  }
}

class SqlJsAdapter {
  /** @param {object} rawDb  sql.js Database */
  constructor(rawDb) {
    this.raw = rawDb;
    this.log = []; // shu so'rovdagi yozuvchi buyruqlar (qayta bajarish uchun)
    this.dirty = false; // saqlanmagan o'zgarish bormi
    this.recording = true; // false — tizim ishlari (migratsiya, seed) jurnalga yozilmaydi
    this.inTransaction = false;
    this.raw.exec('PRAGMA foreign_keys = ON');
  }

  _record(entry) {
    this.dirty = true;
    if (this.recording) this.log.push(entry);
  }

  /** Jurnalga yozmasdan bajarish (migratsiya, seed, birinchi admin) */
  system(fn) {
    const prev = this.recording;
    this.recording = false;
    try {
      return fn();
    } finally {
      this.recording = prev;
    }
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this.raw.exec(sql);
    this._record({ type: 'exec', sql });
    return this;
  }

  pragma(source, options = {}) {
    if (source.includes('=')) {
      this.raw.exec('PRAGMA ' + source);
      if (!/foreign_keys|journal_mode|synchronous|busy_timeout/i.test(source)) this._record({ type: 'exec', sql: 'PRAGMA ' + source });
      return [];
    }
    const res = this.raw.exec('PRAGMA ' + source);
    if (!res.length) return options.simple ? undefined : [];
    const { columns, values } = res[0];
    if (options.simple) return values[0][0];
    return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  }

  transaction(fn) {
    return (...args) => {
      if (this.inTransaction) return fn(...args);
      this.raw.exec('BEGIN');
      this.inTransaction = true;
      const logStart = this.log.length;
      try {
        const result = fn(...args);
        this.raw.exec('COMMIT');
        return result;
      } catch (err) {
        this.raw.exec('ROLLBACK');
        this.log.length = logStart; // bekor qilingan buyruqlar qayta bajarilmasin
        throw err;
      } finally {
        this.inTransaction = false;
      }
    };
  }

  /** Jurnaldagi buyruqni qayta bajarish */
  replay(entry) {
    if (entry.type === 'exec') this.raw.exec(entry.sql);
    else this.raw.run(entry.sql, entry.params);
    this._record(entry);
  }

  /** Bazani baytlarga aylantirish (sql.js export pragma'larni tiklaydi — qayta yoqamiz) */
  export() {
    const bytes = this.raw.export();
    this.raw.exec('PRAGMA foreign_keys = ON');
    return bytes;
  }

  close() {
    this.raw.close();
  }
}

module.exports = { SqlJsAdapter };

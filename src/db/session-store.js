/**
 * express-session uchun SQLite ombori (alohida paket shart emas).
 * Sessiyalar `sessions` jadvalida saqlanadi, muddati o'tganlari davriy tozalanadi.
 */
'use strict';

const session = require('express-session');
const { getDb } = require('./index');

class SqliteSessionStore extends session.Store {
  constructor({ ttlMs }) {
    super();
    this.ttlMs = ttlMs;
    const db = getDb();
    this.q = {
      get: db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?'),
      set: db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
                       ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      cleanup: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    };
    this.timer = setInterval(() => this.q.cleanup.run(Date.now()), 15 * 60 * 1000);
    this.timer.unref();
  }

  expiresOf(sess) {
    const exp = sess && sess.cookie && sess.cookie.expires;
    return exp ? new Date(exp).getTime() : Date.now() + this.ttlMs;
  }

  get(sid, cb) {
    try {
      const row = this.q.get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        this.q.destroy.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this.q.set.run(sid, JSON.stringify(sess), this.expiresOf(sess));
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.q.destroy.run(sid);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this.q.touch.run(this.expiresOf(sess), sid);
      if (cb) cb(null);
    } catch (err) {
      if (cb) cb(err);
    }
  }
}

/** Admin paroli almashtirilganda yoki admin o'chirilganda uning boshqa sessiyalarini yopadi. */
function destroyAdminSessions(adminId, exceptSid = '') {
  getDb()
    .prepare("DELETE FROM sessions WHERE json_extract(sess, '$.adminId') = ? AND sid != ?")
    .run(adminId, exceptSid);
}

module.exports = { SqliteSessionStore, destroyAdminSessions };

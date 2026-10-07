/**
 * Ketma-ket migratsiyalar. Yangi o'zgarish kerak bo'lsa — yangi versiya qo'shing,
 * eskilarini o'zgartirmang (PRAGMA user_version orqali kuzatiladi).
 */
'use strict';

module.exports = [
  {
    version: 1,
    name: "boshlang'ich tuzilma",
    sql: `
      CREATE TABLE admins (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT    NOT NULL,
        created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT
      );

      CREATE TABLE courses (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        slug           TEXT    NOT NULL UNIQUE,
        name_uz        TEXT    NOT NULL,
        name_ru        TEXT    NOT NULL DEFAULT '',
        name_en        TEXT    NOT NULL DEFAULT '',
        short_uz       TEXT    NOT NULL DEFAULT '',
        short_ru       TEXT    NOT NULL DEFAULT '',
        short_en       TEXT    NOT NULL DEFAULT '',
        description_uz TEXT    NOT NULL DEFAULT '',
        description_ru TEXT    NOT NULL DEFAULT '',
        description_en TEXT    NOT NULL DEFAULT '',
        learn_uz       TEXT    NOT NULL DEFAULT '[]',
        learn_ru       TEXT    NOT NULL DEFAULT '[]',
        learn_en       TEXT    NOT NULL DEFAULT '[]',
        price          INTEGER,
        price_period   TEXT    NOT NULL DEFAULT 'month',
        duration_uz    TEXT    NOT NULL DEFAULT '',
        duration_ru    TEXT    NOT NULL DEFAULT '',
        duration_en    TEXT    NOT NULL DEFAULT '',
        image          TEXT,
        icon           TEXT    NOT NULL DEFAULT 'code',
        is_active      INTEGER NOT NULL DEFAULT 1,
        sort_order     INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_courses_active ON courses (is_active, sort_order);

      CREATE TABLE applications (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        name                 TEXT    NOT NULL,
        phone                TEXT    NOT NULL,
        course_id            INTEGER REFERENCES courses (id) ON DELETE SET NULL,
        course_name_snapshot TEXT    NOT NULL DEFAULT '',
        category             TEXT    NOT NULL DEFAULT '',
        comment              TEXT    NOT NULL DEFAULT '',
        lang                 TEXT    NOT NULL DEFAULT 'uz',
        status               TEXT    NOT NULL DEFAULT 'new',
        admin_note           TEXT    NOT NULL DEFAULT '',
        is_duplicate         INTEGER NOT NULL DEFAULT 0,
        search_text          TEXT    NOT NULL DEFAULT '',
        created_at           TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           TEXT
      );
      CREATE INDEX idx_apps_created ON applications (created_at);
      CREATE INDEX idx_apps_status ON applications (status);
      CREATE INDEX idx_apps_phone ON applications (phone, created_at);
      CREATE INDEX idx_apps_course ON applications (course_id);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE sessions (
        sid     TEXT    PRIMARY KEY,
        sess    TEXT    NOT NULL,
        expires INTEGER NOT NULL
      );
      CREATE INDEX idx_sessions_expires ON sessions (expires);
    `,
  },
  {
    version: 2,
    name: 'cookie sessiyalar (Netlify bilan mos)',
    sql: `
      -- Sessiya endi imzolangan cookie'da; parol almashtirilganda versiya oshadi va eski sessiyalar bekor bo'ladi
      ALTER TABLE admins ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
      DROP TABLE IF EXISTS sessions;
    `,
  },
];

/*
 * Ustunlar izohi:
 *  courses.learn_*            — "Nimalarni o'rganasiz" ro'yxati, JSON massiv
 *  courses.price              — so'mda; NULL bo'lsa saytda "Narxi: bog'laning"
 *  courses.price_period       — month (oyiga) | course (butun kurs)
 *  courses.image              — uploads/courses/<image>-600.webp va -1200.webp
 *  courses.icon               — rasm yo'q bo'lsa kartochkadagi belgi
 *  applications.course_name_snapshot — kurs o'chirilsa ham nomi saqlanadi
 *  applications.category      — school | student | worker | other
 *  applications.status        — new | contacted | accepted | rejected
 *  applications.is_duplicate  — shu raqamdan yaqinda (24 soat) ariza kelgan
 *  applications.search_text   — qidiruv uchun: kichik harfli ism + raqam
 *  settings.value             — JSON qiymat
 */

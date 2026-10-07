/**
 * Sozlamalar: parolni o'zgartirish, adminlar ro'yxati, Telegram holati.
 */
'use strict';

const express = require('express');
const config = require('../../config');
const log = require('../../logger');
const admins = require('../../services/admins');
const telegram = require('../../services/telegram');
const { destroyAdminSessions } = require('../../db/session-store');
const v = require('../../utils/validate');

const router = express.Router();

function maskedChatId() {
  const id = config.telegram.chatId;
  if (!id) return '';
  return id.length > 4 ? '•••' + id.slice(-4) : id;
}

router.get('/', (req, res) => {
  res.render('admin/settings', {
    title: 'Sozlamalar',
    active: 'settings',
    adminList: admins.list(),
    telegramOn: telegram.isConfigured(),
    telegramHasToken: Boolean(config.telegram.token),
    telegramChat: maskedChatId(),
    minPassword: admins.MIN_PASSWORD,
    maxVideoMb: config.maxVideoMb,
    sessionHours: config.sessionMaxAgeHours,
  });
});

router.post('/password', async (req, res, next) => {
  try {
    const current = String(req.body.current_password || '');
    const next1 = String(req.body.new_password || '');
    const next2 = String(req.body.confirm_password || '');
    if (!(await admins.verifyPassword(req.admin.id, current))) {
      req.flash('error', "Joriy parol noto'g'ri.");
    } else if (!admins.validatePassword(next1)) {
      req.flash('error', `Yangi parol kamida ${admins.MIN_PASSWORD} belgidan iborat bo'lishi kerak.`);
    } else if (next1 !== next2) {
      req.flash('error', 'Yangi parol va tasdiqlash mos kelmadi.');
    } else if (next1 === current) {
      req.flash('error', 'Yangi parol joriy paroldan farq qilishi kerak.');
    } else {
      await admins.changePassword(req.admin.id, next1);
      destroyAdminSessions(req.admin.id, req.sessionID); // boshqa qurilmalardagi sessiyalar yopiladi
      log.info(`Parol o'zgartirildi: ${req.admin.username}`);
      req.flash('success', "Parol muvaffaqiyatli o'zgartirildi. Boshqa qurilmalardagi sessiyalar yopildi.");
    }
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
});

router.post('/admins', async (req, res, next) => {
  try {
    const username = v.line(req.body.username, 40);
    const password = String(req.body.password || '');
    if (!admins.validateUsername(username)) {
      req.flash('error', "Login 3–32 belgi: lotin harflari, raqamlar, nuqta, chiziqcha yoki pastki chiziq bo'lishi mumkin.");
    } else if (admins.exists(username)) {
      req.flash('error', `"${username}" logini band.`);
    } else if (!admins.validatePassword(password)) {
      req.flash('error', `Parol kamida ${admins.MIN_PASSWORD} belgidan iborat bo'lishi kerak.`);
    } else if (password !== String(req.body.confirm_password || '')) {
      req.flash('error', 'Parol va tasdiqlash mos kelmadi.');
    } else {
      await admins.create(username, password);
      log.info(`Yangi admin qo'shildi: ${username} — ${req.admin.username}`);
      req.flash('success', `"${username}" administrator sifatida qo'shildi.`);
    }
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
});

router.post('/admins/:id/delete', (req, res) => {
  const id = v.id(req.params.id);
  const target = id ? admins.findById(id) : null;
  if (!target) {
    req.flash('error', 'Administrator topilmadi.');
  } else if (target.id === req.admin.id) {
    req.flash('error', "O'zingizni o'chira olmaysiz.");
  } else if (admins.count() <= 1) {
    req.flash('error', "Oxirgi administratorni o'chirib bo'lmaydi.");
  } else {
    admins.remove(target.id);
    destroyAdminSessions(target.id);
    log.info(`Admin o'chirildi: ${target.username} — ${req.admin.username}`);
    req.flash('success', `"${target.username}" o'chirildi.`);
  }
  res.redirect('/admin/settings');
});

router.post('/telegram-test', async (req, res) => {
  if (!telegram.isConfigured()) {
    req.flash('error', ".env faylida TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID to'ldirilmagan.");
    return res.redirect('/admin/settings');
  }
  try {
    await telegram.sendTest();
    req.flash('success', 'Sinov xabari Telegramga yuborildi.');
  } catch (err) {
    log.warn('Telegram sinovi', err.message);
    req.flash('error', `Xabar yuborilmadi: ${err.message}`);
  }
  res.redirect('/admin/settings');
});

module.exports = router;

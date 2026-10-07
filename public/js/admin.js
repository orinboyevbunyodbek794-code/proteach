/**
 * Pro Teach — admin panel skripti (kutubxonasiz).
 * Hamma funksiya JS siz ham ishlaydi (oddiy formalar); skript faqat qulaylik qo'shadi.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var csrfMeta = doc.querySelector('meta[name="csrf-token"]');
  var CSRF = csrfMeta ? csrfMeta.content : '';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function post(url, data, isJson) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRF-Token': CSRF,
        'X-Requested-With': 'fetch',
        Accept: 'application/json',
        'Content-Type': isJson ? 'application/json' : 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: isJson ? JSON.stringify(data) : new URLSearchParams(data).toString(),
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, message: 'Server javobi noto\'g\'ri.' }; }).then(function (json) {
        if (!res.ok && json.ok !== false) json.ok = false;
        return json;
      });
    });
  }

  /* --- Toast xabarlar --- */
  var toasts = $('[data-toasts]');
  function toast(message, type) {
    if (!toasts || !message) return;
    var el = doc.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    var icon = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    var use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/img/icons.svg#i-' + (type === 'error' ? 'alert' : 'check-circle'));
    icon.appendChild(use);
    var text = doc.createElement('span');
    text.textContent = message;
    el.appendChild(icon);
    el.appendChild(text);
    toasts.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  }

  /* --- Sidebar (telefonda) --- */
  var toggleBtn = $('[data-sidebar-toggle]');
  function setSidebar(open) {
    root.classList.toggle('sidebar-open', open);
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (toggleBtn) toggleBtn.addEventListener('click', function () { setSidebar(!root.classList.contains('sidebar-open')); });
  $$('[data-sidebar-close]').forEach(function (el) { el.addEventListener('click', function () { setSidebar(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setSidebar(false); });

  /* --- Flash xabarlarni yopish --- */
  $$('[data-flash]').forEach(function (flash) {
    var close = $('[data-flash-close]', flash);
    if (close) close.addEventListener('click', function () { flash.remove(); });
    if (flash.classList.contains('flash--success')) setTimeout(function () { flash.remove(); }, 7000);
  });

  /* --- O'chirishdan oldin tasdiqlash --- */
  var dialog = $('[data-confirm-dialog]');
  $$('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (form.dataset.confirmed === '1') return;
      e.preventDefault();
      var message = form.getAttribute('data-confirm');
      if (!dialog || typeof dialog.showModal !== 'function') {
        if (window.confirm(message)) { form.dataset.confirmed = '1'; form.submit(); }
        return;
      }
      $('[data-confirm-text]', dialog).textContent = message;
      $('[data-confirm-ok]', dialog).textContent = form.dataset.confirmOk || 'O\'chirish';
      dialog.returnValue = '';
      dialog.showModal();
      dialog.addEventListener('close', function onClose() {
        dialog.removeEventListener('close', onClose);
        if (dialog.returnValue === 'ok') {
          form.dataset.confirmed = '1';
          form.submit();
        }
      });
    });
  });

  /* --- Til tablari (kurs formasi) --- */
  $$('[data-tabs]').forEach(function (tabs) {
    var container = tabs.closest('.card') || doc;
    var buttons = $$('[data-tab]', tabs);
    var panels = $$('[data-panel]', container);
    container.classList.add('tabs-ready');
    function select(lang, focus) {
      buttons.forEach(function (b) {
        var on = b.dataset.tab === lang;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.panel === lang); });
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.dataset.tab); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
        select(next.dataset.tab, true);
      });
    });
    var firstError = buttons.filter(function (b) { return b.classList.contains('has-error'); })[0];
    select((firstError || buttons[0]).dataset.tab);
  });

  /* --- Slug: nomdan avtomatik ko'rinish --- */
  var slugInput = $('[data-slug]');
  var slugSource = $('[data-slug-source]');
  function slugify(s) {
    var map = { 'ʻ': '', 'ʼ': '', '\'': '', '‘': '', '’': '', '`': '' };
    return s.toLowerCase().replace(/[ʻʼ'‘’`]/g, function (c) { return map[c]; })
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }
  if (slugInput && slugSource) {
    var updateSlugPh = function () { slugInput.placeholder = slugify(slugSource.value) || 'avtomatik'; };
    slugSource.addEventListener('input', updateSlugPh);
    updateSlugPh();
  }

  /* --- Rasm tanlanganda oldindan ko'rish --- */
  var imgInput = $('[data-image-input]');
  var imgPreview = $('[data-image-preview]');
  if (imgInput && imgPreview) {
    imgInput.addEventListener('change', function () {
      var file = imgInput.files && imgInput.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      var img = doc.createElement('img');
      img.alt = 'Tanlangan rasm';
      img.src = URL.createObjectURL(file);
      imgPreview.innerHTML = '';
      imgPreview.appendChild(img);
    });
  }

  /* --- Takrorlanuvchi qatorlar (telefonlar, afzalliklar) --- */
  function bindIconSelect(row) {
    var select = $('[data-icon-select]', row);
    var preview = $('[data-icon-preview] use', row);
    if (select && preview) {
      select.addEventListener('change', function () {
        var href = preview.getAttribute('href').replace(/#i-[\w-]+$/, '#i-' + select.value);
        preview.setAttribute('href', href);
      });
    }
  }
  $$('[data-repeat]').forEach(function (list) {
    var name = list.dataset.repeat;
    var max = parseInt(list.dataset.max || '10', 10);
    var tpl = $('[data-repeat-template="' + name + '"]');
    var addBtn = $('[data-repeat-add="' + name + '"]');
    function refresh() {
      if (addBtn) addBtn.disabled = list.children.length >= max;
    }
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var row = btn.closest('[data-repeat-row]');
      if (!row) return;
      if (btn.hasAttribute('data-row-remove')) {
        if (list.children.length > 1 || name !== 'phones') row.remove();
        else $('input', row).value = '';
      } else if (btn.hasAttribute('data-row-up') && row.previousElementSibling) {
        list.insertBefore(row, row.previousElementSibling);
        btn.focus();
      } else if (btn.hasAttribute('data-row-down') && row.nextElementSibling) {
        list.insertBefore(row.nextElementSibling, row);
        btn.focus();
      }
      refresh();
    });
    if (addBtn && tpl) {
      addBtn.addEventListener('click', function () {
        if (list.children.length >= max) return;
        var node = tpl.content.firstElementChild.cloneNode(true);
        list.appendChild(node);
        bindIconSelect(node);
        var input = $('input, textarea', node);
        if (input) input.focus();
        refresh();
      });
    }
    $$('[data-repeat-row]', list).forEach(bindIconSelect);
    refresh();
  });

  /* --- Kurs faol/nofaol (bitta bosish) --- */
  $$('[data-toggle-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button', form);
      btn.disabled = true;
      post(form.action, {}).then(function (res) {
        btn.disabled = false;
        if (!res.ok) return toast(res.message || 'Xatolik yuz berdi.', 'error');
        btn.classList.toggle('is-on', res.isActive);
        btn.setAttribute('aria-checked', res.isActive ? 'true' : 'false');
        $('[data-switch-label]', btn).textContent = res.isActive ? 'Faol' : 'Nofaol';
        var row = form.closest('.course-row');
        if (row) row.classList.toggle('is-inactive', !res.isActive);
        toast(res.message);
      }).catch(function () {
        btn.disabled = false;
        toast('Tarmoq xatosi. Qaytadan urinib ko\'ring.', 'error');
      });
    });
  });

  /* --- Kurslarni sudrab tartiblash --- */
  var sortable = $('[data-sortable]');
  if (sortable) {
    var dragging = null;
    function saveOrder() {
      var ids = $$('.course-row', sortable).map(function (r) { return Number(r.dataset.id); });
      $$('[data-order-num]', sortable).forEach(function (el, i) { el.textContent = i + 1; });
      $$('.course-row', sortable).forEach(function (row, i, all) {
        var up = $('input[name="dir"][value="up"]', row);
        var down = $('input[name="dir"][value="down"]', row);
        if (up) up.parentElement.querySelector('button').disabled = i === 0;
        if (down) down.parentElement.querySelector('button').disabled = i === all.length - 1;
      });
      post(sortable.dataset.reorderUrl, { ids: ids }, true).then(function (res) {
        toast(res.ok ? res.message : res.message || 'Tartib saqlanmadi.', res.ok ? '' : 'error');
      }).catch(function () { toast('Tartib saqlanmadi.', 'error'); });
    }
    sortable.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.course-row');
      if (!row) return;
      dragging = row;
      row.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.id);
    });
    sortable.addEventListener('dragover', function (e) {
      if (!dragging) return;
      e.preventDefault();
      var over = e.target.closest('.course-row');
      if (!over || over === dragging) return;
      var rect = over.getBoundingClientRect();
      var after = e.clientY > rect.top + rect.height / 2;
      sortable.insertBefore(dragging, after ? over.nextSibling : over);
    });
    sortable.addEventListener('drop', function (e) { e.preventDefault(); });
    sortable.addEventListener('dragend', function () {
      if (!dragging) return;
      dragging.classList.remove('is-dragging');
      dragging = null;
      saveOrder();
    });
  }

  /* --- Ariza holatini ro'yxatdan o'zgartirish --- */
  var badgeEls = $$('[data-new-badge]');
  var topBadge = $('[data-new-badge-wrap]');
  var topBadgeCount = $('[data-new-badge-count]');
  var baseTitle = doc.title.replace(/^\(\d+\)\s*/, '');
  function setBadge(n) {
    badgeEls.forEach(function (b) { b.textContent = n; b.hidden = !n; b.setAttribute('aria-label', n + ' ta yangi ariza'); });
    if (topBadge) { topBadge.hidden = !n; topBadgeCount.textContent = n; }
    doc.title = (n ? '(' + n + ') ' : '') + baseTitle;
  }
  $$('[data-status-select]').forEach(function (select) {
    select.addEventListener('change', function () {
      var form = select.form;
      var prev = select.className.match(/status--(\w+)/);
      select.disabled = true;
      post(form.action, { status: select.value }).then(function (res) {
        select.disabled = false;
        if (!res.ok) return toast(res.message || 'Xatolik yuz berdi.', 'error');
        if (prev) select.classList.remove(prev[0]);
        select.classList.add('status--' + res.status);
        var row = select.closest('tr');
        if (row) row.classList.toggle('row-new', res.status === 'new');
        setBadge(res.newCount);
        toast(res.message);
      }).catch(function () {
        select.disabled = false;
        toast('Tarmoq xatosi. Qaytadan urinib ko\'ring.', 'error');
      });
    });
  });

  /* --- Yangi arizalar belgisini har daqiqada yangilash --- */
  if (badgeEls.length) {
    var initial = Number(badgeEls[0].textContent) || 0;
    setBadge(initial);
    setInterval(function () {
      if (doc.hidden) return;
      fetch('/admin/api/badge', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.ok) return;
          if (data.newCount > initial) toast('Yangi ariza keldi!');
          initial = data.newCount;
          setBadge(data.newCount);
        })
        .catch(function () {});
    }, 60000);
  }

  /* --- Video yuklash (progress bilan) --- */
  var vForm = $('[data-video-upload]');
  if (vForm) {
    var vInput = $('[data-video-input]', vForm);
    var dropzone = $('[data-dropzone]', vForm);
    var nameEl = $('[data-file-name]', vForm);
    var progress = $('[data-progress]', vForm);
    var bar = $('[data-progress-bar]', vForm);
    var pText = $('[data-progress-text]', vForm);
    var pSize = $('[data-progress-size]', vForm);
    var errEl = $('[data-upload-error]', vForm);
    var btn = $('[data-upload-btn]', vForm);
    var cancelBtn = $('[data-upload-cancel]', vForm);
    var maxBytes = Number(vForm.dataset.maxMb) * 1024 * 1024;
    var xhr = null;

    var mb = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
    var showError = function (msg) { errEl.textContent = msg; errEl.hidden = !msg; };

    vInput.addEventListener('change', function () {
      var f = vInput.files[0];
      showError('');
      if (!f) return;
      nameEl.textContent = f.name + ' · ' + mb(f.size);
      if (f.size > maxBytes) showError('Fayl hajmi juda katta (' + mb(f.size) + '). Maksimal: ' + vForm.dataset.maxMb + ' MB.');
      else if (!/\.(mp4|m4v|webm)$/i.test(f.name)) showError('Faqat MP4 yoki WEBM formatdagi video yuklash mumkin.');
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dropzone.addEventListener(ev, function () { dropzone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropzone.addEventListener(ev, function () { dropzone.classList.remove('is-over'); });
    });

    vForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = vInput.files[0];
      if (!f) return showError('Avval video faylni tanlang.');
      if (f.size > maxBytes) return showError('Fayl hajmi juda katta. Maksimal: ' + vForm.dataset.maxMb + ' MB.');
      if (!/\.(mp4|m4v|webm)$/i.test(f.name)) return showError('Faqat MP4 yoki WEBM formatdagi video yuklash mumkin.');
      showError('');
      var data = new FormData();
      data.append('video', f);
      xhr = new XMLHttpRequest();
      xhr.open('POST', vForm.action);
      xhr.setRequestHeader('X-CSRF-Token', CSRF);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.addEventListener('progress', function (ev) {
        if (!ev.lengthComputable) return;
        var pct = Math.round((ev.loaded / ev.total) * 100);
        bar.style.width = pct + '%';
        pText.textContent = pct < 100 ? pct + '%' : 'Server tekshirmoqda…';
        pSize.textContent = mb(ev.loaded) + ' / ' + mb(ev.total);
      });
      xhr.addEventListener('load', function () {
        var res = {};
        try { res = JSON.parse(xhr.responseText); } catch (err) { res = { ok: false, message: 'Server javobi noto\'g\'ri (' + xhr.status + ').' }; }
        if (xhr.status === 413 && !res.message) res.message = 'Fayl hajmi server chegarasidan katta (nginx: client_max_body_size).';
        if (res.ok) {
          pText.textContent = 'Tayyor!';
          window.location.reload();
        } else {
          reset();
          showError(res.message || 'Yuklashda xatolik yuz berdi.');
        }
      });
      xhr.addEventListener('error', function () { reset(); showError('Tarmoq xatosi: yuklash uzildi.'); });
      xhr.addEventListener('abort', function () { reset(); showError('Yuklash bekor qilindi.'); });
      progress.hidden = false;
      btn.disabled = true;
      btn.classList.add('is-loading');
      cancelBtn.hidden = false;
      vInput.disabled = true;
      xhr.send(data);
    });
    cancelBtn.addEventListener('click', function () { if (xhr) xhr.abort(); });
    function reset() {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      cancelBtn.hidden = true;
      vInput.disabled = false;
      progress.hidden = true;
      bar.style.width = '0';
      xhr = null;
    }
    window.addEventListener('beforeunload', function (e) {
      if (xhr) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* --- Dashboard grafigi: tooltip --- */
  var chart = $('[data-chart]');
  if (chart) {
    var tip = $('[data-chart-tip]', chart);
    var show = function (g) {
      var mark = $('.chart-mark, .chart-zero', g);
      var box = (mark || g).getBoundingClientRect();
      var host = chart.getBoundingClientRect();
      tip.textContent = g.dataset.tip;
      tip.style.left = box.left - host.left + box.width / 2 + 'px';
      tip.style.top = Math.max(0, box.top - host.top - 8) + 'px';
      tip.hidden = false;
    };
    $$('.chart-bar', chart).forEach(function (g) {
      g.addEventListener('mouseenter', function () { show(g); });
      g.addEventListener('focus', function () { show(g); });
      g.addEventListener('mouseleave', function () { tip.hidden = true; });
      g.addEventListener('blur', function () { tip.hidden = true; });
    });
  }
})();

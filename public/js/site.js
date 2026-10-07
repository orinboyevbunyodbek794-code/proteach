/**
 * Pro Teach — ochiq sayt skripti (kutubxonasiz, ~5 KB).
 * Menyu, header holati, paydo bo'lish animatsiyasi, telefon maskasi,
 * kursni tanlash va arizani sahifa yangilanmasdan yuborish.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* --- Header: scroll paytida soya --- */
  var header = $('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Mobil menyu --- */
  var toggle = $('[data-nav-toggle]');
  var nav = $('[data-nav]');
  function setNav(open) {
    if (!toggle) return;
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) {
        setNav(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) setNav(false);
    });
  }

  /* --- Paydo bo'lish animatsiyasi: faqat hozir ko'rinmayotgan elementlar uchun --- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      var siblings = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [];
      var index = siblings.indexOf(el);
      if (index > 0) el.style.transitionDelay = (index % 4) * 80 + 'ms';
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* --- Tezkor qo'ng'iroq tugmasi: forma yoki footer ko'ringanda yashiriladi --- */
  var quickCall = $('[data-quick-call]');
  if (quickCall && 'IntersectionObserver' in window) {
    var hiders = $$('#apply, .site-footer');
    var visible = new Set();
    var qio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      quickCall.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0.15 });
    hiders.forEach(function (el) { qio.observe(el); });

    var menu = $('details', quickCall);
    if (menu) {
      doc.addEventListener('click', function (e) {
        if (menu.open && !menu.contains(e.target)) menu.open = false;
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') menu.open = false;
      });
    }
  }

  /* --- Telefon maskasi: +998 90 123 45 67 --- */
  function formatPhone(value) {
    var d = String(value).replace(/\D/g, '');
    if (d.indexOf('998') !== 0) d = '998' + d.replace(/^0+/, '');
    d = d.slice(0, 12);
    var out = '+' + d.slice(0, 3);
    if (d.length > 3) out += ' ' + d.slice(3, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 8);
    if (d.length > 8) out += ' ' + d.slice(8, 10);
    if (d.length > 10) out += ' ' + d.slice(10, 12);
    return out;
  }
  $$('[data-phone-mask]').forEach(function (input) {
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+998 ';
    });
    input.addEventListener('blur', function () {
      if (input.value.replace(/\D/g, '') === '998') input.value = '';
    });
    input.addEventListener('input', function (e) {
      // O'chirish paytida bo'shliqqa "yopishib" qolmaslik uchun formatlamaymiz
      if (e.inputType && e.inputType.indexOf('delete') === 0) return;
      input.value = formatPhone(input.value);
    });
    input.addEventListener('paste', function () {
      setTimeout(function () { input.value = formatPhone(input.value); }, 0);
    });
  });

  /* --- Ariza formasi --- */
  var form = $('[data-apply-form]');
  if (!form) return;

  var success = $('[data-apply-success]');
  var alertBox = $('[data-form-alert]', form);
  var alertText = $('[data-form-alert-text]', form);
  var submitBtn = $('[data-submit]', form);
  var submitLabel = $('[data-submit-label]', form);
  var courseSelect = $('[data-course-select]', form);
  var defaultLabel = submitLabel ? submitLabel.textContent : '';
  var msg = form.dataset;

  // "Yozilish" tugmalari: kursni tanlab, formaga o'tkazadi
  $$('[data-apply-course]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (!courseSelect) return;
      var id = btn.getAttribute('data-apply-course');
      if (!$('option[value="' + id + '"]', courseSelect)) return;
      e.preventDefault();
      if (success && !success.hidden) resetForm();
      courseSelect.value = id;
      clearFieldError('course');
      var target = doc.getElementById('apply');
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
    });
  });

  function fieldEls(name) {
    var wrap = $('[data-field="' + name + '"]', form);
    return wrap ? { input: $('input, select, textarea', wrap), error: $('.field-error', wrap) } : null;
  }
  function setFieldError(name, text) {
    var f = fieldEls(name);
    if (!f || !f.error) return;
    f.error.textContent = text;
    f.error.hidden = false;
    f.input.setAttribute('aria-invalid', 'true');
  }
  function clearFieldError(name) {
    var f = fieldEls(name);
    if (!f || !f.error) return;
    f.error.hidden = true;
    f.error.textContent = '';
    f.input.removeAttribute('aria-invalid');
  }
  function showAlert(text) {
    alertText.textContent = text;
    alertBox.hidden = false;
  }
  function hideAlert() { alertBox.hidden = true; }

  ['name', 'phone', 'course', 'comment'].forEach(function (name) {
    var f = fieldEls(name);
    if (f && f.input) {
      f.input.addEventListener('input', function () { clearFieldError(name); });
      f.input.addEventListener('change', function () { clearFieldError(name); });
    }
  });

  function validate() {
    var errors = {};
    var name = form.elements.namedItem('name').value.trim();
    var phone = form.elements.namedItem('phone').value.replace(/\D/g, '');
    if (name.length < 2 || name.length > 80) errors.name = msg.errName;
    if (!/^998[1-9]\d{8}$/.test(phone)) errors.phone = msg.errPhone;
    if (!form.elements.namedItem('course').value) errors.course = msg.errCourse;
    return errors;
  }

  function showErrors(errors) {
    var first = null;
    Object.keys(errors).forEach(function (key) {
      setFieldError(key, errors[key]);
      if (!first) first = key;
    });
    if (first) {
      var f = fieldEls(first);
      if (f && f.input) f.input.focus();
    }
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
    if (submitLabel) submitLabel.textContent = on ? msg.msgSending : defaultLabel;
  }

  function showSuccess(data) {
    form.hidden = true;
    if (data && data.message) $('[data-success-text]', success).textContent = data.message;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }

  function resetForm() {
    form.reset();
    ['name', 'phone', 'course', 'comment'].forEach(clearFieldError);
    hideAlert();
    success.hidden = true;
    form.hidden = false;
  }

  var again = success && $('[data-apply-again]', success);
  if (again) {
    again.addEventListener('click', function (e) {
      e.preventDefault();
      resetForm();
      $('#f-name').focus();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAlert();
    ['name', 'phone', 'course', 'comment'].forEach(clearFieldError);
    var errors = validate();
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }
    setLoading(true);
    fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Requested-With': 'fetch',
        Accept: 'application/json',
      },
      body: new URLSearchParams(new FormData(form)).toString(),
      credentials: 'same-origin',
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false, message: msg.msgGeneric }; });
      })
      .then(function (data) {
        setLoading(false);
        if (data && data.ok) return showSuccess(data);
        if (data && data.errors) showErrors(data.errors);
        showAlert((data && data.message) || msg.msgGeneric);
      })
      .catch(function () {
        setLoading(false);
        showAlert(msg.msgNetwork);
      });
  });
})();

/* Shared behaviour: theme toggle, mobile navigation, saved checklists. */
(function () {
  'use strict';
  var root = document.documentElement;
  var THEME_KEY = 'soilStudy.theme';

  function effectiveTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var themeBtn = document.querySelector('[data-theme-toggle]');
  function syncThemeButton() {
    if (!themeBtn) return;
    var mode = effectiveTheme();
    themeBtn.setAttribute('data-mode', mode);
    themeBtn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.setAttribute('title', mode === 'dark' ? 'Light theme' : 'Dark theme');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
      syncThemeButton();
      document.dispatchEvent(new CustomEvent('soil:themechange'));
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { syncThemeButton(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    syncThemeButton();
  }

  /* Mobile navigation */
  var navToggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }

  /* Saved checklists: <ul data-checklist="key"> with checkboxes, optional [data-checklist-count="key"] and progress bar */
  document.querySelectorAll('[data-checklist]').forEach(function (list) {
    var key = 'soilStudy.checklist.' + list.getAttribute('data-checklist');
    var boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { saved = {}; }
    boxes.forEach(function (b) { if (saved[b.id]) b.checked = true; });

    var countEl = document.querySelector('[data-checklist-count="' + list.getAttribute('data-checklist') + '"]');
    var bar = document.querySelector('[data-checklist-bar="' + list.getAttribute('data-checklist') + '"]');
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      if (countEl) countEl.textContent = done + ' of ' + boxes.length + ' checked';
      if (bar) bar.style.width = (boxes.length ? (done / boxes.length) * 100 : 0) + '%';
      var out = {};
      boxes.forEach(function (b) { if (b.checked) out[b.id] = true; });
      try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) { /* storage unavailable */ }
    }
    list.addEventListener('change', update);
    var reset = document.querySelector('[data-checklist-reset="' + list.getAttribute('data-checklist') + '"]');
    if (reset) reset.addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; }); update(); });
    update();
  });

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();

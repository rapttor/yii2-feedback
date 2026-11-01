/* rapttor/yii2-feedback widget. Vanilla JS, no dependencies. API: Feedback.open({type}), Feedback.show(), Feedback.hide(). */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var root = null, cfg = null, fab = null, overlay = null, lastFocus = null;
  var state = freshState();
  var errors = [], failed = [];

  function freshState() {
    return { view: 'choose', type: '', subtype: '', message: '', rating: 0, email: '', tech: true, consent: false, parts: { messages: true, forms: true, tables: true }, picked: null, error: '', sending: false, openedAt: 0, restored: false };
  }
  function keep(list, value) { list.push(value); if (list.length > 5) { list.shift(); } }
  function ours(node) { return !!(node && node.closest && node.closest('.rf-ui')); }
  function t(key, params) {
    var s = (cfg && cfg.strings && cfg.strings[key]) || key;
    if (params) { Object.keys(params).forEach(function (k) { s = s.split('{' + k + '}').join(String(params[k])); }); }
    return s;
  }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === 'class') { n.className = v; } else if (k === 'text') { n.textContent = v; } else if (k.slice(0, 2) === 'on') { n.addEventListener(k.slice(2), v); } else { n.setAttribute(k, v === true ? '' : v); }
    });
    (kids || []).forEach(function (c) { if (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } });
    return n;
  }

  /* ---------- masking (the server masks again) ---------- */
  var SENSITIVE = /pass|pwd|token|secret|card|cvv|cvc|iban|csrf|otp|\bpin\b|ssn|api[-_]?key|auth/i;
  function mask(s) {
    s = String(s);
    if (cfg && cfg.maskEmails) { s = s.replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi, '[email]'); }
    return s
      .replace(/\b\d(?:[ \-]?\d){12,18}\b/g, '[number]')
      .replace(/\b[A-Za-z0-9+\/_=\-]{40,}\b/g, '[token]');
  }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) : s; }

  /* ---------- buffers for technical details ---------- */
  function own(u) { return String(u || '').indexOf('/feedback/') !== -1; }
  function rec(m, u, s) { return { method: String(m || 'GET').toUpperCase(), url: String(u || '').split('?')[0].split('#')[0], status: s }; }
  window.addEventListener('error', function (e) { keep(errors, clip((e.message || 'error') + ' @ ' + String(e.filename || '').split('?')[0].split('/').pop() + ':' + (e.lineno || 0), 300)); });
  window.addEventListener('unhandledrejection', function (e) { keep(errors, clip('unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason), 300)); });
  try {
    if (window.fetch) {
      var origFetch = window.fetch;
      window.fetch = function (input, init) {
        var m = (init && init.method) || (input && input.method) || 'GET';
        var u = typeof input === 'string' ? input : (input && input.url) || '';
        return origFetch.apply(this, arguments).then(function (r) { if (r && r.status >= 400 && !own(u)) { keep(failed, rec(m, u, r.status)); } return r; },
          function (err) { if (!own(u)) { keep(failed, rec(m, u, 0)); } throw err; });
      };
    }
    var xo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) {
      var self = this;
      this.addEventListener('loadend', function () { if ((self.status >= 400 || self.status === 0) && !own(u)) { keep(failed, rec(m, u, self.status)); } });
      return xo.apply(this, arguments);
    };
  } catch (e) { /* never break the page */ }

  /* ---------- preference cookie: h=1 (closed), x,y = button position as fractions ---------- */
  function getPref() {
    var out = {};
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + cfgCookie() + '=([^;]*)'));
      if (m) { decodeURIComponent(m[1]).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) { out[kv[0]] = kv[1]; } }); }
    } catch (e) { /* ignore */ }
    return out;
  }
  function setPref(p) {
    var v = Object.keys(p).filter(function (k) { return p[k] !== '' && p[k] !== undefined && p[k] !== null; }).map(function (k) { return k + '=' + p[k]; }).join('&');
    document.cookie = cfgCookie() + '=' + encodeURIComponent(v) + '; path=/; max-age=31536000' + (location.protocol === 'https:' ? '; SameSite=Lax; Secure' : '');
  }
  function cfgCookie() { return (root && root.dataset.cookie) || 'rapttor_fb'; }

  /* ---------- floating button ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>';
  function place() {
    if (!fab) { return; }
    var p = getPref(), w = fab.offsetWidth, h = fab.offsetHeight;
    if (p.x === undefined || p.y === undefined) { fab.style.left = ''; fab.style.top = ''; fab.style.right = '16px'; fab.style.bottom = '16px'; return; }
    fab.style.right = ''; fab.style.bottom = '';
    fab.style.left = Math.round(Math.max(0, Math.min(1, parseFloat(p.x))) * Math.max(0, innerWidth - w)) + 'px';
    fab.style.top = Math.round(Math.max(0, Math.min(1, parseFloat(p.y))) * Math.max(0, innerHeight - h)) + 'px';
  }
  function showFab() {
    var p = getPref(); delete p.h; setPref(p);
    drawFab();
  }
  function drawFab() {
    if (!root || fab) { return; }
    var x = el('button', { type: 'button', class: 'rf-fab-x', 'aria-label': root.dataset.close, title: root.dataset.close, text: '×' });
    var main = el('button', { type: 'button', class: 'rf-fab-main' });
    main.innerHTML = ICON;
    main.appendChild(el('span', { class: 'rf-fab-label', text: root.dataset.label }));
    fab = el('div', { class: 'rf-ui rf-fab' }, [main, x]);
    document.body.appendChild(fab);
    place();
    var drag = null, moved = false;
    main.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) { return; }
      var r = fab.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY };
      moved = false;
      main.setPointerCapture(e.pointerId);
    });
    main.addEventListener('pointermove', function (e) {
      if (!drag) { return; }
      if (!moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) { return; }
      moved = true;
      fab.classList.add('rf-dragging');
      fab.style.right = ''; fab.style.bottom = '';
      fab.style.left = Math.max(0, Math.min(innerWidth - fab.offsetWidth, e.clientX - drag.dx)) + 'px';
      fab.style.top = Math.max(0, Math.min(innerHeight - fab.offsetHeight, e.clientY - drag.dy)) + 'px';
    });
    function end() {
      if (!drag) { return; }
      drag = null;
      fab.classList.remove('rf-dragging');
      if (moved) {
        var r = fab.getBoundingClientRect(), p2 = getPref();
        var fx = (r.left + r.width / 2) < innerWidth / 2 ? 0 : 1;   // snap to the nearest side edge
        p2.x = fx; p2.y = (innerHeight - r.height) > 0 ? (r.top / (innerHeight - r.height)).toFixed(3) : 0;
        setPref(p2); place();
        window.setTimeout(function () { moved = false; }, 0);
      }
    }
    main.addEventListener('pointerup', end);
    main.addEventListener('pointercancel', end);
    main.addEventListener('click', function (e) { if (moved) { e.preventDefault(); return; } open(); });
    x.addEventListener('click', function () { hideFab(); });
  }
  function hideFab() {
    var p = getPref(); p.h = 1; setPref(p);
    if (fab) { fab.remove(); fab = null; }
  }
  window.addEventListener('resize', place);

  /* ---------- page snapshot ---------- */
  function visible(n) {
    if (n.checkVisibility) { return n.checkVisibility({ visibilityProperty: true }); }
    var r = n.getBoundingClientRect(); return !!(r.width || r.height);
  }
  function allowed(n) {
    if (n.closest('.rf-ui')) { return false; }
    var hide = n.closest('[data-feedback-hide]');
    if (hide && !n.hasAttribute('data-feedback-keep')) { return false; }
    if (cfg.captureMode === 'marked') { return !!n.closest('[data-feedback-capture],[data-feedback-keep]'); }
    return true;
  }
  function collectSnapshot() {
    var snap = { messages: [], forms: [], tables: [] }, seen = {};
    document.querySelectorAll('[role="alert"], .alert, .invalid-feedback, .help-block-error, .toast, .flash').forEach(function (n) {
      if (!allowed(n) || !visible(n)) { return; }
      var s = mask(clip(n.textContent, 300));
      if (s && !seen[s] && snap.messages.length < 20) { seen[s] = 1; snap.messages.push(s); }
    });
    Array.prototype.slice.call(document.forms, 0, 5).forEach(function (form) {
      if (!allowed(form) || !visible(form)) { return; }
      var fields = [];
      Array.prototype.forEach.call(form.elements, function (f) {
        var type = (f.type || 'text').toLowerCase();
        if (['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image', 'fieldset', 'object', 'output'].indexOf(type) !== -1 || !f.name && !f.id) { return; }
        if (!allowed(f) || !visible(f) || fields.length >= 60) { return; }
        var name = f.name || f.id, label = (f.labels && f.labels[0] ? f.labels[0].textContent : f.getAttribute('aria-label') || f.placeholder || '');
        var value;
        if (type === 'checkbox') { value = f.checked ? 'yes' : 'no'; }
        else if (type === 'radio') { if (!f.checked) { return; } value = f.value; }
        else if (f.tagName === 'SELECT') { value = Array.prototype.map.call(f.selectedOptions, function (o) { return o.text; }).join(', '); }
        else { value = f.value; }
        var group = f.closest('.mb-3, .form-group, .field') || f.parentElement, errEl = group && group.querySelector('.invalid-feedback, .help-block-error, .help-block');
        var bad = f.classList.contains('is-invalid') || (f.closest('.has-error') !== null);
        fields.push({ name: clip(name, 80), label: clip(label, 120), type: type, value: SENSITIVE.test(name) || SENSITIVE.test(label) ? '••••' : mask(clip(value, 500)), error: bad && errEl ? mask(clip(errEl.textContent, 200)) : '' });
      });
      if (fields.length) { snap.forms.push({ id: form.id || '', action: (form.getAttribute('action') || '').split('?')[0], fields: fields }); }
    });
    Array.prototype.slice.call(document.querySelectorAll('table'), 0, 12).forEach(function (tb) {
      if (snap.tables.length >= 5 || !allowed(tb) || !visible(tb)) { return; }
      var head = tb.querySelectorAll('thead th'), rowsEl = Array.prototype.slice.call(tb.querySelectorAll('tbody tr'));
      if (!rowsEl.length) { rowsEl = Array.prototype.slice.call(tb.querySelectorAll('tr')); if (!head.length && rowsEl.length) { head = rowsEl.shift().children; } }
      if (!rowsEl.length) { return; }
      var prev = tb.previousElementSibling;
      snap.tables.push({
        caption: clip(tb.caption ? tb.caption.textContent : (prev && /^H[1-4]$/.test(prev.tagName) ? prev.textContent : ''), 120),
        headers: Array.prototype.slice.call(head, 0, 15).map(function (h) { return mask(clip(h.textContent, 120)); }),
        rows: rowsEl.slice(0, 20).map(function (r) { return Array.prototype.slice.call(r.children, 0, 15).map(function (c) { return mask(clip(c.textContent, 200)); }); })
      });
    });
    return snap;
  }

  /* ---------- element picker ---------- */
  function selectorFor(n) {
    if (n.id) { return '#' + (window.CSS && CSS.escape ? CSS.escape(n.id) : n.id); }
    var parts = [];
    for (var i = 0; n && n.nodeType === 1 && n !== document.body && i < 4; i++, n = n.parentElement) {
      var s = n.tagName.toLowerCase(), cls = (n.className && typeof n.className === 'string' ? n.className.trim().split(/\s+/).slice(0, 2) : []).filter(function (c) { return c.indexOf('rf-') !== 0; });
      if (cls.length) { s += '.' + cls.join('.'); }
      var sib = n.parentElement && Array.prototype.filter.call(n.parentElement.children, function (c) { return c.tagName === n.tagName; });
      if (sib && sib.length > 1) { s += ':nth-of-type(' + (sib.indexOf(n) + 1) + ')'; }
      parts.unshift(s);
    }
    return parts.join(' > ');
  }
  function outlineOf(n) {
    var s = '<' + n.tagName.toLowerCase();
    if (n.id) { s += ' id="' + n.id + '"'; }
    if (n.className && typeof n.className === 'string') { s += ' class="' + clip(n.className, 80) + '"'; }
    if (n.getAttribute('role')) { s += ' role="' + n.getAttribute('role') + '"'; }
    return s + '>';
  }
  function pick() {
    overlay.style.display = 'none';
    if (fab) { fab.style.display = 'none'; }
    var box = el('div', { class: 'rf-ui rf-pickbox' }), tip = el('div', { class: 'rf-ui rf-picktip', text: t('pick.hint') });
    document.body.appendChild(box); document.body.appendChild(tip);
    document.documentElement.classList.add('rf-picking');
    var current = null;
    function done(chosen) {
      document.removeEventListener('mousemove', move, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true);
      document.documentElement.classList.remove('rf-picking');
      box.remove(); tip.remove();
      overlay.style.display = ''; if (fab) { fab.style.display = ''; }
      if (chosen) {
        var r = chosen.getBoundingClientRect();
        state.picked = { selector: selectorFor(chosen), outline: outlineOf(chosen), rect: [r.left, r.top, r.width, r.height].map(Math.round) };
      }
      render();
    }
    function move(e) {
      var n = document.elementFromPoint(e.clientX, e.clientY);
      if (!n || ours(n)) { return; }
      current = n;
      var r = n.getBoundingClientRect();
      box.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    }
    function click(e) { e.preventDefault(); e.stopPropagation(); done(current); }
    function key(e) { if (e.key === 'Escape') { e.preventDefault(); done(null); } }
    document.addEventListener('mousemove', move, true); document.addEventListener('click', click, true); document.addEventListener('keydown', key, true);
  }

  /* ---------- dialog ---------- */
  function typeDef(name) { return (cfg.types || []).filter(function (x) { return x.type === name; })[0]; }
  function draftSave() { try { localStorage.setItem('rapttor_fb_draft', JSON.stringify({ type: state.type, subtype: state.subtype, message: state.message, rating: state.rating, email: state.email })); } catch (e) { /* ignore */ } }
  function draftLoad() { try { return JSON.parse(localStorage.getItem('rapttor_fb_draft') || 'null'); } catch (e) { return null; } }
  function draftClear() { try { localStorage.removeItem('rapttor_fb_draft'); } catch (e) { /* ignore */ } }

  /* Proof of work for visitors: find a nonce so sha256(token:nonce) has `bits` leading zero bits; runs while the person types. */
  var powJob = null;
  function solvePow(token, bits) {
    if (!bits || !window.crypto || !crypto.subtle) { return Promise.resolve(''); }
    var enc = new TextEncoder();
    return new Promise(function (resolve) {
      var n = 0;
      function zeros(buf) { var b = new Uint8Array(buf), z = 0; for (var i = 0; i < b.length; i++) { if (b[i] === 0) { z += 8; continue; } z += Math.clz32(b[i]) - 24; break; } return z; }
      function batch() {
        var tries = [];
        for (var i = 0; i < 64; i++, n++) { tries.push(crypto.subtle.digest('SHA-256', enc.encode(token + ':' + n)).then((function (nonce) { return function (h) { return zeros(h) >= bits ? nonce : -1; }; })(n))); }
        Promise.all(tries).then(function (r) {
          var hit = r.filter(function (x) { return x >= 0; })[0];
          if (hit !== undefined) { resolve(String(hit)); } else { window.setTimeout(batch, 0); }
        });
      }
      batch();
    });
  }
  function loadConfig(lang) {
    return fetch(root.dataset.config + '?lang=' + encodeURIComponent(lang), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error('config ' + r.status); } return r.json(); })
      .then(function (c) { cfg = c; state.openedAt = Date.now(); powJob = solvePow(c.token, c.pow); });
  }

  function open(opts) {
    opts = opts || {};
    if (!root || overlay) { return; }
    lastFocus = document.activeElement;
    var lang = (cfg && cfg.lang) || root.dataset.lang;
    loadConfig(lang).then(function () {
      state = freshState();
      var d = draftLoad();
      if (opts.type && typeDef(opts.type)) { state.type = opts.type; state.view = 'form'; }
      else if (d && d.message && typeDef(d.type)) { state.type = d.type; state.subtype = d.subtype || ''; state.message = d.message; state.rating = d.rating || 0; state.email = d.email || ''; state.view = 'form'; state.restored = true; }
      overlay = el('div', { class: 'rf-ui rf-overlay', dir: cfg.dir });
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) { close(); } });
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey, true);
      render();
    }).catch(function () { /* silently not available */ });
  }
  function close() {
    if (!overlay) { return; }
    document.removeEventListener('keydown', onKey, true);
    overlay.remove(); overlay = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }
  function onKey(e) {
    if (!overlay || overlay.style.display === 'none') { return; }
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') { return; }
    var f = overlay.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
    f = Array.prototype.filter.call(f, function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!f.length) { return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function render() {
    if (!overlay) { return; }
    overlay.innerHTML = '';
    overlay.dir = cfg.dir;
    var head = [el('h2', { id: 'rf-title', class: 'rf-title', text: t('dialog.title') })];
    var bar = [];
    if (root.dataset.selector === '1') {
      var langs = JSON.parse(root.dataset.languages || '{}');
      var sel = el('select', { class: 'rf-lang', 'aria-label': t('dialog.language'), onchange: function (e) { sync(); loadConfig(e.target.value).then(render); } },
        Object.keys(langs).map(function (c) { return el('option', { value: c, text: langs[c], selected: c === cfg.lang }); }));
      bar.push(sel);
    }
    bar.push(el('button', { type: 'button', class: 'rf-iconbtn', 'aria-label': t('dialog.close'), text: '×', onclick: close }));
    var dlg = el('div', { class: 'rf-dialog' + (overlay.rfShown ? '' : ' rf-anim'), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rf-title' }, [
      el('div', { class: 'rf-head' }, [head[0], el('div', { class: 'rf-bar' }, bar)]),
      state.view === 'choose' ? viewChoose() : state.view === 'thanks' ? viewThanks() : viewForm()
    ]);
    overlay.appendChild(dlg);
    overlay.rfShown = true;
    var focusTarget = dlg.querySelector('textarea, .rf-tile, .rf-primary');
    if (focusTarget) { focusTarget.focus(); }
  }
  function sync() {
    var m = overlay && overlay.querySelector('.rf-message'), em = overlay && overlay.querySelector('.rf-email');
    if (m) { state.message = m.value; }
    if (em) { state.email = em.value; }
  }

  function viewChoose() {
    return el('div', { class: 'rf-body rf-tiles' }, cfg.types.map(function (ty) {
      return el('button', { type: 'button', class: 'rf-tile', onclick: function () { state.type = ty.type; state.view = 'form'; render(); } },
        [el('strong', { text: ty.label }), el('span', { text: ty.hint })]);
    }));
  }

  function viewThanks() {
    return el('div', { class: 'rf-body rf-thanks' }, [
      el('div', { class: 'rf-check', 'aria-hidden': 'true', text: '✓' }),
      el('h3', { text: t('thanks.title') }),
      el('p', { text: t('thanks.text') }),
      el('div', { class: 'rf-actions' }, [
        el('button', { type: 'button', class: 'rf-secondary', onclick: function () { state = freshState(); render(); }, text: t('thanks.again') }),
        el('button', { type: 'button', class: 'rf-primary', onclick: close, text: t('dialog.close') })
      ])
    ]);
  }

  function viewForm() {
    var ty = typeDef(state.type) || cfg.types[0], k = [];
    k.push(el('div', { class: 'rf-row' }, [
      el('button', { type: 'button', class: 'rf-link', onclick: function () { sync(); state.view = 'choose'; render(); }, text: '‹ ' + t('dialog.back') }),
      el('strong', { class: 'rf-typename', text: ty.label })
    ]));
    if (state.restored) { k.push(el('p', { class: 'rf-note', text: t('draft.restored') })); }
    if (ty.subtypes.length) {
      k.push(el('div', { class: 'rf-chips', role: 'radiogroup' }, ty.subtypes.map(function (s) {
        return el('button', { type: 'button', role: 'radio', 'aria-checked': state.subtype === s.value ? 'true' : 'false', class: 'rf-chip' + (state.subtype === s.value ? ' on' : ''),
          onclick: function (e) { state.subtype = state.subtype === s.value ? '' : s.value; draftSave(); sync(); render(); }, text: s.label });
      })));
    }
    var ta = el('textarea', { class: 'rf-message', rows: '3', maxlength: '4000', placeholder: t('field.message.placeholder'), 'aria-label': t('field.message') });
    ta.value = state.message;
    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 280) + 'px'; }
    ta.addEventListener('input', function () { state.message = ta.value; draftSave(); grow(); });
    k.push(el('label', { class: 'rf-label' }, [t('field.message'), ta]));
    window.setTimeout(grow, 0);
    if (ty.picker) {
      k.push(el('div', { class: 'rf-picker' }, state.picked
        ? [el('span', { class: 'rf-picked', text: t('pick.done', { what: state.picked.outline }) }), el('button', { type: 'button', class: 'rf-link', onclick: function () { sync(); state.picked = null; render(); }, text: t('pick.clear') })]
        : [el('button', { type: 'button', class: 'rf-secondary', onclick: function () { sync(); pick(); }, text: '◎ ' + t('pick.button') })]));
    }
    if (ty.rating) {
      var stars = el('div', { class: 'rf-stars', role: 'radiogroup', 'aria-label': t('field.rating') });
      for (var i = 1; i <= 5; i++) {
        (function (n) {
          stars.appendChild(el('button', { type: 'button', role: 'radio', 'aria-checked': state.rating === n ? 'true' : 'false', 'aria-label': t('field.rating.star', { n: n }), class: 'rf-star' + (n <= state.rating ? ' on' : ''),
            onclick: function () { state.rating = state.rating === n ? 0 : n; draftSave(); sync(); render(); }, text: '★' }));
        })(i);
      }
      k.push(el('div', { class: 'rf-label' }, [t('field.rating'), stars]));
    }
    if (!cfg.signedIn) {
      var em = el('input', { type: 'email', class: 'rf-email', autocomplete: 'email', maxlength: '190' });
      em.value = state.email;
      em.addEventListener('input', function () { state.email = em.value; draftSave(); });
      k.push(el('label', { class: 'rf-label' }, [ty.emailRequired ? t('field.email.required') : t('field.email'), em, el('small', { text: t('field.email.hint') })]));
    }
    if (ty.snapshot) { k.push(consentBlock()); }
    k.push(el('label', { class: 'rf-check-row' }, [
      el('input', { type: 'checkbox', checked: state.tech, onchange: function (e) { state.tech = e.target.checked; } }),
      el('span', {}, [el('strong', { text: t('tech.title') }), el('small', { text: t('tech.small') })])
    ]));
    k.push(el('input', { type: 'text', name: 'website', class: 'rf-hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }));
    if (state.error) { k.push(el('p', { class: 'rf-error', role: 'alert', text: state.error })); }
    k.push(el('div', { class: 'rf-actions' }, [
      el('button', { type: 'button', class: 'rf-primary', disabled: state.sending, onclick: submit, text: state.sending ? t('sending') : t('send') })
    ]));
    return el('div', { class: 'rf-body' }, k);
  }

  function consentBlock() {
    var box = el('div', { class: 'rf-consent' });
    var cb = el('input', { type: 'checkbox', checked: state.consent, onchange: function (e) { state.consent = e.target.checked; fill(); } });
    box.appendChild(el('label', { class: 'rf-check-row' }, [cb, el('span', {}, [el('strong', { text: t('consent.screen.title') }), el('small', { text: t('consent.screen.small') })])]));
    var detail = el('div', { class: 'rf-preview' });
    box.appendChild(detail);
    function fill() {
      detail.innerHTML = '';
      if (!state.consent) { return; }
      var snap = collectSnapshot(), any = snap.messages.length + snap.forms.length + snap.tables.length;
      if (!any) { detail.appendChild(el('p', { class: 'rf-note', text: t('consent.screen.empty') })); return; }
      var d = el('details', { open: true }, [el('summary', { text: t('consent.screen.preview') })]);
      [['messages', snap.messages.length, 'consent.part.messages'], ['forms', snap.forms.reduce(function (a, f) { return a + f.fields.length; }, 0), 'consent.part.forms'], ['tables', snap.tables.length, 'consent.part.tables']].forEach(function (p) {
        if (!p[1]) { return; }
        var part = el('div', { class: 'rf-part' }, [el('label', { class: 'rf-check-row small' }, [
          el('input', { type: 'checkbox', checked: state.parts[p[0]], onchange: function (e) { state.parts[p[0]] = e.target.checked; } }), el('span', { text: t(p[2], { n: p[1] }) })])]);
        var list = el('ul', { class: 'rf-list' });
        if (p[0] === 'messages') { snap.messages.slice(0, 4).forEach(function (m) { list.appendChild(el('li', { text: m })); }); }
        if (p[0] === 'forms') { snap.forms.forEach(function (f) { f.fields.slice(0, 6).forEach(function (x) { list.appendChild(el('li', { text: (x.label || x.name) + ': ' + x.value })); }); }); }
        if (p[0] === 'tables') { snap.tables.forEach(function (tb) { list.appendChild(el('li', { text: (tb.caption || '#') + ' – ' + tb.rows.length + ' × ' + tb.headers.length })); }); }
        part.appendChild(list); d.appendChild(part);
      });
      detail.appendChild(d);
      box._snap = snap;
    }
    box.collect = function () { return state.consent ? (box._snap || collectSnapshot()) : null; };
    consentBlock.current = box;
    fill();
    return box;
  }

  function submit() {
    sync();
    if (state.sending) { return; }
    var ty = typeDef(state.type);
    if (!ty) { state.error = t('error.type'); return render(); }
    if (clip(state.message, 4000).length < 3) { state.error = t('error.message'); return render(); }
    if (!cfg.signedIn && (ty.emailRequired || state.email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) { state.error = t('error.email'); return render(); }
    var snap = ty.snapshot && consentBlock.current ? consentBlock.current.collect() : null, parts = Object.keys(state.parts).filter(function (p) { return state.parts[p]; });
    var body = {
      type: state.type, subtype: state.subtype, message: state.message, rating: state.rating || null, email: state.email,
      lang: cfg.lang, route: root.dataset.route, url: location.pathname, token: cfg.token,
      website: (overlay.querySelector('.rf-hp') || {}).value || '', tech: state.tech,
      context: state.tech ? { ua: navigator.userAgent, viewport: [innerWidth, innerHeight], lang: document.documentElement.lang, theme: document.documentElement.getAttribute('data-bs-theme') || document.documentElement.getAttribute('data-theme') || '', release: root.dataset.release || '', errors: errors, failed: failed, picked: state.picked } : null,
      snapshot_consent: snap ? 1 : 0, snapshot_parts: snap ? parts : [], snapshot: snap
    };
    state.sending = true; state.error = ''; render();
    (powJob || Promise.resolve('')).then(function (nonce) { body.pow = nonce; send(body); });
  }
  function send(body) {
    var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    headers['X-CSRF-Token'] = root.dataset.csrf;
    fetch(root.dataset.submit, { method: 'POST', credentials: 'same-origin', headers: headers, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j }; }); })
      .then(function (res) {
        state.sending = false;
        if (res.status === 200 && res.json.ok) { draftClear(); var keepLang = cfg; state = freshState(); state.view = 'thanks'; cfg = keepLang; return render(); }
        var c = res.json && res.json.code;
        state.error = res.status === 429 ? t('error.limit') : c === 'message' ? t('error.message') : c === 'email' ? t('error.email') : c === 'type' ? t('error.type') : t('error.generic');
        if (c === 'token' || c === 'fast' || c === 'pow') { return loadConfig(cfg.lang).then(function () { state.error = t('error.generic'); render(); }); }
        render();
      })
      .catch(function () { state.sending = false; state.error = t('error.network'); render(); });
  }

  /* ---------- start ---------- */
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-feedback-open]');
    if (n) { e.preventDefault(); open({ type: n.getAttribute('data-feedback-open') || n.getAttribute('data-feedback-type') || undefined }); }
  });
  function start() {
    root = document.getElementById('rapttor-feedback');
    if (root && root.dataset.hidden !== '1') { drawFab(); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
  window.Feedback = { version: VERSION, open: open, show: showFab, hide: hideFab };
})();

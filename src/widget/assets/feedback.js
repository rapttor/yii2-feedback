/*!
 * rapttor feedback widget. Vanilla JS, no dependencies, works in any page or framework.
 *
 *   Feedback.init({ ... })      start (or restart) with options, see README "Without Yii"
 *   Feedback.open({type})       open the dialog; Feedback.close()
 *   Feedback.show() / hide()    the floating button (hide remembers the choice in a cookie)
 *   Feedback.on(name, fn)       open | close | sent | error; also DOM events "rapttor-feedback:<name>" on document
 *   Feedback.destroy()          remove everything (single page apps: call it when your component unmounts)
 *
 * With the Yii extension the page carries <div id="rapttor-feedback" data-...> and this file starts itself.
 */
(function () {
  'use strict';

  var VERSION = '0.2.0';

  /* Server side rendering / Node: nothing to do, but importing the file must not fail. */
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    var noop = function () {};
    if (typeof module === 'object' && module.exports) {
      module.exports = { version: VERSION, init: noop, open: noop, close: noop, show: noop, hide: noop, destroy: noop, on: noop, off: noop };
    }
    return;
  }
  if (window.Feedback && window.Feedback.version === VERSION && window.Feedback.init) { return; }   // loaded twice

  /* @generated:start (php tools/export-i18n.php) */
  var EN = {"fab.label":"Feedback","fab.close":"Hide the feedback button","fab.confirm":"Hide the feedback button?","fab.confirm.hint":"You can bring it back any time from the Feedback option in the menu.","fab.confirm.yes":"Hide","fab.confirm.no":"Keep","fab.toggle":"Show the feedback button on pages","dialog.title":"Send us your feedback","dialog.close":"Close","dialog.back":"Back","dialog.language":"Language","type.error":"Something is not working","type.error.hint":"A function fails or a page looks wrong","type.idea":"I have an idea","type.idea.hint":"Suggest a feature or an improvement","type.report":"Report content","type.report.hint":"Copyright, my work or picture is used, abuse","type.other":"Something else","type.other.hint":"Anything you want to tell us","sub.error.not_working":"A function does not work","sub.error.page_load":"A page does not load","sub.error.wrong_result":"The result is wrong","sub.error.slow":"It is slow","sub.error.display":"It looks wrong","sub.error.other":"Other","sub.report.infringement":"Infringement","sub.report.dmca":"DMCA / my work is used","sub.report.picture":"My picture is used in a template","sub.report.offensive":"Offensive content","sub.report.other":"Other","sub.idea.new_feature":"A new feature","sub.idea.improve":"Improve something that exists","sub.idea.other":"Other","field.message":"What happened, or what do you have in mind?","field.message.placeholder":"Write as much or as little as you like","field.rating":"How do you like it so far?","field.rating.star":"{n} of 5","field.email":"Your email (optional)","field.email.required":"Your email","field.email.hint":"So we can answer you. Used only for this feedback.","pick.button":"Point at the problem","pick.hint":"Click the part of the page you mean. Esc cancels.","pick.done":"Selected: {what}","pick.clear":"Remove selection","consent.screen.title":"Include what is on my screen","consent.screen.small":"Sends the messages shown on this page, what you typed in forms and the tables you see. Passwords and card data are never included. Used only to understand the problem.","consent.screen.preview":"Show what will be sent","consent.part.messages":"Messages ({n})","consent.part.forms":"Form values ({n})","consent.part.tables":"Tables ({n})","consent.screen.empty":"Nothing to send from this page.","tech.title":"Include technical details","tech.small":"Browser, screen size and recent errors. No page content.","send":"Send","sending":"Sending...","thanks.title":"Thank you!","thanks.text":"Your feedback has arrived. It helps us make this better.","thanks.again":"Send more","error.generic":"Could not send. Please try again.","error.limit":"You have sent a lot of feedback just now. Please try again later.","error.message":"Please write a few words.","error.email":"Please enter a valid email address.","error.type":"Please choose what this is about.","error.network":"No connection. Your text is kept.","draft.restored":"We kept your unfinished text.","reply.subject":"About your feedback","reply.intro":"Hello, thank you for your feedback:","reply.sign":"Kind regards"};
  var DEFAULT_TYPES = [{"type":"error","subtypes":["not_working","page_load","wrong_result","slow","display","other"],"rating":false,"picker":true,"snapshot":true,"emailRequired":false},{"type":"idea","subtypes":["new_feature","improve","other"],"rating":true,"picker":false,"snapshot":true,"emailRequired":false},{"type":"report","subtypes":["infringement","dmca","picture","offensive","other"],"rating":false,"picker":false,"snapshot":false,"emailRequired":true},{"type":"other","subtypes":[],"rating":true,"picker":false,"snapshot":true,"emailRequired":false}];
  var LANGS = {"en":"English","sh":"Balkan","de":"Deutsch","fr":"Français","es":"Español","es-MX":"Español (México)","pt-BR":"Português (Brasil)","it":"Italiano","pl":"Polski","nl":"Nederlands","tr":"Türkçe","sv":"Svenska","ro":"Română","id":"Bahasa Indonesia","vi":"Tiếng Việt","uk":"Українська","ru":"Русский","ar":"العربية","hi":"हिन्दी","ja":"日本語","ko":"한국어","zh-Hans":"简体中文"};
  /* @generated:end */

  var opts = null, cfg = null, fab = null, overlay = null, lastFocus = null, started = false;
  var state = freshState();
  var errors = [], failed = [];
  var handlers = {}, i18nCache = {};

  function freshState() {
    return { view: 'choose', type: '', subtype: '', message: '', rating: 0, email: '', tech: true, consent: false, parts: { messages: true, forms: true, tables: true }, picked: null, error: '', sending: false, openedAt: 0, restored: false };
  }
  function keep(list, value) { list.push(value); if (list.length > 5) { list.shift(); } }
  function ours(node) { return !!(node && node.closest && node.closest('.rf-ui')); }
  function t(key, params) {
    var s = (cfg && cfg.strings && cfg.strings[key]) || EN[key] || key;
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
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) { Object.keys(s).forEach(function (k) { if (s[k] !== undefined) { target[k] = s[k]; } }); } }
    return target;
  }

  /* ---------- events ---------- */
  function emit(name, detail) {
    (handlers[name] || []).slice().forEach(function (fn) { try { fn(detail); } catch (e) { /* a listener must not break the widget */ } });
    if (opts && opts.on && typeof opts.on[name] === 'function') { try { opts.on[name](detail); } catch (e) { /* ignore */ } }
    try { document.dispatchEvent(new CustomEvent('rapttor-feedback:' + name, { detail: detail })); } catch (e) { /* old browsers */ }
  }
  function on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return function () { off(name, fn); }; }
  function off(name, fn) { handlers[name] = (handlers[name] || []).filter(function (f) { return f !== fn; }); }

  /* ---------- masking (a server must mask again) ---------- */
  var SENSITIVE = /pass|pwd|token|secret|card|cvv|cvc|iban|csrf|otp|\bpin\b|ssn|api[-_]?key|auth/i;
  function mask(s) {
    s = String(s);
    if (cfg && cfg.maskEmails) { s = s.replace(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi, '[email]'); }
    return s
      .replace(/\b\d(?:[ \-]?\d){12,18}\b/g, '[number]')
      .replace(/\b[A-Za-z0-9+\/_=\-]{40,}\b/g, '[token]');
  }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) : s; }

  /* ---------- buffers for technical details (installed once per page) ---------- */
  function own(u) {
    u = String(u || '');
    return u.indexOf('/feedback/') !== -1 || !!(opts && opts.submitUrl && u.indexOf(opts.submitUrl) === 0);
  }
  function rec(m, u, s) { return { method: String(m || 'GET').toUpperCase(), url: String(u || '').split('?')[0].split('#')[0], status: s }; }
  if (!window.__rfHooks) {
    window.__rfHooks = true;
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
  }

  /* ---------- site colours: the widget looks like the page it is on ---------- */
  function rgbOf(value) {
    var m = String(value || '').match(/rgba?\(([^)]+)\)/);
    if (!m) { return null; }
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !isNaN(p[3]) ? p[3] : 1 };
  }
  function lum(c) {   // relative luminance, 0 (black) to 1 (white)
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function css(c) { return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'; }
  function colorOfValue(v) {   // any CSS colour (hex, name, hsl, var result) as rgb, by letting the browser compute it
    v = String(v || '').trim();
    if (!v) { return null; }
    var probe = document.createElement('span');
    probe.style.color = v;
    if (!probe.style.color) { return null; }
    probe.style.display = 'none';
    document.body.appendChild(probe);
    var c = rgbOf(getComputedStyle(probe).color);
    probe.remove();
    return c;
  }
  /** Reads background, text and brand colour from the page and offers them as --rf-site-* (explicit --rf-* variables of the site still win). */
  function adoptSiteColors() {
    if (!opts || opts.siteColors === false || !document.body) { return; }
    var root = document.documentElement, st = root.style, bg = null, fg = null, accent = null, i;
    var layers = [document.body, root];
    for (i = 0; i < layers.length && !bg; i++) { var c = rgbOf(getComputedStyle(layers[i]).backgroundColor); if (c && c.a > 0.6) { bg = c; } }
    fg = rgbOf(getComputedStyle(document.body).color);
    var vars = ['--bs-primary', '--primary', '--color-primary', '--brand', '--accent', '--theme-color'], cs = getComputedStyle(root);
    for (i = 0; i < vars.length && !accent; i++) { accent = colorOfValue(cs.getPropertyValue(vars[i])); }
    if (!accent) {   // the colour links have is usually the brand colour, unless it is a grey
      var link = document.querySelector('main a, a');
      var lc = link && rgbOf(getComputedStyle(link).color);
      if (lc && (Math.max(lc.r, lc.g, lc.b) - Math.min(lc.r, lc.g, lc.b)) > 40) { accent = lc; }
    }
    if (bg) { st.setProperty('--rf-site-bg', css(bg)); }
    if (fg) { st.setProperty('--rf-site-fg', css(fg)); }
    if (accent) {
      st.setProperty('--rf-site-accent', css(accent));
      st.setProperty('--rf-site-accent-fg', lum(accent) > 0.5 ? '#111' : '#fff');   // readable text on the accent
    }
  }

  /* ---------- preference cookie: h=1 (closed), x,y = button position as fractions ---------- */
  function getPref() {
    var out = {};
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + opts.cookie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
      if (m) { decodeURIComponent(m[1]).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) { out[kv[0]] = kv[1]; } }); }
    } catch (e) { /* ignore */ }
    return out;
  }
  function setPref(p) {
    var v = Object.keys(p).filter(function (k) { return p[k] !== '' && p[k] !== undefined && p[k] !== null; }).map(function (k) { return k + '=' + p[k]; }).join('&');
    document.cookie = opts.cookie + '=' + encodeURIComponent(v) + '; path=/; max-age=31536000' + (location.protocol === 'https:' ? '; SameSite=Lax; Secure' : '');
  }

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
    if (!opts) { return; }
    var p = getPref(); delete p.h; setPref(p);
    drawFab();
  }
  function refreshFab() {   // texts arrive after the first draw when they come from a language file
    if (!fab) { return; }
    var label = fab.querySelector('.rf-fab-label'), x = fab.querySelector('.rf-fab-x');
    if (label) { label.textContent = opts.label || t('fab.label'); }
    if (x) { var c = opts.closeLabel || t('fab.close'); x.setAttribute('aria-label', c); x.title = c; }
  }
  function drawFab() {
    if (!opts || fab || opts.button === false || opts.routeHidden) { return; }
    adoptSiteColors();
    var closeText = opts.closeLabel || t('fab.close');
    var x = el('button', { type: 'button', class: 'rf-fab-x', 'aria-label': closeText, title: closeText, text: '×' });
    var main = el('button', { type: 'button', class: 'rf-fab-main' });
    main.innerHTML = ICON;
    main.appendChild(el('span', { class: 'rf-fab-label', text: opts.label || t('fab.label') }));
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
    x.addEventListener('click', function () { askHide(); });
  }
  function hideFab() {
    if (!opts) { return; }
    closeConfirm();
    var p = getPref(); p.h = 1; setPref(p);
    if (fab) { fab.remove(); fab = null; }
  }

  /* The close "x" asks first: a small popover on the button, "Keep" is focused. (The switch in the dialog hides without asking.) */
  function closeConfirm() {
    document.removeEventListener('keydown', confirmKey, true);
    document.removeEventListener('mousedown', confirmOutside, true);
    var box = fab && fab.querySelector('.rf-confirm');
    if (box) { box.remove(); var m = fab.querySelector('.rf-fab-main'); if (m) { m.focus(); } }
  }
  function confirmKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeConfirm(); } }
  function confirmOutside(e) { if (fab && !fab.querySelector('.rf-confirm').contains(e.target) && !e.target.closest('.rf-fab-x')) { closeConfirm(); } }
  function askHide() {
    if (!fab) { return; }
    if (opts.confirmHide === false) { hideFab(); return; }
    if (fab.querySelector('.rf-confirm')) { closeConfirm(); return; }
    (cfg ? Promise.resolve() : loadConfig(opts.lang)).then(function () {
      if (!fab || fab.querySelector('.rf-confirm')) { return; }
      refreshFab();
      var no = el('button', { type: 'button', class: 'rf-secondary rf-small', text: t('fab.confirm.no'), onclick: closeConfirm });
      var yes = el('button', { type: 'button', class: 'rf-primary rf-small', text: t('fab.confirm.yes'), onclick: hideFab });
      var box = el('div', { class: 'rf-confirm', role: 'alertdialog', dir: cfg.dir, 'aria-labelledby': 'rf-confirm-t', 'aria-describedby': 'rf-confirm-d' }, [
        el('strong', { id: 'rf-confirm-t', text: t('fab.confirm') }), el('span', { id: 'rf-confirm-d', text: t('fab.confirm.hint') }),
        el('div', { class: 'rf-actions' }, [no, yes])
      ]);
      fab.classList.remove('rf-below', 'rf-start');
      fab.appendChild(box);
      // default: above the button, aligned to its right edge; measure where it really lands and flip when it would leave the screen
      var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, b = box.getBoundingClientRect();
      if (b.top < 8) { fab.classList.add('rf-below'); }
      if (b.left < 8 || b.right > vw - 8) { fab.classList.add('rf-start'); b = box.getBoundingClientRect(); if (b.right > vw - 8) { fab.classList.remove('rf-start'); } }
      if (box.getBoundingClientRect().bottom > vh - 8 && !fab.classList.contains('rf-below')) { /* no room below either: stay above */ }
      no.focus();
      document.addEventListener('keydown', confirmKey, true);
      document.addEventListener('mousedown', confirmOutside, true);
    }).catch(function () { hideFab(); });   // texts cannot be loaded: do what the person asked
  }

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
      if (!overlay) { return; }
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

  /* ---------- configuration: from the server (Yii) or built here ---------- */
  function resolveLang(l) {
    l = String(l || '').replace('_', '-');
    var codes = Object.keys(LANGS), i;
    for (i = 0; i < codes.length; i++) { if (codes[i].toLowerCase() === l.toLowerCase()) { return codes[i]; } }
    var base = l.split('-')[0].toLowerCase();
    if (['sh', 'sr', 'hr', 'bs', 'cnr'].indexOf(base) !== -1) { return 'sh'; }
    if (base === 'zh') { return 'zh-Hans'; }
    if (base === 'pt') { return 'pt-BR'; }
    return LANGS[base] ? base : 'en';
  }
  function loadStrings(code) {
    if (code === 'en' || !opts.i18nUrl) { return Promise.resolve(assign({}, EN, opts.strings)); }
    if (i18nCache[code]) { return Promise.resolve(assign({}, EN, i18nCache[code], opts.strings)); }
    return fetch(opts.i18nUrl.replace(/\/?$/, '/') + code + '.json', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error('i18n ' + r.status); } return r.json(); })
      .then(function (j) { i18nCache[code] = j; return assign({}, EN, j, opts.strings); })
      .catch(function () { return assign({}, EN, opts.strings); });
  }
  function buildTypes(strings) {
    var defs = opts.types || DEFAULT_TYPES;
    return defs.filter(function (d) { return !opts.only || opts.only.indexOf(d.type) !== -1; }).map(function (d) {
      var subs = (d.subtypes || []).map(function (s) { return typeof s === 'string' ? { value: s, label: strings['sub.' + d.type + '.' + s] || s } : s; });
      return { type: d.type, label: d.label || strings['type.' + d.type] || d.type, hint: d.hint || strings['type.' + d.type + '.hint'] || '', subtypes: subs,
        rating: !!d.rating, picker: !!d.picker, snapshot: !!d.snapshot, emailRequired: !!d.emailRequired };
    });
  }
  function localConfig(lang) {
    var code = resolveLang(lang);
    return loadStrings(code).then(function (strings) {
      return { lang: code, dir: code === 'ar' ? 'rtl' : 'ltr', strings: strings, types: buildTypes(strings), token: '', pow: 0, captureMode: opts.captureMode, maskEmails: !!opts.maskEmails, signedIn: !!opts.signedIn };
    });
  }
  function csrfToken() {
    if (typeof opts.csrf === 'function') { return opts.csrf(); }
    if (opts.csrf) { return opts.csrf; }
    var m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
  }

  /* Proof of work asked by the server for visitors: find a nonce so sha256(token:nonce) has `bits` leading zero bits; runs while the person types. */
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
    var job = opts.configUrl
      ? fetch(opts.configUrl + (opts.configUrl.indexOf('?') === -1 ? '?' : '&') + 'lang=' + encodeURIComponent(lang), { credentials: opts.credentials, headers: assign({ Accept: 'application/json' }, opts.headers) })
        .then(function (r) { if (!r.ok) { throw new Error('config ' + r.status); } return r.json(); })
      : localConfig(lang);
    return job.then(function (c) {
      c.strings = assign({}, EN, c.strings);
      cfg = c; state.openedAt = Date.now(); powJob = solvePow(c.token, c.pow);
    });
  }

  /* ---------- dialog ---------- */
  function typeDef(name) { return (cfg.types || []).filter(function (x) { return x.type === name; })[0]; }
  function draftSave() { try { localStorage.setItem(opts.draftKey, JSON.stringify({ type: state.type, subtype: state.subtype, message: state.message, rating: state.rating, email: state.email })); } catch (e) { /* ignore */ } }
  function draftLoad() { try { return JSON.parse(localStorage.getItem(opts.draftKey) || 'null'); } catch (e) { return null; } }
  function draftClear() { try { localStorage.removeItem(opts.draftKey); } catch (e) { /* ignore */ } }

  function open(o) {
    o = o || {};
    if (!opts || overlay) { return Promise.resolve(); }
    lastFocus = document.activeElement;
    adoptSiteColors();   // the site may have changed theme since the button was drawn
    var lang = (cfg && cfg.lang) || opts.lang;
    return loadConfig(lang).then(function () {
      state = freshState();
      if (opts.email) { state.email = opts.email; }
      var d = draftLoad();
      if (o.type && typeDef(o.type)) { state.type = o.type; state.view = 'form'; }
      else if (d && d.message && typeDef(d.type)) { state.type = d.type; state.subtype = d.subtype || ''; state.message = d.message; state.rating = d.rating || 0; state.email = d.email || state.email; state.view = 'form'; state.restored = true; }
      else if (cfg.types.length === 1) { state.type = cfg.types[0].type; state.view = 'form'; }
      overlay = el('div', { class: 'rf-ui rf-overlay', dir: cfg.dir });
      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) { close(); } });
      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKey, true);
      render();
      emit('open', { type: state.type || null });
    }).catch(function () { /* silently not available */ });
  }
  function close() {
    if (!overlay) { return; }
    document.removeEventListener('keydown', onKey, true);
    overlay.remove(); overlay = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
    emit('close', {});
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
    if (opts.selector && opts.languages) {
      var langs = opts.languages;
      var sel = el('select', { class: 'rf-lang', 'aria-label': t('dialog.language'), onchange: function (e) { sync(); loadConfig(e.target.value).then(render); } },
        Object.keys(langs).map(function (c) { return el('option', { value: c, text: langs[c], selected: c === cfg.lang }); }));
      bar.push(sel);
    }
    bar.push(el('button', { type: 'button', class: 'rf-iconbtn', 'aria-label': t('dialog.close'), text: '×', onclick: close }));
    var dlg = el('div', { class: 'rf-dialog' + (overlay.rfShown ? '' : ' rf-anim'), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rf-title' }, [
      el('div', { class: 'rf-head' }, [head[0], el('div', { class: 'rf-bar' }, bar)]),
      state.view === 'choose' ? viewChoose() : state.view === 'thanks' ? viewThanks() : viewForm()
    ]);
    if (opts.button !== false) { dlg.appendChild(footer()); }
    overlay.appendChild(dlg);
    overlay.rfShown = true;
    var focusTarget = dlg.querySelector('textarea, .rf-tile, .rf-primary');
    if (focusTarget) { focusTarget.focus(); }
  }
  /* "Show the feedback button on pages": the way back after closing it (the menu link opens this dialog). */
  function footer() {
    var cb = el('input', { type: 'checkbox', checked: !getPref().h && !opts.hidden });
    cb.addEventListener('change', function () { if (cb.checked) { showFab(); } else { hideFab(); } });
    return el('div', { class: 'rf-foot' }, [el('label', { class: 'rf-check-row small' }, [cb, el('span', { text: t('fab.toggle') })])]);
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
        el('button', { type: 'button', class: 'rf-secondary', onclick: function () { state = freshState(); if (opts.email) { state.email = opts.email; } render(); }, text: t('thanks.again') }),
        el('button', { type: 'button', class: 'rf-primary', onclick: close, text: t('dialog.close') })
      ])
    ]);
  }

  function viewForm() {
    var ty = typeDef(state.type) || cfg.types[0], k = [];
    k.push(el('div', { class: 'rf-row' }, [
      cfg.types.length > 1 ? el('button', { type: 'button', class: 'rf-link', onclick: function () { sync(); state.view = 'choose'; render(); }, text: '‹ ' + t('dialog.back') }) : el('span'),
      el('strong', { class: 'rf-typename', text: ty.label })
    ]));
    if (state.restored) { k.push(el('p', { class: 'rf-note', text: t('draft.restored') })); }
    if (ty.subtypes.length) {
      k.push(el('div', { class: 'rf-chips', role: 'radiogroup' }, ty.subtypes.map(function (s) {
        return el('button', { type: 'button', role: 'radio', 'aria-checked': state.subtype === s.value ? 'true' : 'false', class: 'rf-chip' + (state.subtype === s.value ? ' on' : ''),
          onclick: function () { state.subtype = state.subtype === s.value ? '' : s.value; draftSave(); sync(); render(); }, text: s.label });
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
    if (ty.snapshot && opts.snapshot !== false) { k.push(consentBlock()); }
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
    var snap = ty.snapshot && opts.snapshot !== false && consentBlock.current ? consentBlock.current.collect() : null, parts = Object.keys(state.parts).filter(function (p) { return state.parts[p]; });
    var body = {
      type: state.type, subtype: state.subtype, message: state.message, rating: state.rating || null, email: state.email,
      lang: cfg.lang, route: opts.route, url: location.pathname, token: cfg.token,
      website: (overlay.querySelector('.rf-hp') || {}).value || '', tech: state.tech,
      context: state.tech ? { ua: navigator.userAgent, viewport: [innerWidth, innerHeight], lang: document.documentElement.lang, theme: document.documentElement.getAttribute('data-bs-theme') || document.documentElement.getAttribute('data-theme') || '', release: opts.release || '', errors: errors, failed: failed, picked: state.picked } : null,
      snapshot_consent: snap ? 1 : 0, snapshot_parts: snap ? parts : [], snapshot: snap
    };
    if (opts.extra) { body.extra = typeof opts.extra === 'function' ? opts.extra() : opts.extra; }
    state.sending = true; state.error = ''; render();
    (powJob || Promise.resolve('')).then(function (nonce) { if (nonce) { body.pow = nonce; } send(body); });
  }
  function fail(err, code) {
    state.sending = false;
    state.error = code === 'limit' ? t('error.limit') : code === 'message' ? t('error.message') : code === 'email' ? t('error.email') : code === 'type' ? t('error.type') : code === 'network' ? t('error.network') : t('error.generic');
    emit('error', { code: code || 'generic', error: err || null });
    if (opts.configUrl && (code === 'token' || code === 'fast' || code === 'pow')) { return loadConfig(cfg.lang).then(function () { state.error = t('error.generic'); render(); }); }
    render();
  }
  function done(body) {
    state.sending = false;
    draftClear();
    var keepCfg = cfg; state = freshState(); state.view = 'thanks'; cfg = keepCfg;
    render();
    emit('sent', { type: body.type, subtype: body.subtype, rating: body.rating });
  }
  function send(body) {
    if (typeof opts.onSubmit === 'function') {
      Promise.resolve().then(function () { return opts.onSubmit(body); })
        .then(function (res) { if (res && res.ok === false) { fail(res, res.code); } else { done(body); } },
          function (err) { fail(err, err && err.code); });
      return;
    }
    if (!opts.submitUrl) { fail(null, 'generic'); return; }
    var headers = assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, opts.headers);
    var token = csrfToken();
    if (token) { headers[opts.csrfHeader] = token; }
    fetch(opts.submitUrl, { method: 'POST', credentials: opts.credentials, headers: headers, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, json: j }; }); })
      .then(function (res) {
        if (res.status >= 200 && res.status < 300 && res.json.ok !== false) { done(body); return; }
        fail(res.json, res.status === 429 ? 'limit' : (res.json && res.json.code) || 'generic');
      })
      .catch(function (err) { fail(err, 'network'); });
  }

  /* ---------- start / stop ---------- */
  function onDocClick(e) {
    var n = e.target.closest && e.target.closest('[data-feedback-open]');
    if (n) { e.preventDefault(); open({ type: n.getAttribute('data-feedback-open') || n.getAttribute('data-feedback-type') || undefined }); }
  }
  function onResize() { place(); }

  /** Options from the data attributes of <div id="rapttor-feedback"> (what the Yii widget renders; also usable by hand). */
  function rootOptions(r) {
    if (!r) { return {}; }
    var d = r.dataset, o = {};
    function flag(v) { return v === '1' || v === 'true'; }
    if (d.config) { o.configUrl = d.config; }
    if (d.submit) { o.submitUrl = d.submit; }
    if (d.i18nUrl) { o.i18nUrl = d.i18nUrl; }
    if (d.route) { o.route = d.route; }
    if (d.lang) { o.lang = d.lang; }
    if (d.languages) { try { o.languages = JSON.parse(d.languages); } catch (e) { /* ignore */ } }
    if (d.selector !== undefined) { o.selector = flag(d.selector); }
    if (d.hidden !== undefined) { o.hidden = flag(d.hidden); }
    if (d.routeHidden !== undefined) { o.routeHidden = flag(d.routeHidden); }
    if (d.confirmHide !== undefined) { o.confirmHide = flag(d.confirmHide); }
    if (d.siteColors !== undefined) { o.siteColors = flag(d.siteColors); }
    if (d.button !== undefined) { o.button = flag(d.button); }
    if (d.cookie) { o.cookie = d.cookie; }
    if (d.csrf) { o.csrf = d.csrf; }
    if (d.release) { o.release = d.release; }
    if (d.label) { o.label = d.label; }
    if (d.close) { o.closeLabel = d.close; }
    if (d.captureMode) { o.captureMode = d.captureMode; }
    if (d.maskEmails !== undefined) { o.maskEmails = flag(d.maskEmails); }
    if (d.signedIn !== undefined) { o.signedIn = flag(d.signedIn); }
    if (d.email) { o.email = d.email; }
    return o;
  }

  /**
   * Start or restart. Options (all optional):
   *   submitUrl, configUrl, i18nUrl, onSubmit(payload)  where the feedback goes and where texts come from
   *   lang, languages {code:name}, selector (show the language dropdown), strings {key:text}, types
   *   signedIn, email, route, release, extra, only ['error','idea'], snapshot (false = no screen data option)
   *   button (false = no floating button), hidden, routeHidden, confirmHide (false = no question when the button is closed), siteColors (false = do not read the page colours), cookie, label, closeLabel
   *   captureMode 'all'|'marked', maskEmails, csrf (string|fn), csrfHeader, credentials, headers, draftKey, on {open,close,sent,error}
   */
  function init(o) {
    destroy();
    var rootEl = document.getElementById('rapttor-feedback');
    opts = assign({
      submitUrl: null, configUrl: null, i18nUrl: null, onSubmit: null,
      lang: (document.documentElement.getAttribute('lang') || 'en'), languages: null, selector: false, strings: null, types: null, only: null,
      signedIn: false, email: '', route: location.pathname, release: '', extra: null, snapshot: true,
      button: true, hidden: false, routeHidden: false, confirmHide: true, siteColors: true, cookie: 'rapttor_fb', label: '', closeLabel: '',
      captureMode: 'all', maskEmails: false, csrf: null, csrfHeader: 'X-CSRF-Token', credentials: 'same-origin', headers: null, draftKey: 'rapttor_fb_draft', on: null
    }, rootOptions(rootEl), o);
    if (opts.selector && !opts.languages) { opts.languages = LANGS; }
    started = true;
    document.addEventListener('click', onDocClick);
    window.addEventListener('resize', onResize);
    if (!opts.hidden && !getPref().h) { drawFab(); }
    if (!opts.configUrl && !opts.strings && opts.i18nUrl && resolveLang(opts.lang) !== 'en') { loadConfig(opts.lang).then(refreshFab).catch(function () { /* English stays */ }); }
    return api;
  }
  function destroy() {
    if (overlay) { overlay.remove(); overlay = null; document.removeEventListener('keydown', onKey, true); }
    if (fab) { fab.remove(); fab = null; }
    if (started) { document.removeEventListener('click', onDocClick); window.removeEventListener('resize', onResize); started = false; }
    document.documentElement.classList.remove('rf-picking');
    cfg = null; opts = null; state = freshState();
  }

  var api = {
    version: VERSION, init: init, destroy: destroy, open: open, close: close, show: showFab, hide: hideFab, on: on, off: off,
    isOpen: function () { return !!overlay; }, languages: LANGS
  };
  window.Feedback = api;
  if (typeof module === 'object' && module.exports) { module.exports = api; }

  /* The Yii widget renders <div id="rapttor-feedback" data-...>: start by ourselves, unless the page prevents it. */
  function auto() { if (document.getElementById('rapttor-feedback') && window.FeedbackAutoInit !== false && !started) { init(); } }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', auto); } else { auto(); }
})();

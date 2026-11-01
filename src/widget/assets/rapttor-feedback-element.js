/*!
 * <rapttor-feedback> custom element: the feedback widget for any page or framework (Vue, React, Angular, Svelte, plain HTML).
 * Load feedback.css, feedback.js, then this file. The element draws nothing itself; it starts the widget while it is in the page
 * and removes it when it is removed.
 *
 *   <rapttor-feedback lang="de" selector submit-url="/api/feedback"></rapttor-feedback>
 *
 * Attributes: lang, submit-url, config-url, i18n-url, route, release, label, close-label, cookie, capture-mode, email, only="error,idea",
 *             selector, signed-in, mask-emails, no-button, hidden-button, no-snapshot, no-confirm, no-site-colors.
 * Properties (objects and functions cannot be attributes): onSubmit(payload) => Promise, strings, types, languages, csrf, headers, extra.
 * Methods: open(type), close(), show(), hide().  Events (from the element): open, close, sent, error (event.detail).
 */
(function () {
  'use strict';
  if (typeof customElements === 'undefined' || typeof window === 'undefined' || !window.Feedback || customElements.get('rapttor-feedback')) { return; }

  var ATTRS = ['lang', 'submit-url', 'config-url', 'i18n-url', 'route', 'release', 'label', 'close-label', 'cookie', 'capture-mode', 'email', 'only',
    'selector', 'signed-in', 'mask-emails', 'no-button', 'hidden-button', 'no-snapshot', 'no-confirm', 'no-site-colors'];
  var PROPS = ['onSubmit', 'strings', 'types', 'languages', 'csrf', 'headers', 'extra'];

  function bool(el, name) { return el.hasAttribute(name) && el.getAttribute(name) !== 'false'; }

  class RapttorFeedback extends HTMLElement {
    static get observedAttributes() { return ATTRS; }

    constructor() {
      super();
      this._off = [];
      this._queued = false;
      var self = this;
      PROPS.forEach(function (p) {   // properties set before the element was upgraded
        if (Object.prototype.hasOwnProperty.call(self, p)) { var v = self[p]; delete self[p]; self['_' + p] = v; }
      });
    }

    connectedCallback() { this.style.display = 'none'; this._start(); }
    disconnectedCallback() { this._stop(); }
    attributeChangedCallback() { if (this.isConnected) { this._start(); } }

    _options() {
      var o = {};
      var map = { 'submit-url': 'submitUrl', 'config-url': 'configUrl', 'i18n-url': 'i18nUrl', 'close-label': 'closeLabel', 'capture-mode': 'captureMode' };
      ['lang', 'submit-url', 'config-url', 'i18n-url', 'route', 'release', 'label', 'close-label', 'cookie', 'capture-mode', 'email'].forEach(function (a) {
        if (this.hasAttribute(a)) { o[map[a] || a] = this.getAttribute(a); }
      }, this);
      if (this.hasAttribute('only')) { o.only = this.getAttribute('only').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
      if (this.hasAttribute('selector')) { o.selector = bool(this, 'selector'); }
      if (this.hasAttribute('signed-in')) { o.signedIn = bool(this, 'signed-in'); }
      if (this.hasAttribute('mask-emails')) { o.maskEmails = bool(this, 'mask-emails'); }
      if (this.hasAttribute('no-button')) { o.button = false; }
      if (this.hasAttribute('hidden-button')) { o.hidden = true; }
      if (this.hasAttribute('no-snapshot')) { o.snapshot = false; }
      if (this.hasAttribute('no-confirm')) { o.confirmHide = false; }
      if (this.hasAttribute('no-site-colors')) { o.siteColors = false; }
      PROPS.forEach(function (p) { if (this['_' + p] !== undefined) { o[p] = this['_' + p]; } }, this);
      return o;
    }

    _start() {
      if (this._queued) { return; }
      this._queued = true;   // several attributes change together: restart once
      var self = this;
      Promise.resolve().then(function () {
        self._queued = false;
        if (!self.isConnected) { return; }
        self._unsubscribe();
        window.Feedback.init(self._options());
        ['open', 'close', 'sent', 'error'].forEach(function (name) {
          self._off.push(window.Feedback.on(name, function (detail) { self.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true })); }));
        });
      });
    }
    _unsubscribe() { this._off.forEach(function (f) { f(); }); this._off = []; }
    _stop() { this._unsubscribe(); window.Feedback.destroy(); }

    open(type) { return window.Feedback.open(type ? { type: type } : {}); }
    close() { window.Feedback.close(); }
    show() { window.Feedback.show(); }
    hide() { window.Feedback.hide(); }
  }

  PROPS.forEach(function (p) {
    Object.defineProperty(RapttorFeedback.prototype, p, {
      get: function () { return this['_' + p]; },
      set: function (v) { this['_' + p] = v; if (this.isConnected) { this._start(); } }
    });
  });

  customElements.define('rapttor-feedback', RapttorFeedback);
})();

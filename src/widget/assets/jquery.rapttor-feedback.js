/*!
 * jQuery plugin for the rapttor feedback widget. Load jQuery, feedback.css, feedback.js, then this file.
 *
 *   $.feedback({ lang: 'de', submitUrl: '/api/feedback' });   // start (same options as Feedback.init)
 *   $('#help').feedback();                                    // click opens the dialog
 *   $('#bug').feedback({ type: 'error' });                    // click opens it on that type
 *   $.feedback('open', { type: 'idea' });  $.feedback('close' | 'show' | 'hide' | 'destroy');
 *   $(document).on('rapttor-feedback:sent', function (e) { console.log(e.originalEvent.detail); });   // also open, close, error
 */
(function ($) {
  'use strict';
  if (!$ || typeof window === 'undefined' || !window.Feedback) { return; }

  $.feedback = function (arg, extra) {
    if (typeof arg === 'string') { return window.Feedback[arg] ? window.Feedback[arg](extra) : undefined; }
    return window.Feedback.init(arg || {});
  };

  $.fn.feedback = function (arg) {
    return this.each(function () {
      var $el = $(this);
      $el.off('click.rapttorFeedback').on('click.rapttorFeedback', function (e) {
        e.preventDefault();
        var o = $.isPlainObject(arg) ? arg : {};
        window.Feedback.open({ type: o.type || $el.data('feedback-type') || undefined });
      });
    });
  };
})(window.jQuery);

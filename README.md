# rapttor/yii2-feedback

Feedback for Yii2 apps, between a contact form and a helpdesk. A closable floating button (or any menu link) opens a dialog: something is not working / an idea / report content / other, with options, an auto-growing text box, stars and an optional email. The sender can add technical details (ticked by default) and, only with an explicit, never pre-ticked consent and a preview, what is on their screen (messages, form values, tables; passwords and card data never). Everything lands in one shared table and a small admin inbox. 22 languages, `sh` = Balkan. Visitors who are not signed in can send too.

## Install

```bash
composer require rapttor/yii2-feedback
```

Register the component in the web **and** console config. Only `class` and `app` are needed; everything else shows its default and can be left out:

```php
'components' => [
    'feedback' => [
        'class' => \rapttor\yii2feedback\Feedback::class,
        'app' => 'my-app',                        // which app sends; the tables are shared by all Rapttor apps on the database

        // who and where
        // 'guests' => true,                      // false = signed-in users only
        // 'excludeRoutes' => ['feedback/*'],     // no widget at all on these routes (patterns, * allowed); feedback/* is always out
        // 'hiddenRoutes' => [],                  // only the floating button is hidden there; links and Feedback.open() still work, e.g. ['shop/checkout*']
        // 'confirmHide' => true,                 // ask before the floating button is closed with its x (the switch in the dialog never asks)
        // 'siteColors' => true,                  // read background, text and brand colour from the page so the widget looks like the site

        // what can be sent
        // 'types' => [                           // type => options; labels are in the message files: type.<t>, sub.<t>.<s>
        //     'error'  => ['subtypes' => ['not_working', 'page_load', 'wrong_result', 'slow', 'display', 'other'], 'rating' => false, 'picker' => true,  'snapshot' => true,  'emailRequired' => false, 'priority' => 1],
        //     'idea'   => ['subtypes' => ['new_feature', 'improve', 'other'],                                      'rating' => true,  'picker' => false, 'snapshot' => true,  'emailRequired' => false, 'priority' => 0],
        //     'report' => ['subtypes' => ['infringement', 'dmca', 'picture', 'offensive', 'other'],                'rating' => false, 'picker' => false, 'snapshot' => false, 'emailRequired' => true,  'priority' => 3],
        //     'other'  => ['subtypes' => [],                                                                       'rating' => true,  'picker' => false, 'snapshot' => true,  'emailRequired' => false, 'priority' => 0],
        // ],
        // 'captureMode' => 'all',                // all = everything not masked; marked = only inside data-feedback-capture
        // 'maskEmails' => false,                 // true = emails inside screen data become [email] (recommended for public use)
        // 'release' => '',                       // tag added to the technical details, e.g. '2026.11.1'

        // spam and limits (off in development)
        // 'limitsEnabled' => null,               // null = on except YII_ENV_DEV; true / false to force
        // 'limits' => ['hour' => 10, 'day' => 30, 'anon_hour' => 3, 'anon_day' => 10],   // per profile / per hashed IP
        // 'minSeconds' => 3,                     // the dialog must be open this long before sending
        // 'proofOfWork' => 18,                   // bits of work asked from visitors (0 = off); needs a `cache` component

        // language
        // 'languageSelector' => 'auto',          // auto = dropdown only when the app has no language choice of its own | always | never
        // 'languageResolver' => fn () => 'de',   // default: the `legal` component's language, else Yii::$app->language

        // people and replies
        // 'profileResolver' => fn () => Yii::$app->user->id,        // signed-in id or null
        // 'audienceResolver' => fn ($id) => 'beta',                 // beta | customer
        // 'emailResolver' => fn ($id) => User::findOne($id)?->email, // default: the identity's `email`
        // 'replyFrom' => 'support@example.com',  // else params senderEmail / supportEmail / adminEmail

        // storage and retention
        // 'snapshotDays' => 30,                  // delete screen data after N days (0 = keep)
        // 'messageDays' => 0,                    // delete whole feedback after N days (0 = keep)
        // 'cookie' => 'fb-my-app',               // preference cookie: button closed + position; unique per app (default 'rapttor_fb')
        // 'secret' => null,                      // key for IP hashes and tokens; default: the request's cookieValidationKey
        // 'db' => 'db', 'table' => 'rapttor_feedback', 'noteTable' => 'rapttor_feedback_note', 'snapshotTable' => 'rapttor_feedback_snapshot',
    ],
],
```

- Run `php yii migrate` (the extension bootstrap adds the namespace `rapttor\yii2feedback\migrations`).
- Frontend layout, once: `<?= \rapttor\yii2feedback\widget\Widget::widget() ?>`
- Backend: `'modules' => ['feedback' => ['class' => \rapttor\yii2feedback\backend\Module::class, 'permission' => 'admin']]`, then open `/feedback` in the backoffice. Do not map a controller called `feedback` there (it would shadow the module).
- A consent gate or login redirect must let `feedback/*` through.
- Visitors need a `cache` component (proof of work: each token works once).
- Cron: `php yii feedback/purge` (retention).

## Configuration reference

The same options, explained. All keys are public properties of `Feedback`; the values shown are the defaults.

| Key | Default | Meaning |
|---|---|---|
| `app` | `'app'` | which app sends |
| `guests` | `true` | show to visitors who are not signed in (optional email, stricter limits) |
| `types` | error, idea, report, other | types and their options (`subtypes`, `rating`, `picker`, `snapshot`, `emailRequired`, `priority`); texts are `type.<t>`, `sub.<t>.<s>` in the message files |
| `excludeRoutes` | `['feedback/*']` | route patterns (`*` allowed) where the widget is **not offered at all** (no button, dialog or links); `feedback/*` is always out |
| `hiddenRoutes` | `[]` | route patterns where **only the floating button** is hidden; links and `Feedback.open()` still work |
| `confirmHide` | `true` | closing the floating button with its "x" asks first (a small popover, "Keep" focused); the switch inside the dialog hides without asking |
| `siteColors` | `true` | read background, text and brand colour from the page (see Colours) |
| `cookie` | `'rapttor_fb'` | preference cookie: button closed + position. **Set a name unique per app** (cookies ignore the port), e.g. `'fb-' . APP_SLUG`, and list it as a preference cookie in your legal texts |
| `captureMode` | `'all'` | `all`: everything not masked; `marked`: only inside `data-feedback-capture` |
| `maskEmails` | `false` | `true`: emails inside screen data become `[email]` (recommended for public use) |
| `languageSelector` | `'auto'` | `auto`: dropdown in the dialog only when the app has no language choice of its own; `always`; `never` |
| `languageResolver` | `null` | `fn(): ?string` app language; default: the `legal` component's current language, else `Yii::$app->language` |
| `limitsEnabled`, `limits`, `minSeconds` | `null` (off in dev), 10/h 30/day, anonymous 3/h 10/day, 3 | rate limits per profile and per hashed IP; seconds the dialog must be open before sending |
| `proofOfWork` | `18` | bits of work asked from visitors (about 0.2 s on a laptop); `0` = off; off in dev |
| `snapshotDays`, `messageDays` | `30`, `0` | retention of screen data and of messages (`0` = keep) |
| `release` | `''` | tag added to the technical details |
| `profileResolver`, `audienceResolver`, `emailResolver` | `null` | `fn()` signed-in id; `fn($id): string` beta/customer (default `beta`); `fn($id): ?string` email for replies (default: the identity's `email`) |
| `replyFrom` | `null` | sender of reply emails; else `params['senderEmail']`, `supportEmail`, `adminEmail` |
| `secret` | `null` | key for IP hashes and tokens; default: the request's cookie validation key |
| `table`, `noteTable`, `snapshotTable`, `db` | `rapttor_feedback`, `_note`, `_snapshot`, `db` | storage |

## Use

- **Main-menu entry (keep one in every app):** `<?= \rapttor\yii2feedback\widget\Widget::link(['class' => 'nav-link']) ?>` renders `<a href="#" data-feedback-open>Feedback</a>` in the visitor's language. It is the way back after the floating button was closed: the dialog has a switch **"Show the feedback button on pages"**. `data-feedback-open="idea"` jumps to a type. JS: `Feedback.open({type: 'error'})`.
- **The button:** it has a close "x" that asks "Hide the feedback button?" first (cookie `rapttor_fb`). Bring it back with `Feedback.show()` or PHP `\rapttor\yii2feedback\widget\Widget::showButton()` (for an app's "show feedback button" menu option). `Feedback.hide()` hides it.
- **Sensitive regions:** `data-feedback-hide` removes a region from the screen data; `data-feedback-keep` forces a field in; with `captureMode => 'marked'` only `data-feedback-capture` regions are read. Passwords, hidden and file fields are never read; fields named like `pass`, `token`, `secret`, `card`, `cvv`, `iban`, `csrf` and card-like numbers are always masked.
- **Accounts:** `Yii::$app->feedback->anonymiseProfile($id)` (keeps the feedback, removes the person and the screen data) or `deleteProfile($id)`; data export: `->export('profile', $id)`.
- **Events:** `Feedback::EVENT_CREATED`, `EVENT_STATUS`, `EVENT_REPORT` (a `report` was sent), with a `FeedbackEvent`.
- **Inbox reply:** goes through `Yii::$app->mailer` in the sender's language, so Postar is used when `MAIL_DSN` is `postar://...` (see `rapttor/yii2-postar`: use `reply_to` when sending from a `postar.vip` address). No reply text promises a reply time.

## Without Yii: HTML, jQuery, Vue, React, web component

The widget is plain DOM, so it also runs in pages and apps that have no PHP or no Yii. Load the stylesheet and the script (from `src/widget/assets/`), then start it:

```html
<link rel="stylesheet" href="feedback.css">
<script src="feedback.js"></script>
<script>
  Feedback.init({
    lang: 'en',
    selector: true,                       // language dropdown in the dialog
    i18nUrl: '/path/to/i18n',             // the 22 language files (i18n/<lang>.json); without it the dialog is English
    submitUrl: '/api/feedback',           // POST JSON goes here; or handle it yourself:
    onSubmit: (payload) => fetch('/my/endpoint', { method: 'POST', body: JSON.stringify(payload) })   // return a Promise
  });
</script>
<a href="#" data-feedback-open>Feedback</a>
```

`Feedback.init(options)` restarts the widget with new options, `Feedback.destroy()` removes it (call it when a single page app component unmounts). Importing the file on a server (Node, SSR) is safe and does nothing.
The English texts, the default types and the 22 language files are generated from the PHP message files: `php tools/export-i18n.php` (a test fails when they are out of date).

| Option | Default | Meaning |
|---|---|---|
| `submitUrl` | | where the JSON payload is POSTed (needs a server that stores it; with the Yii extension that is `feedback/submit`) |
| `onSubmit(payload)` | | your own handler instead of `submitUrl`; return a Promise, reject (optionally with `{code}`) to show an error |
| `configUrl` | | the Yii extension's `feedback/config` (texts, types, token, proof of work come from the server); without it everything is built in the browser |
| `i18nUrl` | | folder with the `<lang>.json` files; `strings` overrides single texts |
| `lang`, `languages`, `selector` | page `lang`, all 22, `false` | dialog language; `selector: true` shows the language dropdown |
| `types`, `only` | the four defaults, all | custom types (same shape as in the PHP config) or `only: ['error', 'idea']` |
| `signedIn`, `email` | `false`, `''` | `signedIn: true` hides the email field; `email` prefills it |
| `route`, `release`, `extra` | page path, `''` | sent with the payload (`extra` may be an object or a function) |
| `snapshot` | `true` | `false` removes the "include what is on my screen" option |
| `captureMode`, `maskEmails` | `'all'`, `false` | as in the PHP config |
| `button`, `hidden`, `cookie`, `label`, `closeLabel` | `true`, `false`, `'rapttor_fb'` | the floating button (`button: false` = links and `Feedback.open()` only) |
| `csrf`, `csrfHeader`, `credentials`, `headers` | meta `csrf-token`, `X-CSRF-Token`, `'same-origin'` | for your own endpoint |
| `on` | | `{ open, close, sent, error }` callbacks; the same events fire on `document` as `rapttor-feedback:<name>` |

The payload your server receives is the one in `src/Feedback.php::submit()` (`type`, `subtype`, `message`, `rating`, `email`, `lang`, `route`, `url`, `tech`, `context`, `snapshot_consent`, `snapshot_parts`, `snapshot`). **Whatever stores it must treat it as untrusted** (see `Sanitizer`) and must only keep `snapshot` when `snapshot_consent` is `1`.

Examples (run them with `node examples/serve.mjs`, then open http://localhost:8099/examples/):

| Example | Files |
|---|---|
| Plain HTML, no server | `examples/plain.html` |
| Data attributes only | `examples/data-attributes.html` |
| Web component `<rapttor-feedback>` | `examples/web-component.html`, `src/widget/assets/rapttor-feedback-element.js` |
| jQuery `$.feedback()` / `$(el).feedback()` | `examples/jquery.html`, `src/widget/assets/jquery.rapttor-feedback.js` |
| Vue 3 | `examples/vue.html`; for a build setup `examples/vue/FeedbackWidget.vue`, `examples/vue/useFeedback.js` |
| React | `examples/react.html`; for a build setup `examples/react/FeedbackWidget.jsx` |
| Svelte, Angular, Next.js, Nuxt, Alpine | `examples/other-frameworks.md` (snippets, not run) |

The five pages were run in a browser (including language switching, `onSubmit`, events and cleanup on unmount; React in StrictMode). The `.vue` and `.jsx` files are not compiled here: they contain the same logic as the pages that were run.

## Colours

The widget looks like the page it is on. On open it reads the page's background, text colour and brand colour (a theme variable such as `--bs-primary`, `--primary`, `--color-primary`, `--accent`, else the colour of the links) and picks a readable text colour for buttons, so it follows light/dark themes and theme switches. Borders and muted text are mixed from those. To set colours yourself, define any of these on `:root` (they win over everything): `--rf-bg`, `--rf-fg`, `--rf-accent`, `--rf-accent-fg`, `--rf-muted`, `--rf-border`, `--rf-danger`, `--rf-radius`, `--rf-font`. `siteColors => false` (JS: `siteColors: false`, web component: `no-site-colors`) turns the reading off.

## Security and privacy in short

Screen data is stored only with explicit consent (time and wording version are kept), in its own table, read through one method, shown encoded and only to the module's `permission`, and deleted after `snapshotDays` and with the account. IPs are stored as a keyed hash. Everything the browser sends is sanitised and capped on the server; visitors also pass a honeypot, a minimum time, a proof of work and rate limits.

## Status

Beta. Built and tested (PHPUnit): component, sanitiser, languages, public endpoints, widget, inbox (list, detail, status, notes, reply). Not yet: inbox bulk actions and stats, the `feedback` clause in the `rapttor/legal` templates, human review of 20 machine translations, an accessibility pass. See `docs/TASKS.md`.

## Tests

```bash
composer install && vendor/bin/phpunit
```

Design: `docs/DESIGN.md`; tasks: `docs/TASKS.md`; agents: `AGENTS.md`, `llms.txt`.

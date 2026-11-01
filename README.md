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
        // 'cookie' => 'rapttor_fb',              // preference cookie: button closed + position
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
| `cookie` | `'rapttor_fb'` | preference cookie: button closed + position (list it as a preference cookie in your legal texts) |
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

- **Menu or footer link:** `<a href="#" data-feedback-open>Feedback</a>`; `data-feedback-open="idea"` jumps to a type. JS: `Feedback.open({type: 'error'})`.
- **The button:** it has a close "x" (cookie `rapttor_fb`). Bring it back with `Feedback.show()` or PHP `\rapttor\yii2feedback\widget\Widget::showButton()` (for an app's "show feedback button" menu option). `Feedback.hide()` hides it.
- **Sensitive regions:** `data-feedback-hide` removes a region from the screen data; `data-feedback-keep` forces a field in; with `captureMode => 'marked'` only `data-feedback-capture` regions are read. Passwords, hidden and file fields are never read; fields named like `pass`, `token`, `secret`, `card`, `cvv`, `iban`, `csrf` and card-like numbers are always masked.
- **Accounts:** `Yii::$app->feedback->anonymiseProfile($id)` (keeps the feedback, removes the person and the screen data) or `deleteProfile($id)`; data export: `->export('profile', $id)`.
- **Events:** `Feedback::EVENT_CREATED`, `EVENT_STATUS`, `EVENT_REPORT` (a `report` was sent), with a `FeedbackEvent`.
- **Inbox reply:** goes through `Yii::$app->mailer` in the sender's language, so Postar is used when `MAIL_DSN` is `postar://...` (see `rapttor/yii2-postar`: use `reply_to` when sending from a `postar.vip` address). No reply text promises a reply time.

## Security and privacy in short

Screen data is stored only with explicit consent (time and wording version are kept), in its own table, read through one method, shown encoded and only to the module's `permission`, and deleted after `snapshotDays` and with the account. IPs are stored as a keyed hash. Everything the browser sends is sanitised and capped on the server; visitors also pass a honeypot, a minimum time, a proof of work and rate limits.

## Status

Beta. Built and tested (PHPUnit): component, sanitiser, languages, public endpoints, widget, inbox (list, detail, status, notes, reply). Not yet: inbox bulk actions and stats, the `feedback` clause in the `rapttor/legal` templates, human review of 20 machine translations, an accessibility pass. See `docs/TASKS.md`.

## Tests

```bash
composer install && vendor/bin/phpunit
```

Design: `docs/DESIGN.md`; tasks: `docs/TASKS.md`; agents: `AGENTS.md`, `llms.txt`.

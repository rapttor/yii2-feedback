# rapttor/yii2-feedback: design

A feedback widget plus a small self-contained triage inbox, between a contact form and a helpdesk. Built like `yii2-metadata` and `yii2-legal`: one component (`Yii::$app->feedback`), one shared table, a `Bootstrap` class, migrations in a namespace, `llms.txt` + `AGENTS.md` for coding agents.

Audience for v1: **beta testers** sending suggestions, ideas and errors. The only user of the inbox is the owner (backoffice `admin`). Operators and delegation are **out of scope for now**; the data model leaves room so they can be added later without a migration.

## 1. Scope

In v1: widget (closable floating button, menu/method trigger), context + page-text capture, storage, light rate limiting, inbox module (list, detail, status, notes, one-way reply email), export and deletion per account, retention.
Later: screenshots, conversation threads, SLA/automation rules, legal handoff for `report`, Slack/Linear webhooks, embeddable script for external sites.

## 2. Package shape: a mini app inside

`rapttor\yii2feedback\` contains everything, so no app rebuilds the look and feel:

```
src/
  Feedback.php            component (config, submit, find, status, notes, export, anonymise, purge)
  Bootstrap.php           web: public routes; console: commands + migration namespace
  Schema.php, migrations/
  widget/                 Widget.php + assets/ (feedback.js, feedback.css, no CDN)
  controllers/            public: SubmitController (JSON), ConfigController
  backend/Module.php      the inbox: own controllers, views, layout, CSS
  console/FeedbackController.php   purge
  messages/<lang>.php   17 languages, the set of the shared registry
```

- The backend module has its **own layout and styles**; it only borrows the host's `user`, `db`, `mailer`. Option `layout` lets an app use its own layout instead.
- Mounted in a backend with three lines of config. Same origin as the app (one-domain rule), so no extra login.
- The table is shared and has an `app` column, so the module can be mounted in **one** backend and show feedback of all apps (filter by app), or in each backend.

## 3. Data model

Prefix `rapttor_` like `rapttor_metadata`, shared by every Rapttor app on the database.

**`rapttor_feedback`**

| Column | Notes |
|---|---|
| `id`, `uid` | `uid` random public id |
| `app` | source app id |
| `type` | `error` / `report` / `idea` / `other` |
| `subtype` | picked option, from config, translated |
| `message` | text, max 4000 |
| `rating` | 1-5, nullable |
| `profile_id` | nullable |
| `email` | only when anonymous or when the user gives another contact; never copied from the profile |
| `route`, `url` | `controller/action`; url without query string |
| `context` | JSON: user agent, viewport, language, theme, release, last JS errors, picked element (selector, rect, trimmed outline) |
| (snapshot) | forms, messages and tables live in their own table `rapttor_feedback_snapshot`, 1:1 (section 7) |
| `audience` | `beta` / `customer` / `anonymous` |
| `status` | `new`, `triaged`, `in_progress`, `waiting_user`, `resolved`, `closed`, `duplicate`, `wontfix` |
| `priority` | 0-3 |
| `assignee_id` | nullable, unused in v1 (kept so delegation later needs no migration) |
| `fingerprint` | hash of type + route + normalised message / error, groups duplicates |
| `ip_hash` | HMAC of the IP with a server key; no raw IP |
| `snapshot_consent_at`, `snapshot_consent_ver` | when the user ticked "include what's on my screen" and which wording version; the snapshot is stored only if set |
| `locale` | UI language of the sender (tells you which language to reply in) |
| `rev`, `created_at`, `updated_at`, `resolved_at` | `rev` checked on update |

**`rapttor_feedback_note`**: `feedback_id`, `author_id`, `kind` (`note` internal / `reply` emailed / `event` status change), `body`, `created_at`. Audit trail now, conversation thread later.

Not in `rapttor_metadata`: feedback must be queried and joined.

## 4. Reporter identity

- Signed in: `profile_id` from the user component; the email is read from the profile when replying.
- Anonymous: optional email field.
- Account deletion: `anonymiseProfile($id)` clears `profile_id`, `email`, `ip_hash` and deletes the snapshot; `deleteProfile($id)` removes rows. `export('profile', $id)` for access requests. Same contract as metadata.

## 5. Types (config-driven, translated)

| Type | Options | Notes |
|---|---|---|
| **error** | function does not work, page does not load, wrong result, slow, display problem, other | element picker; screen-data consent offered prominently (never pre-ticked) |
| **report** | infringement, DMCA / my work is used, my picture used in a template, offensive, other | email required, no stars, priority 3; raises `EVENT_REPORT` (no legal handoff in v1) |
| **idea** | new feature, improve existing (select the area), other | stars optional |
| **other** | none | stars optional |

No reply-time promise in any confirmation text (owner rule).

## 6. Widget (UX)

Vanilla JS + CSS, no jQuery, no CDN (CSP-safe), CSS variables so `yii2-themes` colours apply.

- **Floating button**: draggable (mouse + touch), edge snap, keyboard-focusable, reduced-motion aware, small close "x".
  - Closing sets cookie **`rapttor_fb`** (`SameSite=Lax`, path `/`, one year; holds hidden flag and button position). The server reads it and does not render the button, so there is no flash. It is a preference cookie: list it in `yii2-legal`'s cookie list.
  - **`Feedback.open({type})`** and `data-feedback-open` (menu item) always work, cookie or not.
  - **`Feedback.show()`** / PHP `Feedback::showButton()` clears the cookie and brings the button back: the hook for an app's "show feedback button" menu option.
  - Hotkey: option, **off by default** (the app may use keys itself).
- **Dialog**: four choice tiles; option chips; **auto-growing textarea**; element picker ("point at the problem"); stars where the type has them; email if anonymous; checkboxes with short titles and small print below:
  - **Consent checkbox** "Include what's on my screen" (messages, form values, tables): **unchecked by default, never pre-ticked**, ticking it expands a preview of exactly what is sent with a toggle per part; the small print says passwords and card data are never included and what it is used for,
  - "Include technical details" (browser, screen size, recent errors): **ticked by default** (no screen content), can be unticked.
- Draft kept in `localStorage` until sent or discarded. Bottom sheet on phones. Focus trap, `Esc`, labels, contrast. Warm, short thank-you.
- **Languages (17)**: the shared registry `rapttor.legal/i18n/languages.json`: en, sh (Balkan), de, fr, es, pt-BR, it, pl, nl, tr, uk, ru, ar, hi, ja, ko, zh-Hans. The app's language is resolved with the registry's aliases (`sh` lists sr, sr-Latn, sr-Cyrl, hr, bs, cnr and regional variants; `de-AT`, `fr-CA`, `es-MX` map to their base); anything else falls back to `en`. The package bundles a small copy of the codes + aliases (no hard dependency on `rapttor/legal`). Swedish (`sv`) is not in the registry; it is an optional addition (see TASKS.md *Later*). Balkan wording rules for `sh` (fajl, dodajem, sistem, no country markers, short checkbox titles).
  - Language = the app's selected language (`Yii::$app->language`, or the app's own switcher). A small language dropdown in the dialog appears only when the app has no selection of its own; config `languageSelector`: `auto` (default) / `always` / `never`. The choice affects the dialog only, not the app.
  - Covers widget texts, type/option labels, the confirmation and the reply email (sender's `locale`, English fallback). The user's message may be in any language. Arabic is right-to-left: CSS uses logical properties and the dialog sets `dir`.
  - A test fails if any language file lacks a key present in `en`. The inbox is English.

## 7. Page snapshot (forms, messages, tables)

The page's own static text is not captured; what helps is what the user typed and what the app showed back.

Captured, in order of usefulness:
1. **Messages**: `[role=alert]`, `.alert`, `.invalid-feedback`, `.has-error`, toasts.
2. **Forms**: per visible form, each field's name, label, type, current value and validation error.
3. **Tables / lists**: heading, column headers, first 20 rows x 15 columns, cells cut at 200 characters.
4. **Recent failed requests** (URL, method, status of the last few failed fetch/XHR) in `context`.
5. Page title and the picked element's trimmed outline (tag, id, classes, role; no attribute values).

Stored as JSON (`{messages, forms, tables}`) in **`rapttor_feedback_snapshot`** (`feedback_id`, `data`, `created_at`), never in the feedback row, so list/detail queries cannot load it by accident.

Masking and control:
- Never captured: password and hidden fields. Values masked (`••••`) when the field name matches `pass|token|secret|card|cvv|iban|csrf` and similar, and any value that looks like an email, card number or long token.
- Apps mark regions: `data-feedback-hide` removes, `data-feedback-keep` forces a field in.
- Config `captureMode`: `all` (everything not masked; beta) or `marked` (only `data-feedback-capture` elements; safer for customers later).
- **Explicit consent required**: the server rejects a snapshot without `snapshot_consent=1` and drops it; consent time and wording version are stored on the row (proof, same idea as `yii2-legal` consents).
- The user sees exactly what is sent (preview with a toggle per part) before sending.
- The server masks again, enforces size caps, and stores plain data; it is shown encoded, never as HTML.
- Retention `snapshotDays` (default 30), deleted separately from the feedback row and with the account.
- The widget is not offered on `/admin` routes by default (tables there can show other people's data).
- Screenshots stay in *Later*.

## 8. Rate limiting and spam (light)

Counters computed from `rapttor_feedback` itself; per profile and per `ip_hash`: default 10 per hour, 30 per day, anonymous stricter; off in `YII_ENV_DEV`; `429` + `Retry-After` + friendly copy. Honeypot, minimum 3 s between opening and sending (signed token), max length, same-fingerprint merge within a day, CSRF. Real client IP needs `request.trustedHosts` on the proxy.

## 9. Inbox module

- Access: role `admin` only (`allowedRoles`, default `['admin']`, checked on every action). No other roles in v1.
- List: filters (status, type, app, audience, rating, route, date), search, bulk status/close, counts per status.
- Detail: message, context, picked element, snapshot, reporter link, duplicates, timeline, status, priority, **reply by email** (Postar, one-way; recorded as a `reply` note), internal notes.
- Small stats page: volume per type/day, average rating, top routes, top JS errors.
- Every change writes an `event` note. Output always encoded.

## 10. Beta vs customers

`audience` comes from a config callable (default: profile has the `beta` flag/role). Lets us add beta-only options and a release tag in `context`, and filter in the inbox. Real customers later get the same widget with another `types` set and menu/footer trigger only.

## 11. Legal and privacy

- Add "feedback you send (message, optional page snapshot with form values and tables, technical details, email)" to the `yii2-legal` data categories; the screen-data checkbox is an explicit, unticked-by-default consent with stored proof; technical details are a separate checkbox with its own small print.
- Retention config, export/anonymise/delete per account, hashed IP only, cookie listed.

## 12. Integration contract (for `AGENTS.md` / `llms.txt`)

1. `composer require rapttor/yii2-feedback`; `feedback` component in web **and** console config; `rapttor\yii2feedback\migrations` in `migrationNamespaces`; `php yii migrate`.
2. Frontend layout: `<?= \rapttor\yii2feedback\widget\Widget::widget() ?>` once.
3. Backend: `'modules' => ['feedback' => ['class' => \rapttor\yii2feedback\backend\Module::class]]` (access: role `admin` only, via the module's `allowedRoles`, default `['admin']`).
4. Menu option: `data-feedback-open` on a link; "show feedback button" calls `Feedback.show()`.
5. Account deletion/export call `anonymiseProfile` / `export`; cron runs `feedback/purge`.
6. Agent rules: no raw SQL on the table; never render `message`, `context` or the snapshot unencoded, and read the snapshot only through the single snapshot reader.

## 13. Still open

1. **Decided:** the button shows for anonymous visitors too (`guests` defaults to true): optional email, stricter limits, hashed IP only.
2. Mount the inbox in **one** hub backend (all apps), or in each app's backend?
3. Reply email `From`: the Postar sender configured per app, or one shared feedback address?
4. `captureMode`: `all` with masking for beta (proposed); table limit 20 rows x 15 columns.

## 14. Later: operators / delegation

Roles `feedback-operator` with permissions `view`, `manage`, `assign`; snapshot visible to admin only (it already sits in its own table with one reader); operators see no reporter identity, reply by email through the system, admin can copy a safe excerpt into a comment; assignee UI, rules and digests. See TASKS.md *Later*.

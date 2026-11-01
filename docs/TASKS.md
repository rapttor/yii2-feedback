# Tasks

Design: [DESIGN.md](DESIGN.md). Model tag = the cheapest model that can do it well; switch up early rather than redo.

## Progress (2026-11-01)

Built and unit-tested (16 PHPUnit tests): schema + migration, `Feedback` component (submit, validation, rate limits, honeypot/min-time, dedupe, consent-gated snapshot, status with `rev`, reply email, export/anonymise/delete/purge), `Sanitizer`, `Languages` (22) and message files, public JSON controller, console `feedback/purge`, widget (button, drag, close cookie, dialog, picker, snapshot preview, errors/failed-request buffer), admin inbox module (list, filters, detail, status, notes, reply), README, AGENTS.md, llms.txt. Integrated in `demo` (config, compose mount, layout, backend menu, migration applied in Docker).
**Not yet verified in a browser:** the widget as a signed-in user (needs a signed-in demo user). Not done: hotkey (optional), a11y pass, functional tests of the inbox, legal texts category in `yii2-legal`, account-deletion hooks in the demo, Packagist.

## 0. Decisions

| Status | Task | Model |
|---|---|---|
| todo (owner) | Answer the 3 open points in DESIGN.md section 13 (anonymous visitors, hub vs per-app inbox, reply `From`) | - |
| done | Decided: mini-app module, page text instead of screenshots, closable button with cookie, no hotkey by default, one-way email, light limits, operators and delegation later (not now) | Opus |

## 1. Package scaffold

| Status | Task | Model |
|---|---|---|
| todo | `composer.json` (`rapttor/yii2-feedback`, PSR-4 `rapttor\yii2feedback\`, php >= 8.2, Yii ~2.0.54, `extra.bootstrap`), LICENSE, CHANGELOG, phpunit.xml, `.gitignore`, CI workflow copied from `yii2-metadata` | Haiku |
| todo | `Bootstrap` (web: public routes; console: `feedback/*` commands + migration namespace; no-op until the component exists) | Sonnet |

## 2. Core (server)

| Status | Task | Model |
|---|---|---|
| todo | Data model review: columns, indexes (status/created, fingerprint, profile_id, ip_hash), `rev`, retention | Opus |
| todo | `Schema::create()` + migrations for `rapttor_feedback`, `rapttor_feedback_note` and `rapttor_feedback_snapshot` (1:1, own retention) | Sonnet |
| todo | `Feedback` component: config (`types`, `rateLimits`, `retention`, `audienceResolver`, `cookie`), `submit()`, `find`, `setStatus`, `addNote`, `reply` with `rev` check | Sonnet |
| todo | `FeedbackForm` + validation (type/subtype from config, lengths, email, rating by type, honeypot, signed open-token with minimum time) | Sonnet |
| todo | Rate limiter from the table (profile + `ip_hash`, hourly/daily, off in dev, `429` + `Retry-After`) | Sonnet |
| todo | Consent enforcement: reject/drop snapshot without `snapshot_consent=1`; store `snapshot_consent_at` + wording version; tests | Sonnet |
| todo | Server-side snapshot sanitiser (field-name and value masking, size caps, row/column limits) and the single snapshot reader | Opus |
| todo | Fingerprint + duplicate grouping | Sonnet |
| todo | Public controller: `POST /feedback/submit` (JSON, CSRF), `GET /feedback/config`; events `EVENT_CREATED/STATUS/REPORT` | Sonnet |
| todo | `export('profile', $id)`, `anonymiseProfile`, `deleteProfile`; console `feedback/purge` | Sonnet |
| todo | PHPUnit: submit per type, validation, rate limit, honeypot/min-time, dedupe, sanitiser cases, export/anonymise, purge, `rev` concurrency | Sonnet |

## 3. Widget (client)

| Status | Task | Model |
|---|---|---|
| todo | Asset bundle + `Widget` (vanilla JS/CSS, CSS variables for `yii2-themes`, no CDN, CSP-safe) | Sonnet |
| todo | Floating button: draggable (mouse + touch), edge snap, close "x" writes cookie `rapttor_fb`, server skips rendering when set, `Feedback.open()`, `Feedback.show()`, `data-feedback-open`, PHP `showButton()` | Sonnet |
| todo | Dialog UX: type tiles, option chips, auto-growing textarea, stars (per type), email for anonymous, `localStorage` draft, bottom sheet on phones, focus trap, `Esc`, success state | Sonnet |
| todo | Element picker ("point at the problem": highlight, selector + trimmed outline into `context`) | Sonnet |
| todo | Snapshot collector: messages, forms (name/label/value/error), tables (20x15), failed requests; `data-feedback-hide/keep/capture`, `captureMode`, client masking, per-part preview toggles; off on `/admin`; consent checkbox unchecked by default, snapshot only sent when ticked | Sonnet |
| todo | Recent JS errors buffer (last 5, truncated) for "technical details" | Sonnet |
| todo | Optional hotkey (off by default, ignored while typing) | Haiku |
| todo | Accessibility pass and 360 px / tablet / desktop check in the browser | Sonnet |
| todo | Messages: `en` + `sh` first (Balkan wording rules, short checkbox titles + small print, no reply-time promises) | Sonnet |
| todo | Translate to the other 15 languages (ar, de, es, fr, hi, it, ja, ko, nl, pl, pt-BR, ru, tr, uk, zh-Hans) | Haiku |
| later | Add `sv` (Swedish) to the shared registry `rapttor.legal/i18n/languages.json`, `yii2-legal` and this package | Haiku |
| todo | Language handling: use app language, resolve via the registry's aliases (sr/hr/bs/cnr to `sh`, `de-AT` to `de`, ...), fallback `en`, in-dialog dropdown when the app has none (`languageSelector`), store `locale`, RTL (ar) via logical CSS + `dir`, localized reply email | Sonnet |
| todo | Test: every language file has all keys of `en`; `sh` has no banned national-marker words | Haiku |

## 4. Inbox module (mini app)

| Status | Task | Model |
|---|---|---|
| todo | `backend\Module` with own layout + CSS, `layout` override option; access by role `admin` only (`allowedRoles`) | Sonnet |
| todo | List: filters (status, type, app, audience, rating, route, date), search, bulk status/close, counts | Sonnet |
| todo | Detail: message, context, picked element, snapshot view (encoded), reporter link, duplicates, timeline, status/priority with `rev`, internal notes | Sonnet |
| todo | One-way reply email through Postar, stored as `reply` note | Sonnet |
| todo | Small stats page (volume, ratings, top routes, top JS errors) | Sonnet |
| todo | Security review: admin check on every action, encoding of all user text, CSRF, cookie handling | Opus |
| todo | Functional tests for the module | Sonnet |

## 5. Integration and docs

| Status | Task | Model |
|---|---|---|
| todo | Add "feedback you send" data category and the `rapttor_fb` cookie to `yii2-legal` texts | Sonnet |
| todo | Integrate into `demo`: component in web/console, migration, widget in layouts, backend module, menu option, deletion/export hooks, cron line | Sonnet |
| todo | `README.md`, `AGENTS.md` (contract from DESIGN.md section 12), `llms.txt` (shape of `yii2-metadata`), `docs/INTEGRATION.md` | Haiku |
| todo | Final privacy + security review (snapshot masking and access, rate limits, GDPR paths, CSP) before `v0.1.0` | Opus |
| todo (owner) | Commit, tag `v0.1.0`, push, register on Packagist | Haiku |

## Later

| Status | Task | Model |
|---|---|---|
| later | Screenshot attachment (client render, re-encode, store outside web root, retention) | Opus |
| later | Operators / delegation: role `feedback-operator`, permissions `view`/`manage`/`assign`, snapshot admin-only, no reporter identity for operators, reply through the system, "copy excerpt to comment", assignee UI, `feedback/rbac-init` | Sonnet |
| later | Rules (`when` -> `then`), round-robin, digest and priority-3 notifications | Sonnet |
| later | `report` handoff to `yii2-legal` requests; confirmed email for reports | Opus |
| later | Conversation thread on a token page (`/feedback/t/<uid>`) | Sonnet |
| later | Webhooks (Slack, Linear/Asana) over the events; embeddable script for external sites | Sonnet |

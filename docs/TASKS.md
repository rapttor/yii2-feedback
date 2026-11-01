# Tasks

Design: [DESIGN.md](DESIGN.md). Model tag = the cheapest model that can do it well; switch up early rather than redo.
Status as of 2026-11-01: **beta-ready, not public-launch-ready.** 21 PHPUnit tests pass; the visitor flow was checked in the browser (button, dialog in Swedish, consent preview, send, stored row, rate limit, proof of work, footer link, legal pages); the signed-in widget and the inbox screens have not been looked at in the browser by Claude (the inbox renders in a test and loaded for the owner).

## 0. Decisions

| Status | Task | Model |
|---|---|---|
| done | Mini-app module, closable button with cookie, no hotkey by default, one-way email, operators later | Opus |
| done | Visitors can send; one hub inbox; reply `From` chain; `captureMode` all; site-wide widget (DESIGN.md section 13) | Opus |
| done | Screen data only with explicit, never pre-ticked consent and a preview; emails kept unless `maskEmails` | Opus |

## 1. Package and core (server)

| Status | Task | Model |
|---|---|---|
| done | `composer.json`, LICENSE, CHANGELOG, phpunit, `Bootstrap` (web routes, console command, migration namespace) | Haiku, Sonnet |
| done | Schema + migration: `rapttor_feedback`, `_note`, `_snapshot` | Sonnet |
| done | `Feedback` component: submit, validation, dedupe by fingerprint, status/priority with `rev`, notes, reply, export, anonymise, delete, purge, counts | Sonnet |
| done | Rate limits per profile and hashed IP, honeypot, minimum time, signed open-token, proof of work for visitors (needs `cache`), `429` + `Retry-After` | Sonnet |
| done | `Sanitizer`: field-name and value masking, size caps, row/column limits; consent enforcement; single snapshot reader | Opus |
| done | Public JSON controller (config, submit), events `EVENT_CREATED/STATUS/REPORT` | Sonnet |
| done | `excludeRoutes` and `hiddenRoutes` | Sonnet |
| done | PHPUnit (21 tests): submit paths, validation, limits, proof of work, consent, masking, context, status/`rev`, reply, account hooks, retention, counts, inbox views render, languages, route rules | Sonnet |
| todo | Data model review (indexes under load, `ip_hash` retention) | Opus |
| todo | Move `report` handoff to `yii2-legal` requests (confirmed email for reports) | Opus |

## 2. Widget (client)

| Status | Task | Model |
|---|---|---|
| done | Asset bundle, `Widget`, vanilla JS/CSS, theme variables, CSP-safe (same-origin, no eval) | Sonnet |
| done | Floating button: drag (mouse + touch), edge snap, close "x" with cookie `rapttor_fb`, `Feedback.open/show/hide`, `data-feedback-open`, PHP `showButton()` | Sonnet |
| done | Dialog: type tiles, option chips, auto-growing textarea, stars per type, email for visitors, draft in `localStorage`, bottom sheet on phones, focus trap, `Esc`, thank-you | Sonnet |
| done | Element picker; snapshot collector with per-part preview; recent JS errors and failed requests; proof-of-work solver | Sonnet |
| done | Languages: 22 files, app language / `legal` language, aliases (sr/hr/bs/cnr to `sh`), dropdown when the app has none, `locale` stored, RTL for `ar` | Sonnet |
| todo | Accessibility pass: screen reader, contrast in all themes, 360 px phones and tablets, reduced motion | Sonnet |
| todo | Human review of the 20 machine-translated language files (`sh` was written by hand) | owner |
| todo | Optional hotkey (off by default, ignored while typing) | Haiku |

## 3. Inbox module (mini app)

| Status | Task | Model |
|---|---|---|
| done | `backend\Module` with own layout and CSS, `permission` (default `admin`), `layout` override | Sonnet |
| done | List with status tabs, counts, filters (type, app, text), paging; detail with snapshot, technical details, notes; status/priority; notes; reply by email | Sonnet |
| todo | List filters by audience, rating, route, date; bulk status/close; duplicates view | Sonnet |
| todo | Stats page (volume, ratings, top routes, top JS errors) | Sonnet |
| todo | Functional (request-level) tests of the module; security review of access and encoding | Sonnet, Opus |

## 4. Integration and launch

| Status | Task | Model |
|---|---|---|
| done | Demo: component, compose mount, layout widget, footer link, backend module + menu, migration applied in Docker, cookie in legal config | Sonnet |
| done | README (config reference), AGENTS.md, llms.txt, CHANGELOG, DESIGN.md | Haiku |
| todo | `feedback` clause for the `rapttor/legal` templates (privacy: what is collected, consent, retention) in 22 languages; lawyer review | Opus, owner |
| todo | Account deletion and export in apps: call `anonymiseProfile` / `export` (demo task is in `demo/docs/TASKS.md`) | Opus |
| todo | Run the demo with `CSP_ENFORCE=1`; set `maskEmails => true` and consider `captureMode => 'marked'` for public use | Sonnet |
| todo | Final privacy and security review before `v0.1.0` | Opus |
| todo (owner) | Commit, tag `v0.1.0`, push, register on Packagist | Haiku |

## Later

| Status | Task | Model |
|---|---|---|
| later | Screenshot attachment (client render, re-encode, store outside web root, retention) | Opus |
| later | Operators / delegation: role `feedback-operator`, permissions `view`/`manage`/`assign`, snapshot admin-only, no reporter identity for operators, reply through the system, "copy excerpt to comment", assignee UI, `feedback/rbac-init` | Sonnet |
| later | Rules (`when` -> `then`), round-robin, digest and priority-3 notifications | Sonnet |
| later | Conversation thread on a token page (`/feedback/t/<uid>`) | Sonnet |
| later | Webhooks (Slack, Linear/Asana) over the events; embeddable script for external sites | Sonnet |

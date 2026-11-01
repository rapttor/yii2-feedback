# Changelog

## 0.1.1 - 2026-11-01

- The preference cookie follows the Rapttor cookie rules: set a name unique per app (`cookie => 'fb-' . APP_SLUG`), `SameSite=Lax` and `Secure` only on https (none on plain-http dev hosts).
- Docs: README configuration example, AGENTS.md.

## 0.1.0 - 2026-11-01 (beta)

- Component `feedback`, shared tables `rapttor_feedback`, `_note`, `_snapshot`, migration in `rapttor\yii2feedback\migrations`.
- Public JSON endpoints (`feedback/config`, `feedback/submit`), widget (draggable closable button with cookie `rapttor_fb`, dialog, element picker, consented snapshot with preview, recent JS errors and failed requests), `data-feedback-open` and `Feedback.open/show/hide`.
- Visitors can send (`guests`), with stricter limits and a proof of work (`proofOfWork`); signed-in users are not asked. Honeypot, minimum time, rate limits per profile and per hashed IP, duplicate merging.
- `excludeRoutes` (no widget) and `hiddenRoutes` (no floating button only).
- Screen data only with explicit consent (proof stored); passwords, token/secret/card fields and card-like numbers always masked; emails kept unless `maskEmails`.
- Admin inbox module (own layout): list, filters, detail, status/priority, notes, reply by email.
- 22 languages (`en`, `sh` by hand, the rest machine translated, review pending); language follows `yii2-legal`'s choice when present.
- Export, anonymise, delete per account; `php yii feedback/purge`.

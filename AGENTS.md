# Instructions for AI coding agents: rapttor/yii2-feedback

Feedback widget + admin inbox. Component `Yii::$app->feedback`; read README.md for config.

## Integrating in a host app

1. `composer require rapttor/yii2-feedback`; register the `feedback` component in web **and** console config; run `php yii migrate` (namespace `rapttor\yii2feedback\migrations`). The tables are shared with other Rapttor apps on the database: do not create another set, set `app`.
2. Put `\rapttor\yii2feedback\widget\Widget::widget()` once in the frontend layout. Exempt the route `feedback/*` from any consent gate or login redirect. Visitors need a `cache` component (proof of work, one token one submission). Add a footer or menu link `data-feedback-open`. Hide the button on pages with `hiddenRoutes`, remove the widget with `excludeRoutes`; do not exclude sign-in pages (that is where beta testers get stuck).
3. Backend: mount `rapttor\yii2feedback\backend\Module` as the module id `feedback`, `permission` = the admin role. Do not also map a controller called `feedback` in the backend: it would shadow the module.
4. Account deletion calls `feedback->anonymiseProfile($id)`; data export includes `feedback->export('profile', $id)`; cron runs `php yii feedback/purge`.
5. For public use set `maskEmails => true` and consider `captureMode => 'marked'`. Give the cookie a name unique per app (`cookie => 'fb-' . APP_SLUG`; default `rapttor_fb`) and list it (preference, 1 year) in the cookie list of the legal texts and mention "feedback you send" among the data categories.

## Rules

- The screen snapshot (messages, form values, tables) is stored only with explicit consent (`snapshot_consent=1`, checkbox never pre-ticked) and is read only through `Feedback::snapshot()`. Never add another reader, never render it unencoded, never export it to operators.
- Never write to the tables with raw SQL (revision `rev` and notes would be skipped).
- All text from users (`message`, `context`, snapshot) is untrusted: encode on output, plain text only.
- No confirmation or reply text may promise a reply time. Balkan (`sh`) wording rules of rapttor.md apply to `src/messages/sh.php`.
- New UI text: add the key to `src/messages/en.php` and every language file; `tests/FeedbackTest.php` fails otherwise.

## Changing this package

PHP >= 8.2, `declare(strict_types=1)`, PSR-4 `rapttor\yii2feedback\`. Every behaviour change needs a test. Run `composer install && vendor/bin/phpunit`. The JS is vanilla (`src/widget/assets/feedback.js`), no dependencies, no CDN; check with `node --check`.

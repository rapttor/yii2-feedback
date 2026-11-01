# rapttor/yii2-feedback

Feedback for Yii2 apps, between a contact form and a helpdesk. A closable floating button (or any menu link) opens a dialog: what is wrong / an idea / report content / other, options, an auto-growing text box, stars, optional email. The user can add technical details (ticked by default) and, only with an explicit unticked-by-default consent, what is on their screen (messages, form values, tables; passwords and card data never). Everything lands in one shared table and a small admin inbox. 22 languages, `sh` = Balkan.

## Install

```bash
composer require rapttor/yii2-feedback
```

Web **and** console config:

```php
'components' => [
    'feedback' => [
        'class' => \rapttor\yii2feedback\Feedback::class,
        'app' => 'my-app',                       // rows carry the app, tables are shared by all Rapttor apps
        // 'replyFrom' => 'support@example.com', // else params senderEmail / supportEmail / adminEmail
        // 'captureMode' => 'all',               // all | marked (only inside data-feedback-capture)
        // 'guests' => true,                     // false = signed-in users only
        // 'languageSelector' => 'auto',         // auto | always | never
    ],
],
```

Console: `rapttor\yii2feedback\migrations` is added to `migrationNamespaces` by the extension bootstrap; run `php yii migrate`.
Frontend layout, once: `<?= \rapttor\yii2feedback\widget\Widget::widget() ?>`
Backend: `'modules' => ['feedback' => ['class' => \rapttor\yii2feedback\backend\Module::class, 'permission' => 'admin']]`, then open `/feedback`.
If you use a consent gate, exempt the route `feedback/*`.

## Use

- Menu or link: `<a href="#" data-feedback-open>Feedback</a>`, or `data-feedback-open="idea"` to jump to a type; JS: `Feedback.open({type: 'error'})`.
- The button has a close "x" (cookie `rapttor_fb`, list it as a preference cookie). Bring it back with `Feedback.show()` or PHP `Widget::showButton()`.
- Mark sensitive regions `data-feedback-hide`; force a field in with `data-feedback-keep`; with `captureMode => 'marked'` only `data-feedback-capture` regions are read.
- Account deletion: `Yii::$app->feedback->anonymiseProfile($id)` (or `deleteProfile`). Data export: `->export('profile', $id)`. Cron: `php yii feedback/purge` (snapshots after `snapshotDays`, default 30).
- Events: `Feedback::EVENT_CREATED`, `EVENT_STATUS`, `EVENT_REPORT`.

## Tests

```bash
composer install && vendor/bin/phpunit
```

Design and open points: `docs/DESIGN.md`, tasks: `docs/TASKS.md`.

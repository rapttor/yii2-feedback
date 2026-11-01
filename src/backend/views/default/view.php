<?php

declare(strict_types=1);

/** @var yii\web\View $this */
/** @var array $row */
/** @var array|null $snapshot */
/** @var array $notes */
/** @var bool $canReply */

use rapttor\yii2feedback\Feedback;
use yii\helpers\Html;

$this->title = 'Feedback #' . $row['id'];
$ctx = $row['context'] ? json_decode((string) $row['context'], true) : null;
?>
<p><?= Html::a('&larr; all feedback', ['index'], ['encode' => false]) ?></p>
<h1>#<?= (int) $row['id'] ?> <small><?= Html::encode($row['type'] . ($row['subtype'] ? ' / ' . $row['subtype'] : '')) ?></small></h1>
<div class="fbx-grid">
    <section>
        <blockquote class="fbx-msg"><?= nl2br(Html::encode((string) $row['message'])) ?></blockquote>
        <dl class="fbx-dl">
            <dt>When</dt><dd><?= Html::encode(gmdate('Y-m-d H:i', (int) $row['created_at'])) ?> UTC</dd>
            <dt>From</dt><dd><?= Html::encode($row['profile_id'] !== null ? 'profile #' . $row['profile_id'] : ($row['email'] ?: 'anonymous')) ?> · <?= Html::encode($row['audience']) ?> · <?= Html::encode((string) $row['locale']) ?></dd>
            <dt>Where</dt><dd><?= Html::encode($row['app'] . ' · ' . $row['route'] . ' · ' . $row['url']) ?></dd>
            <?php if ($row['rating']): ?><dt>Rating</dt><dd><?= str_repeat('★', (int) $row['rating']) . str_repeat('☆', 5 - (int) $row['rating']) ?></dd><?php endif ?>
        </dl>

        <?php if ($ctx): ?>
            <h2>Technical details</h2>
            <dl class="fbx-dl">
                <dt>Browser</dt><dd><?= Html::encode((string) ($ctx['ua'] ?? '')) ?></dd>
                <dt>Viewport</dt><dd><?= Html::encode(implode(' × ', (array) ($ctx['viewport'] ?? []))) ?></dd>
                <?php if (!empty($ctx['picked'])): ?><dt>Picked</dt><dd><code><?= Html::encode($ctx['picked']['selector'] ?? '') ?></code> <?= Html::encode($ctx['picked']['outline'] ?? '') ?></dd><?php endif ?>
                <?php if (!empty($ctx['errors'])): ?><dt>JS errors</dt><dd><?= implode('<br>', array_map(Html::encode(...), (array) $ctx['errors'])) ?></dd><?php endif ?>
                <?php if (!empty($ctx['failed'])): ?><dt>Failed requests</dt><dd><?= implode('<br>', array_map(static fn ($f) => Html::encode(($f['method'] ?? '') . ' ' . ($f['url'] ?? '') . ' → ' . ($f['status'] ?? '')), (array) $ctx['failed'])) ?></dd><?php endif ?>
            </dl>
        <?php endif ?>

        <h2>Screen data <small><?= $row['snapshot_consent_at'] ? 'consented ' . Html::encode(gmdate('Y-m-d H:i', (int) $row['snapshot_consent_at'])) . ' UTC, wording v' . Html::encode((string) $row['snapshot_consent_ver']) : 'not sent' ?></small></h2>
        <?php if ($snapshot): ?>
            <?php if ($snapshot['messages']): ?><h3>Messages</h3><ul><?php foreach ($snapshot['messages'] as $m): ?><li><?= Html::encode($m) ?></li><?php endforeach ?></ul><?php endif ?>
            <?php foreach ($snapshot['forms'] as $form): ?>
                <h3>Form <?= Html::encode($form['id'] ?: $form['action']) ?></h3>
                <table class="fbx-table"><thead><tr><th>Field</th><th>Value</th><th>Error</th></tr></thead><tbody>
                <?php foreach ($form['fields'] as $f): ?><tr><td><?= Html::encode($f['label'] ?: $f['name']) ?> <small><?= Html::encode($f['type']) ?></small></td><td><?= Html::encode($f['value']) ?></td><td class="fbx-bad"><?= Html::encode($f['error']) ?></td></tr><?php endforeach ?>
                </tbody></table>
            <?php endforeach ?>
            <?php foreach ($snapshot['tables'] as $t): ?>
                <h3>Table <?= Html::encode($t['caption']) ?></h3>
                <table class="fbx-table"><thead><tr><?php foreach ($t['headers'] as $h): ?><th><?= Html::encode($h) ?></th><?php endforeach ?></tr></thead><tbody>
                <?php foreach ($t['rows'] as $r): ?><tr><?php foreach ($r as $c): ?><td><?= Html::encode($c) ?></td><?php endforeach ?></tr><?php endforeach ?>
                </tbody></table>
            <?php endforeach ?>
        <?php elseif ($row['snapshot_consent_at']): ?>
            <p class="fbx-muted">Deleted by retention.</p>
        <?php endif ?>
    </section>

    <aside>
        <h2>Handle</h2>
        <?= Html::beginForm(['update', 'id' => $row['id']], 'post', ['class' => 'fbx-form']) ?>
        <input type="hidden" name="rev" value="<?= (int) $row['rev'] ?>">
        <label>Status <select name="status"><?php foreach (Feedback::STATUSES as $s): ?><option <?= $s === $row['status'] ? 'selected' : '' ?>><?= Html::encode($s) ?></option><?php endforeach ?></select></label>
        <label>Priority <select name="priority"><?php foreach ([0, 1, 2, 3] as $p): ?><option <?= $p === (int) $row['priority'] ? 'selected' : '' ?>><?= $p ?></option><?php endforeach ?></select></label>
        <button>Save</button>
        <?= Html::endForm() ?>

        <h2>Reply by email</h2>
        <?php if ($canReply): ?>
            <?= Html::beginForm(['reply', 'id' => $row['id']], 'post', ['class' => 'fbx-form']) ?>
            <textarea name="body" rows="5" required></textarea>
            <button>Send reply</button>
            <?= Html::endForm() ?>
        <?php else: ?><p class="fbx-muted">No email address for this sender.</p><?php endif ?>

        <h2>Notes</h2>
        <?php foreach ($notes as $n): ?>
            <div class="fbx-note fbx-note-<?= Html::encode($n['kind']) ?>"><small><?= Html::encode($n['kind'] . ' · ' . gmdate('Y-m-d H:i', (int) $n['created_at'])) ?></small><br><?= nl2br(Html::encode((string) $n['body'])) ?></div>
        <?php endforeach ?>
        <?= Html::beginForm(['note', 'id' => $row['id']], 'post', ['class' => 'fbx-form']) ?>
        <textarea name="body" rows="3" placeholder="Internal note"></textarea>
        <button>Add note</button>
        <?= Html::endForm() ?>
    </aside>
</div>

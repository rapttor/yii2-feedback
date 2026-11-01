<?php

declare(strict_types=1);

/** @var yii\web\View $this */
/** @var array $rows */
/** @var yii\data\Pagination $pages */
/** @var array $counts */
/** @var string[] $apps */
/** @var string[] $types */
/** @var string $status */
/** @var string $type */
/** @var string $app */
/** @var string $q */

use rapttor\yii2feedback\Feedback;
use yii\helpers\Html;
use yii\helpers\StringHelper;
use yii\widgets\LinkPager;

$this->title = 'Feedback';
?>
<h1>Feedback <small><?= (int) array_sum($counts) ?> total</small></h1>
<p class="fbx-tabs">
    <?= Html::a('all', ['index'], ['class' => $status === '' ? 'on' : '']) ?>
    <?php foreach (Feedback::STATUSES as $s): ?>
        <?= Html::a(Html::encode($s) . ' <b>' . (int) ($counts[$s] ?? 0) . '</b>', ['index', 'status' => $s], ['class' => $status === $s ? 'on' : '', 'encode' => false]) ?>
    <?php endforeach ?>
</p>
<form method="get" class="fbx-filter">
    <input type="hidden" name="status" value="<?= Html::encode($status) ?>">
    <select name="type"><option value="">any type</option><?php foreach ($types as $t): ?><option <?= $t === $type ? 'selected' : '' ?>><?= Html::encode($t) ?></option><?php endforeach ?></select>
    <select name="app"><option value="">any app</option><?php foreach ($apps as $a): ?><option <?= $a === $app ? 'selected' : '' ?>><?= Html::encode($a) ?></option><?php endforeach ?></select>
    <input type="search" name="q" value="<?= Html::encode($q) ?>" placeholder="search in message">
    <button>Filter</button>
</form>
<table class="fbx-table">
    <thead><tr><th>#</th><th>When</th><th>Type</th><th>★</th><th>Message</th><th>Route</th><th>App</th><th>By</th><th>Status</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
        <tr class="p<?= (int) $r['priority'] ?>">
            <td><?= Html::a((string) (int) $r['id'], ['view', 'id' => $r['id']]) ?></td>
            <td><?= Html::encode(gmdate('Y-m-d H:i', (int) $r['created_at'])) ?></td>
            <td><?= Html::encode($r['type'] . ($r['subtype'] ? ' / ' . $r['subtype'] : '')) ?></td>
            <td><?= $r['rating'] ? (int) $r['rating'] : '' ?></td>
            <td><?= Html::a(Html::encode(StringHelper::truncate((string) $r['message'], 110)), ['view', 'id' => $r['id']], ['encode' => false]) ?><?= $r['snapshot_consent_at'] ? ' <span class="fbx-tag" title="screen data attached">▣</span>' : '' ?></td>
            <td><?= Html::encode((string) $r['route']) ?></td>
            <td><?= Html::encode($r['app']) ?></td>
            <td><?= Html::encode($r['profile_id'] !== null ? '#' . $r['profile_id'] : ($r['email'] ?: 'anon')) ?></td>
            <td><span class="fbx-st fbx-st-<?= Html::encode($r['status']) ?>"><?= Html::encode($r['status']) ?></span></td>
        </tr>
    <?php endforeach ?>
    <?php if (!$rows): ?><tr><td colspan="9" class="fbx-empty">Nothing here yet.</td></tr><?php endif ?>
    </tbody>
</table>
<?= LinkPager::widget(['pagination' => $pages]) ?>

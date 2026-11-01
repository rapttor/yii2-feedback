<?php

declare(strict_types=1);

/** @var yii\web\View $this */
/** @var string $content */

use rapttor\yii2feedback\backend\assets\AdminAsset;
use yii\helpers\Html;
use yii\helpers\Url;

AdminAsset::register($this);
$home = Yii::$app->controller->module->homeUrl;
?>
<?php $this->beginPage() ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?= Html::csrfMetaTags() ?>
    <title><?= Html::encode($this->title ?: 'Feedback') ?></title>
    <?php $this->head() ?>
</head>
<body class="fbx">
<?php $this->beginBody() ?>
<header class="fbx-top">
    <a class="fbx-brand" href="<?= Url::to(['/' . Yii::$app->controller->module->id]) ?>">Feedback</a>
    <a class="fbx-back" href="<?= Url::to($home) ?>">&larr; <?= Html::encode(Yii::$app->name) ?></a>
</header>
<main class="fbx-main">
    <?php foreach (['success', 'error'] as $k): ?>
        <?php if ($m = Yii::$app->session->getFlash($k)): ?><p class="fbx-flash fbx-<?= $k ?>"><?= Html::encode($m) ?></p><?php endif ?>
    <?php endforeach ?>
    <?= $content ?>
</main>
<?php $this->endBody() ?>
</body>
</html>
<?php $this->endPage() ?>

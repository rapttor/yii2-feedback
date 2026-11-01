<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\widget;

use yii\web\AssetBundle;

final class FeedbackAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/assets';
    public $css = ['feedback.css'];
    public $js = ['feedback.js'];
    public $jsOptions = ['defer' => true];
}

<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\console;

use Yii;
use yii\console\Controller;
use yii\console\ExitCode;

/** php yii feedback/purge: applies the retention settings (snapshots, optionally messages). Run daily from cron. */
final class FeedbackController extends Controller
{
    public function actionPurge(): int
    {
        $r = Yii::$app->get('feedback')->purge();
        $this->stdout("snapshots deleted: {$r['snapshots']}, messages deleted: {$r['messages']}\n");
        return ExitCode::OK;
    }
}

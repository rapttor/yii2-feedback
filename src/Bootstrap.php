<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

use yii\base\BootstrapInterface;
use yii\console\Application as ConsoleApplication;
use yii\web\Application as WebApplication;

/** Maps the public `feedback` controller (web) and the `feedback` command (console). Does nothing until a `feedback` component is configured. */
final class Bootstrap implements BootstrapInterface
{
    public function bootstrap($app): void
    {
        if (!$app->has('feedback')) {
            return;
        }
        if ($app instanceof WebApplication) {
            // The backend mounts the inbox as the module `feedback`; the public routes belong to the frontend (a controller of the same id would shadow the module).
            if ($app->hasModule('feedback')) {
                return;
            }
            $app->controllerMap['feedback'] ??= ['class' => controllers\FeedbackController::class];
            $app->getUrlManager()->addRules(['feedback/config' => 'feedback/config', 'feedback/submit' => 'feedback/submit'], false);
        } elseif ($app instanceof ConsoleApplication) {
            $app->controllerMap['feedback'] ??= ['class' => console\FeedbackController::class];
            $migrate = $app->controllerMap['migrate'] ?? ['class' => \yii\console\controllers\MigrateController::class];
            if (is_array($migrate)) {
                $migrate['migrationNamespaces'] = array_values(array_unique([...($migrate['migrationNamespaces'] ?? []), 'rapttor\yii2feedback\migrations']));
                $app->controllerMap['migrate'] = $migrate;
            }
        }
    }
}

<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\backend;

use rapttor\yii2feedback\Feedback;
use Yii;
use yii\base\Module as BaseModule;

/**
 * The inbox. Mount in a BACKEND app (any one; the table is shared, rows carry their app):
 *   'modules' => ['feedback' => ['class' => rapttor\yii2feedback\backend\Module::class]]
 * then open /feedback. Own layout and styles; set `layout` to use the host's. Only `permission` (default role `admin`) gets in.
 */
final class Module extends BaseModule
{
    public $controllerNamespace = 'rapttor\yii2feedback\backend\controllers';
    public $defaultRoute = 'default';
    public $layout = '@rapttor/yii2feedback/backend/views/layouts/main';
    /** RBAC role or permission checked with Yii::$app->user->can(). */
    public string $permission = 'admin';
    /** Name of the `feedback` component. */
    public string $component = 'feedback';
    /** Link back to the host backoffice, shown in the layout. */
    public array|string $homeUrl = ['/'];

    public function init(): void
    {
        parent::init();
        Yii::setAlias('@rapttor/yii2feedback', dirname(__DIR__));
    }

    public function feedback(): Feedback
    {
        return Yii::$app->get($this->component);
    }
}

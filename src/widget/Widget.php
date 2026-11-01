<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\widget;

use rapttor\yii2feedback\Feedback;
use rapttor\yii2feedback\Languages;
use Yii;
use yii\base\Widget as BaseWidget;
use yii\helpers\Html;
use yii\helpers\Url;

/**
 * Put once in the layout: <?= \rapttor\yii2feedback\widget\Widget::widget() ?>
 * Draws a data-only root element; feedback.js builds the button and the dialog. A closed button (cookie) is not drawn,
 * but Feedback.open() and elements with data-feedback-open keep working. Feedback.show() brings the button back.
 */
final class Widget extends BaseWidget
{
    public string $component = 'feedback';

    public static function showButton(?Feedback $feedback = null): void
    {
        $name = ($feedback ?? Yii::$app->get('feedback'))->cookie;
        Yii::$app->response->cookies->remove($name);
        setcookie($name, '', time() - 3600, '/');
    }

    public function run(): string
    {
        /** @var Feedback $f */
        $f = Yii::$app->get($this->component);
        $route = Yii::$app->controller ? Yii::$app->controller->route : '';
        if ($f->routeExcluded($route) || ($f->profileId() === null && !$f->guests)) {
            return '';
        }
        FeedbackAsset::register($this->view);
        parse_str(isset($_COOKIE[$f->cookie]) ? (string) $_COOKIE[$f->cookie] : '', $pref);
        $lang = $f->language();
        $selector = match ($f->languageSelector) {
            'always' => true,
            'never' => false,
            default => !$f->appHasLanguageChoice(),
        };

        return Html::tag('div', '', [
            'id' => 'rapttor-feedback',
            'data' => [
                'config' => Url::to(['/feedback/config']),
                'submit' => Url::to(['/feedback/submit']),
                'route' => $route,
                'lang' => $lang,
                'languages' => json_encode(array_intersect_key(Languages::NAMES, array_flip(Languages::codes())), JSON_UNESCAPED_UNICODE),
                'selector' => $selector ? '1' : '0',
                'hidden' => !empty($pref['h']) || $f->routeHidden($route) ? '1' : '0',
                'cookie' => $f->cookie,
                'csrf-param' => Yii::$app->request->csrfParam,
                'csrf' => Yii::$app->request->getCsrfToken(),
                'release' => $f->release,
                'label' => \rapttor\yii2feedback\Messages::t('fab.label', $lang),
                'close' => \rapttor\yii2feedback\Messages::t('fab.close', $lang),
            ],
        ]);
    }
}

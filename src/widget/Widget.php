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

    /**
     * The menu entry that opens the feedback dialog. Every app keeps one in its main menu (or footer): it is how a person who closed the
     * floating button finds the form again, and the dialog has a switch that brings the button back.
     *   <?= Widget::link() ?>                      <a href="#" data-feedback-open>Feedback</a>
     *   <?= Widget::link(['class' => 'nav-link']) ?>
     */
    public static function link(array $options = [], ?string $label = null, string $component = 'feedback'): string
    {
        /** @var Feedback $f */
        $f = Yii::$app->get($component);
        $options['data-feedback-open'] = $options['data-feedback-open'] ?? '';
        $options['href'] ??= '#';

        return Html::tag('a', Html::encode($label ?? \rapttor\yii2feedback\Messages::t('fab.label', $f->language())), $options);
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
                'hidden' => !empty($pref['h']) ? '1' : '0',
                'route-hidden' => $f->routeHidden($route) ? '1' : '0',
                'confirm-hide' => $f->confirmHide ? '1' : '0',
                'site-colors' => $f->siteColors ? '1' : '0',
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

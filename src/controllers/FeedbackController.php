<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\controllers;

use rapttor\yii2feedback\Feedback;
use Yii;
use yii\filters\VerbFilter;
use yii\web\Controller;
use yii\web\Response;

/** Public JSON endpoints used by the widget: GET config, POST submit. */
final class FeedbackController extends Controller
{
    public function behaviors(): array
    {
        return ['verbs' => ['class' => VerbFilter::class, 'actions' => ['config' => ['get'], 'submit' => ['post']]]];
    }

    public function beforeAction($action): bool
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    private function feedback(): Feedback
    {
        return Yii::$app->get('feedback');
    }

    public function actionConfig(string $lang = ''): array
    {
        $f = $this->feedback();
        if ($f->profileId() === null && !$f->guests) {
            throw new \yii\web\ForbiddenHttpException();
        }
        return $f->clientConfig($lang !== '' ? $lang : $f->language());
    }

    public function actionSubmit(): array
    {
        $f = $this->feedback();
        if ($f->profileId() === null && !$f->guests) {
            throw new \yii\web\ForbiddenHttpException();
        }
        $in = json_decode(Yii::$app->request->getRawBody(), true);
        if (!is_array($in)) {
            Yii::$app->response->statusCode = 400;
            return ['ok' => false, 'code' => 'generic'];
        }
        $result = $f->submit($in, (string) Yii::$app->request->userIP, mb_substr((string) ($in['route'] ?? ''), 0, 190));
        if (!$result['ok']) {
            Yii::$app->response->statusCode = ($result['code'] ?? '') === 'limit' ? 429 : 422;
            if (isset($result['retryAfter'])) {
                Yii::$app->response->headers->set('Retry-After', (string) $result['retryAfter']);
            }
        }
        return ['ok' => $result['ok'], 'code' => $result['code'] ?? null];
    }
}

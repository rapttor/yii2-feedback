<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\backend\controllers;

use rapttor\yii2feedback\backend\Module;
use rapttor\yii2feedback\Feedback;
use Yii;
use yii\data\Pagination;
use yii\db\Query;
use yii\filters\AccessControl;
use yii\filters\VerbFilter;
use yii\web\Controller;
use yii\web\NotFoundHttpException;

final class DefaultController extends Controller
{
    public function behaviors(): array
    {
        /** @var Module $m */
        $m = $this->module;

        return [
            'access' => ['class' => AccessControl::class, 'rules' => [['allow' => true, 'roles' => [$m->permission]]]],
            'verbs' => ['class' => VerbFilter::class, 'actions' => ['update' => ['post'], 'note' => ['post'], 'reply' => ['post']]],
        ];
    }

    private function fb(): Feedback
    {
        /** @var Module $m */
        $m = $this->module;

        return $m->feedback();
    }

    public function actionIndex(string $status = '', string $type = '', string $app = '', string $q = ''): string
    {
        $fb = $this->fb();
        $db = $fb->connection();
        $query = (new Query())->from($fb->table);
        if (in_array($status, Feedback::STATUSES, true)) {
            $query->andWhere(['status' => $status]);
        }
        if ($type !== '') {
            $query->andWhere(['type' => $type]);
        }
        if ($app !== '') {
            $query->andWhere(['app' => $app]);
        }
        if ($q !== '') {
            $query->andWhere(['like', 'message', $q]);
        }
        $pages = new Pagination(['totalCount' => (int) $query->count('*', $db), 'pageSize' => 25]);
        $rows = $query->orderBy(['id' => SORT_DESC])->offset($pages->offset)->limit($pages->limit)->all($db);
        $counts = $fb->counts();
        $apps = (new Query())->select('app')->distinct()->from($fb->table)->column($db);

        return $this->render('index', compact('rows', 'pages', 'counts', 'apps', 'status', 'type', 'app', 'q') + ['types' => array_keys($fb->types)]);
    }

    public function actionView(int $id): string
    {
        $fb = $this->fb();
        $row = $fb->find($id) ?? throw new NotFoundHttpException();

        return $this->render('view', ['row' => $row, 'snapshot' => $fb->snapshot($id), 'notes' => $fb->notes($id), 'canReply' => $fb->recipient($row) !== null]);
    }

    public function actionUpdate(int $id)
    {
        $req = Yii::$app->request;
        $ok = $this->fb()->update($id, (int) $req->post('rev'), (string) $req->post('status') ?: null, $req->post('priority') !== null ? (int) $req->post('priority') : null, Yii::$app->user->id);
        Yii::$app->session->setFlash($ok ? 'success' : 'error', $ok ? 'Saved.' : 'Someone changed this meanwhile; reload and try again.');

        return $this->redirect(['view', 'id' => $id]);
    }

    public function actionNote(int $id)
    {
        $body = trim((string) Yii::$app->request->post('body'));
        if ($body !== '' && $this->fb()->find($id)) {
            $this->fb()->addNote($id, 'note', $body, Yii::$app->user->id);
        }

        return $this->redirect(['view', 'id' => $id]);
    }

    public function actionReply(int $id)
    {
        $ok = $this->fb()->reply($id, (string) Yii::$app->request->post('body'), Yii::$app->user->id);
        Yii::$app->session->setFlash($ok ? 'success' : 'error', $ok ? 'Reply sent.' : 'Could not send the reply (no address, empty text or mail error).');

        return $this->redirect(['view', 'id' => $id]);
    }
}

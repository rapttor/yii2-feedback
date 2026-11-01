<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\tests;

use PHPUnit\Framework\TestCase;
use rapttor\yii2feedback\Feedback;
use rapttor\yii2feedback\Languages;
use rapttor\yii2feedback\Messages;
use rapttor\yii2feedback\Sanitizer;
use rapttor\yii2feedback\Schema;
use Yii;

final class FeedbackTest extends TestCase
{
    private function fb(array $props = []): Feedback
    {
        $f = new Feedback($props + ['limitsEnabled' => false, 'app' => 'test', 'replyFrom' => 'support@example.com']);
        Yii::$app->set('feedback', $f);
        $db = Yii::$app->db;
        foreach ([$f->snapshotTable, $f->noteTable, $f->table] as $t) {
            $db->createCommand('DROP TABLE IF EXISTS ' . $t)->execute();
        }
        Schema::create($db, $f->table, $f->noteTable, $f->snapshotTable);
        Yii::$app->user->logout(false);
        return $f;
    }

    private function signIn(): void
    {
        Yii::$app->user->setIdentity(new TestIdentity());
    }

    private function body(Feedback $f, array $over = []): array
    {
        return $over + ['type' => 'idea', 'message' => 'Please add dark mode', 'token' => $f->openToken(time() - 10), 'lang' => 'de'];
    }

    public function testStoresIdeaFromSignedInUser(): void
    {
        $f = $this->fb();
        $this->signIn();
        $r = $f->submit($this->body($f, ['rating' => 4, 'email' => 'ignored@example.com']), '1.2.3.4', 'site/index');
        $this->assertTrue($r['ok']);
        $row = $f->find($r['id']);
        $this->assertSame('7', $row['profile_id']);
        $this->assertNull($row['email'], 'email is read from the profile, never copied');
        $this->assertSame(4, (int) $row['rating']);
        $this->assertSame('de', $row['locale']);
        $this->assertSame('beta', $row['audience']);
        $this->assertNotSame('1.2.3.4', $row['ip_hash']);
    }

    public function testValidation(): void
    {
        $f = $this->fb();
        $this->assertSame('type', $f->submit($this->body($f, ['type' => 'nope']))['code']);
        $this->assertSame('message', $f->submit($this->body($f, ['message' => ' a ']))['code']);
        $this->assertSame('token', $f->submit($this->body($f, ['token' => 'x.y']))['code']);
        $this->assertSame('email', $f->submit($this->body($f, ['email' => 'not-an-email']))['code']);
        $this->assertSame('email', $f->submit($this->body($f, ['type' => 'report']))['code'], 'a report from a visitor needs an email');
        $this->assertTrue($f->submit($this->body($f, ['type' => 'report', 'email' => 'a@b.co']))['ok']);
    }

    public function testRatingOnlyWhereTheTypeHasStars(): void
    {
        $f = $this->fb();
        $r = $f->submit($this->body($f, ['type' => 'error', 'rating' => 5, 'message' => 'Button broken']));
        $this->assertNull($f->find($r['id'])['rating']);
    }

    public function testHoneypotAndMinimumTimeAndRateLimit(): void
    {
        $f = $this->fb(['limitsEnabled' => true, 'proofOfWork' => 0, 'limits' => ['hour' => 2, 'day' => 5, 'anon_hour' => 2, 'anon_day' => 5]]);
        $this->assertTrue($f->submit($this->body($f, ['website' => 'http://spam']))['deduped'], 'bots are accepted silently and dropped');
        $this->assertSame(0, (int) (new \yii\db\Query())->from($f->table)->count('*', Yii::$app->db));
        $this->assertSame('fast', $f->submit($this->body($f, ['token' => $f->openToken()]))['code']);
        $this->assertTrue($f->submit($this->body($f, ['message' => 'first idea here']), '9.9.9.9')['ok']);
        $this->assertTrue($f->submit($this->body($f, ['message' => 'second different one']), '9.9.9.9')['ok']);
        $over = $f->submit($this->body($f, ['message' => 'third different one']), '9.9.9.9');
        $this->assertSame('limit', $over['code']);
        $this->assertGreaterThan(0, $over['retryAfter']);
        $this->assertTrue($f->submit($this->body($f, ['message' => 'another sender']), '8.8.8.8')['ok'], 'limits are per sender');
    }

    public function testVisitorsMustSolveProofOfWorkSignedInUsersNeedNot(): void
    {
        $f = $this->fb(['limitsEnabled' => true, 'proofOfWork' => 8, 'minSeconds' => 0]);
        $token = $f->openToken(time() - 10);
        $this->assertSame('pow', $f->submit(['type' => 'idea', 'message' => 'no work done', 'token' => $token], '5.5.5.5')['code']);
        $wrong = 0;
        while (Feedback::powValid($token, (string) $wrong, 8)) {
            $wrong++;
        }
        $this->assertSame('pow', $f->submit(['type' => 'idea', 'message' => 'wrong work', 'token' => $token, 'pow' => (string) $wrong], '5.5.5.5')['code']);
        $nonce = 0;
        while (!Feedback::powValid($token, (string) $nonce, 8)) {
            $nonce++;
        }
        $ok = $f->submit(['type' => 'idea', 'message' => 'work done', 'token' => $token, 'pow' => (string) $nonce], '5.5.5.5');
        $this->assertTrue($ok['ok']);
        $again = $f->submit(['type' => 'idea', 'message' => 'replayed token', 'token' => $token, 'pow' => (string) $nonce], '5.5.5.5');
        $this->assertSame('pow', $again['code'], 'a token works once');
        $this->assertSame(8, $f->powBits(), 'visitors are asked for 8 bits here');
        $this->signIn();
        $this->assertSame(0, $f->powBits(), 'signed-in users are not asked');
        $this->assertTrue($f->submit(['type' => 'idea', 'message' => 'signed in no work', 'token' => $f->openToken(time() - 10)], '5.5.5.5')['ok']);
    }

    public function testSameMessageIsMergedNotDuplicated(): void
    {
        $f = $this->fb();
        $a = $f->submit($this->body($f), '1.1.1.1', 'site/index');
        $b = $f->submit($this->body($f), '1.1.1.1', 'site/index');
        $this->assertTrue($b['deduped']);
        $this->assertSame($a['id'], $b['id']);
    }

    public function testSnapshotNeedsConsentAndIsMasked(): void
    {
        $f = $this->fb();
        $snap = [
            'messages' => ['Mail to jane@example.com failed'],
            'forms' => [['id' => 'f', 'fields' => [
                ['name' => 'title', 'label' => 'Title', 'type' => 'text', 'value' => 'Hello', 'error' => ''],
                ['name' => 'card_number', 'label' => 'Card', 'type' => 'text', 'value' => '4111 1111 1111 1111'],
                ['name' => 'pw', 'label' => 'Password', 'type' => 'password', 'value' => 'secret'],
                ['name' => 'note', 'label' => 'Note', 'type' => 'text', 'value' => 'call 4111111111111111 now'],
            ]]],
            'tables' => [['caption' => 'Orders', 'headers' => ['id'], 'rows' => [['1'], ['2']]]],
        ];
        $none = $f->submit($this->body($f, ['type' => 'error', 'snapshot' => $snap]));
        $this->assertNull($f->snapshot($none['id']), 'no consent, no snapshot');
        $this->assertNull($f->find($none['id'])['snapshot_consent_at']);

        $yes = $f->submit($this->body($f, ['type' => 'error', 'message' => 'with consent', 'snapshot' => $snap, 'snapshot_consent' => 1, 'snapshot_parts' => ['messages', 'forms']]));
        $stored = $f->snapshot($yes['id']);
        $this->assertSame(['Mail to jane@example.com failed'], $stored['messages'], 'emails are kept by default: the admin sees them in contact forms anyway');
        $values = array_column($stored['forms'][0]['fields'], 'value', 'name');
        $this->assertSame('Hello', $values['title']);
        $this->assertSame('••••', $values['card_number'], 'sensitive field names are masked');
        $this->assertArrayNotHasKey('pw', $values, 'password fields are never kept');
        $this->assertSame('call [number] now', $values['note']);
        $this->assertSame([], $stored['tables'], 'a part the user unticked is not stored');
        $this->assertNotNull($f->find($yes['id'])['snapshot_consent_at']);
        $this->assertSame(Feedback::CONSENT_VERSION, $f->find($yes['id'])['snapshot_consent_ver']);
    }

    public function testEmailMaskingCanBeSwitchedOn(): void
    {
        $f = $this->fb(['maskEmails' => true]);
        $id = $f->submit($this->body($f, ['type' => 'error', 'snapshot_consent' => 1, 'snapshot_parts' => ['messages', 'forms'], 'snapshot' => [
            'messages' => ['Mail to jane@example.com failed'],
            'forms' => [['fields' => [['name' => 'contact', 'label' => 'Contact', 'type' => 'email', 'value' => 'jane@example.com']]]],
        ]]))['id'];
        $s = $f->snapshot($id);
        $this->assertSame(['Mail to [email] failed'], $s['messages']);
        $this->assertSame('[email]', $s['forms'][0]['fields'][0]['value']);
    }

    public function testReportNeverStoresSnapshot(): void
    {
        $f = $this->fb();
        $r = $f->submit($this->body($f, ['type' => 'report', 'email' => 'a@b.co', 'snapshot_consent' => 1, 'snapshot_parts' => ['messages'], 'snapshot' => ['messages' => ['x here']]]));
        $this->assertNull($f->snapshot($r['id']));
    }

    public function testContextIsOnlyKeptWhenTechnicalDetailsAreOn(): void
    {
        $f = $this->fb();
        $ctx = ['ua' => 'UA', 'viewport' => [800, 600], 'errors' => ['TypeError x'], 'failed' => [['method' => 'get', 'url' => '/api/x?token=1', 'status' => 500]], 'picked' => ['selector' => 'div.a', 'outline' => '<div>', 'rect' => [1, 2, 3, 4]]];
        $off = $f->submit($this->body($f, ['context' => $ctx]));
        $this->assertNull($f->find($off['id'])['context']);
        $on = $f->submit($this->body($f, ['message' => 'second with details', 'tech' => true, 'context' => $ctx]));
        $c = json_decode($f->find($on['id'])['context'], true);
        $this->assertSame('/api/x', $c['failed'][0]['url'], 'query strings are cut');
        $this->assertSame('div.a', $c['picked']['selector']);
    }

    public function testCountsPerStatus(): void
    {
        $f = $this->fb();
        $a = $f->submit($this->body($f, ['message' => 'first one here']))['id'];
        $f->submit($this->body($f, ['message' => 'second one here']));
        $f->update($a, 1, 'resolved', null);
        $this->assertEqualsCanonicalizing(['resolved' => 1, 'new' => 1], $f->counts());
        $this->assertSame(1, $f->counts()['new']);
        $this->assertSame(2, array_sum($f->counts()));
    }

    public function testInboxViewsRenderWithoutWarnings(): void
    {
        $f = $this->fb();
        $this->signIn();
        $snap = ['messages' => ['Oops <b>x</b>'], 'forms' => [['id' => 'f', 'fields' => [['name' => 'a', 'label' => 'A', 'type' => 'text', 'value' => '<script>1</script>', 'error' => 'bad']]]], 'tables' => [['caption' => 'T', 'headers' => ['h'], 'rows' => [['c']]]]];
        $id = $f->submit($this->body($f, ['type' => 'error', 'message' => 'Broken <script>alert(1)</script>', 'snapshot_consent' => 1, 'snapshot_parts' => ['messages', 'forms', 'tables'], 'snapshot' => $snap, 'tech' => true, 'context' => ['ua' => 'UA', 'errors' => ['E'], 'failed' => [['method' => 'GET', 'url' => '/x', 'status' => 500]], 'picked' => ['selector' => 'a', 'outline' => '<a>']]]))['id'];
        $f->addNote($id, 'note', 'internal');
        set_error_handler(static function (int $no, string $str): bool {
            throw new \ErrorException($str, 0, $no);
        });
        try {
            $module = new \rapttor\yii2feedback\backend\Module('feedback');
            $controller = new \rapttor\yii2feedback\backend\controllers\DefaultController('default', $module);
            Yii::$app->controller = $controller;
            $view = Yii::$app->view;
            $base = dirname(__DIR__) . '/src/backend/views/default/';
            $rows = (new \yii\db\Query())->from($f->table)->all(Yii::$app->db);
            $index = $view->renderFile($base . 'index.php', ['rows' => $rows, 'pages' => new \yii\data\Pagination(['totalCount' => 1, 'route' => 'feedback']), 'counts' => $f->counts(), 'apps' => ['test'], 'types' => array_keys($f->types), 'status' => '', 'type' => '', 'app' => '', 'q' => ''], $controller);
            $detail = $view->renderFile($base . 'view.php', ['row' => $f->find($id), 'snapshot' => $f->snapshot($id), 'notes' => $f->notes($id), 'canReply' => true], $controller);
        } finally {
            Yii::$app->controller = null;
            restore_error_handler();
        }
        $this->assertStringContainsString('1 total', $index);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $index . $detail, 'user text is encoded');
        $this->assertStringContainsString('&lt;script&gt;', $detail);
        $this->assertStringContainsString('consented', $detail);
    }

    public function testStatusUpdateChecksRevision(): void
    {
        $f = $this->fb();
        $id = $f->submit($this->body($f))['id'];
        $this->assertTrue($f->update($id, 1, 'resolved', 2, 'admin'));
        $this->assertFalse($f->update($id, 1, 'closed', null), 'stale revision is refused');
        $row = $f->find($id);
        $this->assertSame('resolved', $row['status']);
        $this->assertNotNull($row['resolved_at']);
        $this->assertSame('event', $f->notes($id)[0]['kind']);
    }

    public function testReplyMailsInSenderLanguageAndRecordsNote(): void
    {
        $f = $this->fb();
        $this->signIn();
        $id = $f->submit($this->body($f, ['lang' => 'sh']), '', 'site/x')['id'];
        $this->assertTrue($f->reply($id, 'Thanks, fixed.', 'admin'));
        $this->assertSame('reply', $f->notes($id)[0]['kind']);
        $files = glob(sys_get_temp_dir() . '/feedback-mail/*');
        $this->assertNotEmpty($files);
        $this->assertStringContainsString('Zdravo, hvala na povratnoj', file_get_contents(end($files)));
    }

    public function testReplyWithoutSenderOrAddressFailsCleanly(): void
    {
        $f = $this->fb(['replyFrom' => null]);
        $id = $f->submit($this->body($f, ['email' => 'a@b.co']))['id'];
        $this->assertFalse($f->reply($id, 'Hi'), 'no From configured: false, not an exception');
        $f2 = $this->fb();
        $id2 = $f2->submit($this->body($f2))['id'];
        $this->assertFalse($f2->reply($id2, 'Hi'), 'anonymous sender without email');
    }

    public function testAccountExportAnonymiseDeleteAndPurge(): void
    {
        $f = $this->fb(['snapshotDays' => 30]);
        $this->signIn();
        $snap = ['messages' => ['err here']];
        $id = $f->submit($this->body($f, ['type' => 'error', 'snapshot_consent' => 1, 'snapshot_parts' => ['messages'], 'snapshot' => $snap]))['id'];
        $this->assertCount(1, $f->export('profile', 7));
        $this->assertNotNull($f->export('profile', 7)[0]['snapshot']);
        $this->assertSame([], $f->export('profile', 8));

        $this->assertSame(['snapshots' => 0, 'messages' => 0], $f->purge(time()));
        $this->assertSame(1, $f->purge(time() + 31 * 86400)['snapshots']);
        $this->assertNull($f->snapshot($id));

        $this->assertSame(1, $f->anonymiseProfile(7));
        $this->assertNull($f->find($id)['profile_id']);
        $this->assertNotNull($f->find($id), 'the product feedback stays');
        $this->assertSame(0, $f->deleteProfile(7));
    }

    public function testLanguageResolutionAndMessages(): void
    {
        $this->assertSame('sh', Languages::resolve('sr-Latn-RS'));
        $this->assertSame('sh', Languages::resolve('hr'));
        $this->assertSame('de', Languages::resolve('de_AT'));
        $this->assertSame('zh-Hans', Languages::resolve('zh-CN'));
        $this->assertSame('pt-BR', Languages::resolve('pt'));
        $this->assertSame('es-MX', Languages::resolve('es-MX'));
        $this->assertSame('es', Languages::resolve('es-AR'));
        $this->assertSame('en', Languages::resolve('xx'));
        $this->assertSame('rtl', Languages::dir('ar'));
        $this->assertSame('Pošalji', Messages::t('send', 'hr'));
        $this->assertSame('0 of 5', Messages::t('field.rating.star', 'en', ['n' => 0]) === '0 of 5' ? '0 of 5' : 'bad');
    }

    public function testEveryLanguageHasEveryKeyAndPlaceholder(): void
    {
        $en = require dirname(__DIR__) . '/src/messages/en.php';
        foreach (Languages::codes() as $code) {
            $file = dirname(__DIR__) . "/src/messages/$code.php";
            $this->assertFileExists($file, $code);
            $t = require $file;
            if ($code === 'es-MX') {
                $this->assertEmpty(array_diff(array_keys($t), array_keys($en)), 'es-MX has only known keys');
                continue;
            }
            $this->assertSame(array_keys($en), array_keys($t), "$code has the same keys as en");
            foreach ($en as $k => $v) {
                preg_match_all('/\{\w+\}/', $v, $a);
                preg_match_all('/\{\w+\}/', $t[$k], $b);
                $this->assertEmpty(array_diff($a[0], $b[0]), "$code keeps placeholders in $k");
            }
        }
    }

    public function testBalkanTextsHaveNoBannedNationalMarkers(): void
    {
        $t = implode(' ', require dirname(__DIR__) . '/src/messages/sh.php');
        foreach (['datoteka', 'sustav', 'otpremam', 'učitavam', 'šaljem'] as $bad) {
            $this->assertStringNotContainsStringIgnoringCase($bad, $t, $bad);
        }
    }

    public function testHiddenRoutesOnlyHideTheButton(): void
    {
        $f = $this->fb(['hiddenRoutes' => ['shop/checkout*'], 'excludeRoutes' => ['admin/*']]);
        $this->assertTrue($f->routeHidden('shop/checkout-step'));
        $this->assertFalse($f->routeExcluded('shop/checkout-step'), 'hidden is not excluded: the link still works');
        $this->assertTrue($f->routeExcluded('admin/users'));
        $this->assertTrue($f->routeExcluded('feedback/submit'), 'its own routes are always out');
        $this->assertFalse($f->routeHidden('site/index'));
    }

    public function testRouteExclusion(): void
    {
        $f = $this->fb();
        $this->assertFalse($f->routeExcluded('legal/privacy'), 'the widget is site-wide, legal pages included');
        $this->assertTrue($f->routeExcluded('feedback/submit'));
        $this->assertFalse($f->routeExcluded('site/login'), 'people who cannot sign in must be able to report it');
        $this->assertFalse($f->routeExcluded('site/index'));
    }
}

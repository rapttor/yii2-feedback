<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

use Yii;
use yii\base\Component;
use yii\db\Connection;
use yii\db\Query;

/**
 * `Yii::$app->feedback`: stores what users send (message, optional rating, optional consented page snapshot) and answers it.
 * Register in web AND console config, see README.md.
 */
class Feedback extends Component
{
    public const EVENT_CREATED = 'created';
    public const EVENT_STATUS = 'status';
    public const EVENT_REPORT = 'report';

    public const STATUSES = ['new', 'triaged', 'in_progress', 'waiting_user', 'resolved', 'closed', 'duplicate', 'wontfix'];

    /** Version of the wording of the screen-data consent; raise it when the texts change meaning. */
    public const CONSENT_VERSION = '1';

    /** Shared by every Rapttor app on this database. */
    public string $table = 'rapttor_feedback';
    public string $noteTable = 'rapttor_feedback_note';
    public string $snapshotTable = 'rapttor_feedback_snapshot';
    public string $db = 'db';

    /** Which app sends (several apps may share the tables). */
    public string $app = 'app';

    /** Server secret for IP hashes and the open token; defaults to the request's cookieValidationKey. */
    public ?string $secret = null;

    /**
     * Types and their options. Keys of `subtypes` are translated as `sub.<type>.<subtype>`.
     * rating: stars shown; picker: "point at the problem"; snapshot: screen data may be offered; emailRequired: for anonymous senders.
     */
    public array $types = [
        'error' => ['subtypes' => ['not_working', 'page_load', 'wrong_result', 'slow', 'display', 'other'], 'rating' => false, 'picker' => true, 'snapshot' => true, 'emailRequired' => false, 'priority' => 1],
        'idea' => ['subtypes' => ['new_feature', 'improve', 'other'], 'rating' => true, 'picker' => false, 'snapshot' => true, 'emailRequired' => false, 'priority' => 0],
        'report' => ['subtypes' => ['infringement', 'dmca', 'picture', 'offensive', 'other'], 'rating' => false, 'picker' => false, 'snapshot' => false, 'emailRequired' => true, 'priority' => 3],
        'other' => ['subtypes' => [], 'rating' => true, 'picker' => false, 'snapshot' => true, 'emailRequired' => false, 'priority' => 0],
    ];

    /** Limits per sender: hour/day for signed-in users, anon_* for visitors. null = off in development only. */
    public ?bool $limitsEnabled = null;
    public array $limits = ['hour' => 10, 'day' => 30, 'anon_hour' => 3, 'anon_day' => 10];
    /**
     * Proof of work for visitors who are not signed in: the browser must find a nonce so that sha256(token:nonce) starts with this many
     * zero bits (about 2^bits tries: ~0.2 s at 18 on a laptop, a few seconds on a phone, solved while the person types). Makes scripted floods costly without an external CAPTCHA. 0 = off. Off in development.
     */
    public int $proofOfWork = 18;
    /** Seconds the dialog must have been open before sending (bots send at once). */
    public int $minSeconds = 3;

    /** Mask email addresses inside the screen data. Off: the admin sees emails in contact forms anyway. Turn on for public use. Passwords, token/secret/card fields and card-like numbers are always masked. */
    public bool $maskEmails = false;
    /** all = capture everything not masked; marked = only inside data-feedback-capture. */
    public string $captureMode = 'all';
    /** auto = dropdown only when the app has no language of its own; always; never. */
    public string $languageSelector = 'auto';
    /** Show the button to visitors who are not signed in (they can leave an email; limits are stricter). */
    public bool $guests = true;
    /** Routes (patterns with *) where only the floating button is hidden; menu links and Feedback.open() still work there. */
    public array $hiddenRoutes = [];
    /** Routes (patterns with *) where the widget is not offered at all (no button, no dialog, no links).
    public array $excludeRoutes = ['feedback/*'];
    /** Preference cookie holding the "button closed" flag and its position. */
    public string $cookie = 'rapttor_fb';
    /** Free text added to every row's technical details (a version or release tag). */
    public string $release = '';

    /** Days to keep the page snapshot; 0 = forever. */
    public int $snapshotDays = 30;
    /** Days to keep messages; 0 = forever. */
    public int $messageDays = 0;

    /** Who is signed in: string|int|null. Defaults to the web user component. */
    public $profileResolver;
    /** function(string|int|null $profileId): string  -> beta | customer. Default beta. */
    public $audienceResolver;
    /** function(string $profileId): ?string  -> email address for replies. Default: identity class' `email` attribute. */
    public $emailResolver;
    /** Sender of reply emails; null = the mailer's default / params['senderEmail']. */
    public string|array|null $replyFrom = null;

    /** function(): ?string  -> the language of the app for this request. Default: the `legal` component's language when present, else Yii::$app->language. */
    public $languageResolver;

    /** Supported language code for this request. */
    public function language(): string
    {
        if ($this->languageResolver) {
            return Languages::resolve(($this->languageResolver)());
        }
        if (Yii::$app->has('legal') && method_exists(Yii::$app->get('legal'), 'currentLanguage')) {
            return Languages::resolve(Yii::$app->get('legal')->currentLanguage());
        }
        return Languages::resolve(Yii::$app->language);
    }

    /** True when the visitor already picked a language in the app's own switcher (then the dialog needs no dropdown). */
    public function appHasLanguageChoice(): bool
    {
        if (Yii::$app->has('legal') && method_exists(Yii::$app->get('legal'), 'visitorLanguage')) {
            return Yii::$app->get('legal')->visitorLanguage() !== null;
        }
        return !empty(Yii::$app->params['languageSelected']);
    }

    public function connection(): Connection
    {
        return Yii::$app->get($this->db);
    }

    // ---------- widget side ----------

    public function profileId(): string|int|null
    {
        if ($this->profileResolver) {
            return ($this->profileResolver)();
        }
        return Yii::$app->has('user') && !Yii::$app->user->isGuest ? Yii::$app->user->id : null;
    }

    public function routeExcluded(string $route): bool
    {
        return $this->routeMatches([...$this->excludeRoutes, 'feedback/*'], $route);
    }

    public function routeHidden(string $route): bool
    {
        return $this->routeMatches($this->hiddenRoutes, $route);
    }

    private function routeMatches(array $patterns, string $route): bool
    {
        foreach ($patterns as $pattern) {
            if (fnmatch($pattern, trim($route, '/'))) {
                return true;
            }
        }
        return false;
    }

    /** Signed token proving the dialog was opened at $time. */
    public function openToken(?int $time = null): string
    {
        $t = $time ?? time();
        $r = bin2hex(random_bytes(6));
        return $t . '.' . $r . '.' . hash_hmac('sha256', 'open|' . $t . '|' . $r, $this->key());
    }

    public function tokenAge(string $token): ?int
    {
        [$t, $r, $sig] = array_pad(explode('.', $token, 3), 3, '');
        if (!ctype_digit($t) || !ctype_xdigit($r) || !hash_equals(hash_hmac('sha256', 'open|' . $t . '|' . $r, $this->key()), $sig)) {
            return null;
        }
        return time() - (int) $t;
    }

    /** Proof of work asked from this visitor: bits, or 0 when not needed. */
    public function powBits(): int
    {
        return $this->profileId() === null && $this->limitsOn() ? max(0, $this->proofOfWork) : 0;
    }

    public static function powValid(string $token, string $nonce, int $bits): bool
    {
        if ($bits <= 0) {
            return true;
        }
        if ($nonce === '' || strlen($nonce) > 20 || !ctype_digit($nonce)) {
            return false;
        }
        $hash = hash('sha256', $token . ':' . $nonce, true);
        $zeros = 0;
        foreach (str_split($hash) as $byte) {
            $b = ord($byte);
            if ($b === 0) {
                $zeros += 8;
                continue;
            }
            $zeros += 7 - (int) floor(log($b, 2));
            break;
        }
        return $zeros >= $bits;
    }

    /** What the widget needs to draw itself in $language. */
    public function clientConfig(string $language): array
    {
        $lang = Languages::resolve($language);
        $types = [];
        foreach ($this->types as $name => $def) {
            $types[] = [
                'type' => $name,
                'label' => Messages::t('type.' . $name, $lang),
                'hint' => Messages::t('type.' . $name . '.hint', $lang),
                'subtypes' => array_map(static fn (string $s) => ['value' => $s, 'label' => Messages::t('sub.' . $name . '.' . $s, $lang)], $def['subtypes']),
                'rating' => (bool) $def['rating'],
                'picker' => (bool) $def['picker'],
                'snapshot' => (bool) $def['snapshot'],
                'emailRequired' => (bool) $def['emailRequired'],
            ];
        }
        return [
            'lang' => $lang,
            'dir' => Languages::dir($lang),
            'strings' => Messages::all($lang),
            'types' => $types,
            'token' => $this->openToken(),
            'pow' => $this->powBits(),
            'captureMode' => $this->captureMode,
            'maskEmails' => $this->maskEmails,
            'signedIn' => $this->profileId() !== null,
        ];
    }

    // ---------- storing ----------

    /**
     * @param array<string, mixed> $in decoded JSON from the widget
     * @return array{ok: bool, code?: string, id?: int, uid?: string, deduped?: bool, retryAfter?: int}
     */
    public function submit(array $in, string $ip = '', string $route = ''): array
    {
        $now = time();
        $type = (string) ($in['type'] ?? '');
        if (!isset($this->types[$type])) {
            return ['ok' => false, 'code' => 'type'];
        }
        $def = $this->types[$type];
        if (trim((string) ($in['website'] ?? '')) !== '') {   // honeypot
            return ['ok' => true, 'id' => 0, 'uid' => '', 'deduped' => true];
        }
        $age = $this->tokenAge((string) ($in['token'] ?? ''));
        if ($age === null || $age > 7200) {
            return ['ok' => false, 'code' => 'token'];
        }
        if ($this->limitsOn() && $age < $this->minSeconds) {
            return ['ok' => false, 'code' => 'fast'];
        }
        $bits = $this->powBits();
        if ($bits > 0) {
            $used = 'feedback-pow-' . sha1((string) $in['token']);
            if (!self::powValid((string) $in['token'], (string) ($in['pow'] ?? ''), $bits) || (Yii::$app->has('cache') && Yii::$app->cache->get($used))) {
                return ['ok' => false, 'code' => 'pow'];
            }
            if (Yii::$app->has('cache')) {
                Yii::$app->cache->set($used, 1, 7300);   // one token, one submission
            }
        }
        $message = Sanitizer::text($in['message'] ?? '', 4000);
        if (mb_strlen($message) < 3) {
            return ['ok' => false, 'code' => 'message'];
        }
        $profile = $this->profileId();
        $email = Sanitizer::text($in['email'] ?? '', 190);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'code' => 'email'];
        }
        if ($profile !== null) {
            $email = '';   // read from the profile when replying; never copied
        } elseif ($def['emailRequired'] && $email === '') {
            return ['ok' => false, 'code' => 'email'];
        }
        $subtype = Sanitizer::text($in['subtype'] ?? '', 32);
        if ($subtype !== '' && !in_array($subtype, $def['subtypes'], true)) {
            $subtype = '';
        }
        $rating = $def['rating'] && (int) ($in['rating'] ?? 0) >= 1 ? min(5, (int) $in['rating']) : null;

        $ipHash = $ip !== '' ? hash_hmac('sha256', 'ip|' . $ip, $this->key()) : null;
        $retry = $this->limitExceeded($profile, $ipHash, $now);
        if ($retry !== null) {
            return ['ok' => false, 'code' => 'limit', 'retryAfter' => $retry];
        }

        $fingerprint = sha1($type . '|' . $route . '|' . preg_replace('/\d+/', '0', mb_strtolower(mb_substr($message, 0, 200))));
        $same = (new Query())->select('id, uid')->from($this->table)->where(['fingerprint' => $fingerprint])
            ->andWhere($profile !== null ? ['profile_id' => (string) $profile] : ['ip_hash' => $ipHash])
            ->andWhere(['>', 'created_at', $now - 86400])->one($this->connection());
        if ($same) {
            return ['ok' => true, 'id' => (int) $same['id'], 'uid' => $same['uid'], 'deduped' => true];
        }

        $context = !empty($in['tech']) ? Sanitizer::context(is_array($in['context'] ?? null) ? $in['context'] : []) : [];
        if ($context !== []) {
            $context['release'] = $context['release'] ?: $this->release;
        }
        $snapshot = null;
        $consent = !empty($in['snapshot_consent']) && $def['snapshot'];
        if ($consent && is_array($in['snapshot'] ?? null)) {
            $parts = array_values(array_intersect(array_map('strval', (array) ($in['snapshot_parts'] ?? [])), ['messages', 'forms', 'tables']));
            $snapshot = Sanitizer::snapshot($in['snapshot'], $parts, $this->maskEmails);
            if ($snapshot === ['messages' => [], 'forms' => [], 'tables' => []]) {
                $snapshot = null;
            }
        }
        $json = $snapshot !== null ? json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) : null;
        if ($json !== null && strlen($json) > 120000) {
            $json = null;
        }

        $db = $this->connection();
        $row = [
            'uid' => bin2hex(random_bytes(10)),
            'app' => $this->app,
            'type' => $type,
            'subtype' => $subtype !== '' ? $subtype : null,
            'message' => $message,
            'rating' => $rating,
            'profile_id' => $profile !== null ? (string) $profile : null,
            'email' => $email !== '' ? $email : null,
            'route' => Sanitizer::text($route, 190) ?: null,
            'url' => Sanitizer::path($in['url'] ?? '') ?: null,
            'context' => $context !== [] ? json_encode($context, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) : null,
            'audience' => $this->audience($profile),
            'locale' => Languages::resolve((string) ($in['lang'] ?? '')),
            'status' => 'new',
            'priority' => (int) $def['priority'],
            'fingerprint' => $fingerprint,
            'ip_hash' => $ipHash,
            'snapshot_consent_at' => $json !== null ? $now : null,
            'snapshot_consent_ver' => $json !== null ? self::CONSENT_VERSION : null,
            'rev' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $db->createCommand()->insert($this->table, $row)->execute();
        $id = (int) $db->getLastInsertID();
        if ($json !== null) {
            $db->createCommand()->insert($this->snapshotTable, ['feedback_id' => $id, 'data' => $json, 'created_at' => $now])->execute();
        }
        $event = new FeedbackEvent(['feedbackId' => $id, 'row' => $row]);
        $this->trigger(self::EVENT_CREATED, $event);
        if ($type === 'report') {
            $this->trigger(self::EVENT_REPORT, $event);
        }
        return ['ok' => true, 'id' => $id, 'uid' => $row['uid']];
    }

    // ---------- reading and managing ----------

    public function find(int $id): ?array
    {
        $row = (new Query())->from($this->table)->where(['id' => $id])->one($this->connection());
        return $row ?: null;
    }

    /** The only reader of snapshots. Returns null when none was consented to or it has been purged. */
    public function snapshot(int $id): ?array
    {
        $data = (new Query())->select('data')->from($this->snapshotTable)->where(['feedback_id' => $id])->scalar($this->connection());
        return $data ? json_decode((string) $data, true) : null;
    }

    /** Rows per status, for the inbox tabs. @return array<string, int> */
    public function counts(): array
    {
        $rows = (new Query())->select(['status', 'n' => 'COUNT(*)'])->from($this->table)->groupBy('status')->all($this->connection());
        $out = [];
        foreach ($rows as $r) {
            $out[$r['status']] = (int) $r['n'];
        }
        return $out;
    }

    public function notes(int $id): array
    {
        return (new Query())->from($this->noteTable)->where(['feedback_id' => $id])->orderBy(['id' => SORT_ASC])->all($this->connection());
    }

    public function addNote(int $id, string $kind, string $body, string|int|null $author = null): void
    {
        $this->connection()->createCommand()->insert($this->noteTable, [
            'feedback_id' => $id,
            'author_id' => $author !== null ? (string) $author : null,
            'kind' => $kind,
            'body' => Sanitizer::text($body, 8000),
            'created_at' => time(),
        ])->execute();
    }

    /** Changes status and priority with a revision check. False when someone else changed the row meanwhile. */
    public function update(int $id, int $rev, ?string $status, ?int $priority, string|int|null $author = null): bool
    {
        $row = $this->find($id);
        if (!$row || (int) $row['rev'] !== $rev) {
            return false;
        }
        $set = ['rev' => $rev + 1, 'updated_at' => time()];
        if ($status !== null && in_array($status, self::STATUSES, true) && $status !== $row['status']) {
            $set['status'] = $status;
            $set['resolved_at'] = in_array($status, ['resolved', 'closed', 'duplicate', 'wontfix'], true) ? time() : null;
        }
        if ($priority !== null) {
            $set['priority'] = max(0, min(3, $priority));
        }
        $n = $this->connection()->createCommand()->update($this->table, $set, ['id' => $id, 'rev' => $rev])->execute();
        if ($n && isset($set['status'])) {
            $this->addNote($id, 'event', 'status: ' . $row['status'] . ' -> ' . $set['status'], $author);
            $this->trigger(self::EVENT_STATUS, new FeedbackEvent(['feedbackId' => $id, 'row' => $set]));
        }
        return (bool) $n;
    }

    /** Email to answer to: the typed one, or the signed-in profile's. */
    public function recipient(array $row): ?string
    {
        if (!empty($row['email'])) {
            return $row['email'];
        }
        if ($row['profile_id'] === null) {
            return null;
        }
        if ($this->emailResolver) {
            return ($this->emailResolver)((string) $row['profile_id']);
        }
        $class = Yii::$app->has('user') ? Yii::$app->user->identityClass : null;
        $user = $class ? $class::findIdentity($row['profile_id']) : null;
        return $user && !empty($user->email) ? (string) $user->email : null;
    }

    /** Sends the answer by email in the sender's language and records it as a `reply` note. */
    public function reply(int $id, string $body, string|int|null $author = null): bool
    {
        $row = $this->find($id);
        $to = $row ? $this->recipient($row) : null;
        $body = Sanitizer::text($body, 8000);
        if (!$row || !$to || $body === '') {
            return false;
        }
        $lang = (string) ($row['locale'] ?: 'en');
        $quoted = "> " . str_replace("\n", "\n> ", mb_substr((string) $row['message'], 0, 600));
        $text = Messages::t('reply.intro', $lang) . "\n\n" . $quoted . "\n\n" . $body . "\n\n" . Messages::t('reply.sign', $lang) . "\n" . Yii::$app->name;
        $mail = Yii::$app->mailer->compose()->setTo($to)->setSubject(Messages::t('reply.subject', $lang))->setTextBody($text);
        $from = $this->replyFrom ?? Yii::$app->params['senderEmail'] ?? Yii::$app->params['supportEmail'] ?? Yii::$app->params['adminEmail'] ?? null;
        if ($from) {
            $mail->setFrom($from);
        }
        try {
            if (!$mail->send()) {
                return false;
            }
        } catch (\Throwable $e) {   // no From configured, transport down: the admin sees "could not send"
            Yii::warning('feedback reply failed: ' . $e->getMessage(), __METHOD__);
            return false;
        }
        $this->addNote($id, 'reply', $body, $author);
        return true;
    }

    // ---------- accounts, retention ----------

    /** Data access request: everything stored for one profile. */
    public function export(string $remoteTable, string|int $id): array
    {
        if ($remoteTable !== 'profile') {
            return [];
        }
        $rows = (new Query())->from($this->table)->where(['profile_id' => (string) $id])->all($this->connection());
        foreach ($rows as &$r) {
            $r['snapshot'] = $this->snapshot((int) $r['id']);
            $r['notes'] = array_values(array_filter($this->notes((int) $r['id']), static fn (array $n) => $n['kind'] === 'reply'));
        }
        return $rows;
    }

    /** Account deletion: keep the product feedback, drop the person and the screen data. */
    public function anonymiseProfile(string|int $id): int
    {
        $db = $this->connection();
        $ids = (new Query())->select('id')->from($this->table)->where(['profile_id' => (string) $id])->column($db);
        if ($ids) {
            $db->createCommand()->delete($this->snapshotTable, ['feedback_id' => $ids])->execute();
        }
        return $db->createCommand()->update($this->table, ['profile_id' => null, 'email' => null, 'ip_hash' => null, 'snapshot_consent_at' => null, 'snapshot_consent_ver' => null, 'updated_at' => time()], ['profile_id' => (string) $id])->execute();
    }

    public function deleteProfile(string|int $id): int
    {
        $db = $this->connection();
        $ids = (new Query())->select('id')->from($this->table)->where(['profile_id' => (string) $id])->column($db);
        if ($ids) {
            $db->createCommand()->delete($this->snapshotTable, ['feedback_id' => $ids])->execute();
            $db->createCommand()->delete($this->noteTable, ['feedback_id' => $ids])->execute();
        }
        return $db->createCommand()->delete($this->table, ['profile_id' => (string) $id])->execute();
    }

    /** Retention. @return array{snapshots: int, messages: int} */
    public function purge(?int $now = null): array
    {
        $now ??= time();
        $db = $this->connection();
        $out = ['snapshots' => 0, 'messages' => 0];
        if ($this->snapshotDays > 0) {
            $out['snapshots'] = $db->createCommand()->delete($this->snapshotTable, ['<', 'created_at', $now - $this->snapshotDays * 86400])->execute();
        }
        if ($this->messageDays > 0) {
            $ids = (new Query())->select('id')->from($this->table)->where(['<', 'created_at', $now - $this->messageDays * 86400])->column($db);
            if ($ids) {
                $db->createCommand()->delete($this->snapshotTable, ['feedback_id' => $ids])->execute();
                $db->createCommand()->delete($this->noteTable, ['feedback_id' => $ids])->execute();
                $out['messages'] = $db->createCommand()->delete($this->table, ['id' => $ids])->execute();
            }
        }
        return $out;
    }

    // ---------- internals ----------

    private function key(): string
    {
        if ($this->secret !== null && $this->secret !== '') {
            return $this->secret;
        }
        $key = Yii::$app->has('request') && method_exists(Yii::$app->request, 'getCookieValidationKey') ? Yii::$app->request->cookieValidationKey : '';
        return (string) ($key ?: 'feedback');
    }

    public function limitsOn(): bool
    {
        return $this->limitsEnabled ?? !(defined('YII_ENV_DEV') && YII_ENV_DEV);
    }

    private function audience(string|int|null $profile): string
    {
        if ($profile === null) {
            return 'anonymous';
        }
        return $this->audienceResolver ? (string) ($this->audienceResolver)($profile) : 'beta';
    }

    /** Seconds to wait, or null when the sender is within the limits. */
    private function limitExceeded(string|int|null $profile, ?string $ipHash, int $now): ?int
    {
        if (!$this->limitsOn()) {
            return null;
        }
        $anon = $profile === null;
        $who = $anon ? ['ip_hash' => $ipHash] : ['profile_id' => (string) $profile];
        if ($anon && $ipHash === null) {
            return null;
        }
        $checks = [[3600, $this->limits[$anon ? 'anon_hour' : 'hour']], [86400, $this->limits[$anon ? 'anon_day' : 'day']]];
        foreach ($checks as [$window, $max]) {
            $q = (new Query())->from($this->table)->where($who)->andWhere(['>', 'created_at', $now - $window]);
            if ((int) $q->count('*', $this->connection()) >= $max) {
                return intdiv($window, 4);
            }
        }
        return null;
    }
}

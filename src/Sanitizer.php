<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

/** Cleans everything the browser sends. The client masks too, but nothing it sends is trusted. */
final class Sanitizer
{
    /** Field names whose values are never kept. */
    private const SENSITIVE_NAME = '/pass|pwd|token|secret|card|cvv|cvc|iban|csrf|otp|\bpin\b|ssn|api[-_]?key|auth/i';

    public static function text(mixed $value, int $max): string
    {
        if (!is_scalar($value)) {
            return '';
        }
        $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value) ?? '';
        return mb_substr(trim($s), 0, $max);
    }

    /** Masks emails, card-like digit runs and long token-like strings. */
    public static function mask(string $s, bool $emails = true): string
    {
        if ($emails) {
            $s = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[email]', $s) ?? $s;
        }
        $s = preg_replace('/\b\d(?:[ \-]?\d){12,18}\b/', '[number]', $s) ?? $s;
        return preg_replace('/\b[A-Za-z0-9+\/_=\-]{40,}\b/', '[token]', $s) ?? $s;
    }

    public static function sensitiveName(string $name): bool
    {
        return (bool) preg_match(self::SENSITIVE_NAME, $name);
    }

    /** Path without query string or fragment. */
    public static function path(mixed $url, int $max = 500): string
    {
        $u = self::text($url, 2000);
        $u = preg_replace('/[?#].*$/', '', $u) ?? $u;
        return mb_substr($u, 0, $max);
    }

    /**
     * Technical details: browser, viewport, language, release, recent errors, failed requests, the picked element.
     *
     * @param array<string, mixed> $in
     * @return array<string, mixed>
     */
    public static function context(array $in): array
    {
        $out = [
            'ua' => self::text($in['ua'] ?? '', 250),
            'viewport' => [(int) ($in['viewport'][0] ?? 0), (int) ($in['viewport'][1] ?? 0)],
            'lang' => self::text($in['lang'] ?? '', 20),
            'theme' => self::text($in['theme'] ?? '', 40),
            'release' => self::text($in['release'] ?? '', 40),
            'errors' => [],
            'failed' => [],
        ];
        foreach (array_slice(is_array($in['errors'] ?? null) ? $in['errors'] : [], 0, 5) as $e) {
            $out['errors'][] = self::mask(self::text($e, 300));
        }
        foreach (array_slice(is_array($in['failed'] ?? null) ? $in['failed'] : [], 0, 5) as $f) {
            if (is_array($f)) {
                $out['failed'][] = ['method' => self::text($f['method'] ?? '', 10), 'url' => self::path($f['url'] ?? '', 300), 'status' => (int) ($f['status'] ?? 0)];
            }
        }
        if (is_array($in['picked'] ?? null)) {
            $p = $in['picked'];
            $out['picked'] = [
                'selector' => self::text($p['selector'] ?? '', 300),
                'outline' => self::text($p['outline'] ?? '', 300),
                'rect' => array_map('intval', array_slice(array_values((array) ($p['rect'] ?? [])), 0, 4)),
            ];
        }
        return $out;
    }

    /**
     * The page snapshot: messages, form values, tables. Only the parts the user kept are in $parts.
     *
     * @param array<string, mixed> $in
     * @param string[] $parts any of messages, forms, tables
     * @return array{messages: string[], forms: array, tables: array}
     */
    public static function snapshot(array $in, array $parts, bool $maskEmails = true): array
    {
        $out = ['messages' => [], 'forms' => [], 'tables' => []];
        if (in_array('messages', $parts, true)) {
            foreach (array_slice(is_array($in['messages'] ?? null) ? $in['messages'] : [], 0, 20) as $m) {
                $t = self::mask(self::text($m, 300), $maskEmails);
                if ($t !== '') {
                    $out['messages'][] = $t;
                }
            }
        }
        if (in_array('forms', $parts, true)) {
            foreach (array_slice(is_array($in['forms'] ?? null) ? $in['forms'] : [], 0, 5) as $form) {
                if (!is_array($form)) {
                    continue;
                }
                $fields = [];
                foreach (array_slice(is_array($form['fields'] ?? null) ? $form['fields'] : [], 0, 60) as $f) {
                    if (!is_array($f)) {
                        continue;
                    }
                    $name = self::text($f['name'] ?? '', 80);
                    $type = strtolower(self::text($f['type'] ?? 'text', 20));
                    if (in_array($type, ['password', 'hidden', 'file'], true)) {
                        continue;
                    }
                    $label = self::text($f['label'] ?? '', 120);
                    $value = self::sensitiveName($name) || self::sensitiveName($label) ? '••••' : self::mask(self::text($f['value'] ?? '', 500), $maskEmails);
                    $fields[] = ['name' => $name, 'label' => $label, 'type' => $type, 'value' => $value, 'error' => self::mask(self::text($f['error'] ?? '', 200), $maskEmails)];
                }
                $out['forms'][] = ['id' => self::text($form['id'] ?? '', 80), 'action' => self::path($form['action'] ?? '', 200), 'fields' => $fields];
            }
        }
        if (in_array('tables', $parts, true)) {
            foreach (array_slice(is_array($in['tables'] ?? null) ? $in['tables'] : [], 0, 5) as $t) {
                if (!is_array($t)) {
                    continue;
                }
                $headers = array_map(static fn ($h) => self::mask(self::text($h, 120), $maskEmails), array_slice(is_array($t['headers'] ?? null) ? $t['headers'] : [], 0, 15));
                $rows = [];
                foreach (array_slice(is_array($t['rows'] ?? null) ? $t['rows'] : [], 0, 20) as $r) {
                    $rows[] = array_map(static fn ($c) => self::mask(self::text($c, 200), $maskEmails), array_slice(is_array($r) ? $r : [], 0, 15));
                }
                $out['tables'][] = ['caption' => self::text($t['caption'] ?? '', 120), 'headers' => $headers, 'rows' => $rows];
            }
        }
        return $out;
    }
}

<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

/** UI texts per language. Missing keys fall back to the base language and then to English. */
final class Messages
{
    /** @var array<string, array<string, string>> */
    private static array $cache = [];

    /** @return array<string, string> */
    public static function all(string $language): array
    {
        $code = Languages::resolve($language);
        if (!isset(self::$cache[$code])) {
            $out = [];
            foreach (Languages::chain($code) as $c) {
                $file = __DIR__ . '/messages/' . $c . '.php';
                if (is_file($file)) {
                    $out = array_replace($out, require $file);
                }
            }
            self::$cache[$code] = $out;
        }
        return self::$cache[$code];
    }

    /** @param array<string, string|int> $params */
    public static function t(string $key, string $language, array $params = []): string
    {
        $text = self::all($language)[$key] ?? $key;
        $map = [];
        foreach ($params as $k => $v) {
            $map['{' . $k . '}'] = (string) $v;
        }
        return strtr($text, $map);
    }
}

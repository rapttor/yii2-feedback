<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

/**
 * The languages of the shared registry (rapttor.legal/i18n/languages.json) and the alias rules that map an app's language to one of them.
 * Bundled so this package needs no dependency on rapttor/legal.
 */
final class Languages
{
    public const NAMES = [
        'en' => 'English', 'sh' => 'Balkan', 'de' => 'Deutsch', 'fr' => 'Français', 'es' => 'Español', 'es-MX' => 'Español (México)',
        'pt-BR' => 'Português (Brasil)', 'it' => 'Italiano', 'pl' => 'Polski', 'nl' => 'Nederlands', 'tr' => 'Türkçe', 'sv' => 'Svenska',
        'ro' => 'Română', 'id' => 'Bahasa Indonesia', 'vi' => 'Tiếng Việt', 'uk' => 'Українська', 'ru' => 'Русский', 'ar' => 'العربية',
        'hi' => 'हिन्दी', 'ja' => '日本語', 'ko' => '한국어', 'zh-Hans' => '简体中文',
    ];

    public const RTL = ['ar'];

    /** @return string[] */
    public static function codes(): array
    {
        return array_keys(self::NAMES);
    }

    /** Maps any app language (sr-Latn-RS, de-AT, zh-CN, pt, ...) to a supported code; unknown languages give `en`. */
    public static function resolve(?string $language): string
    {
        $l = str_replace('_', '-', trim((string) $language));
        if ($l === '') {
            return 'en';
        }
        foreach (self::NAMES as $code => $_) {
            if (strcasecmp($code, $l) === 0) {
                return $code;
            }
        }
        $base = strtolower(explode('-', $l)[0]);
        if (in_array($base, ['sh', 'sr', 'hr', 'bs', 'cnr'], true)) {
            return 'sh';
        }
        if ($base === 'zh') {
            return 'zh-Hans';
        }
        if ($base === 'pt') {
            return 'pt-BR';
        }
        return isset(self::NAMES[$base]) ? $base : 'en';
    }

    /** Message files to merge, least specific first: en, base language, exact code. */
    public static function chain(string $code): array
    {
        $chain = ['en'];
        if (str_contains($code, '-') && isset(self::NAMES[explode('-', $code)[0]])) {
            $chain[] = explode('-', $code)[0];
        }
        $chain[] = $code;
        return array_values(array_unique($chain));
    }

    public static function dir(string $code): string
    {
        return in_array($code, self::RTL, true) ? 'rtl' : 'ltr';
    }
}

<?php

declare(strict_types=1);

/**
 * Exports the PHP message files for non-PHP use: src/widget/assets/i18n/<lang>.json (full texts per language, fallbacks merged)
 * and the English texts + default types inlined in feedback.js (between the @generated markers).
 *
 *   php tools/export-i18n.php          write the files
 *   php tools/export-i18n.php --check  exit 1 when they are out of date (the test suite runs this)
 */

$root = dirname(__DIR__);
require $root . '/src/Languages.php';
require $root . '/src/Messages.php';

use rapttor\yii2feedback\Languages;
use rapttor\yii2feedback\Messages;

$json = static fn (mixed $v): string => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";

$out = [];
foreach (Languages::codes() as $code) {
    $out[$root . '/src/widget/assets/i18n/' . $code . '.json'] = $json(Messages::all($code));
}
$out[$root . '/src/widget/assets/i18n/languages.json'] = $json(Languages::NAMES);

// default types: the property default of Feedback::$types, without loading Yii
$src = file_get_contents($root . '/src/Feedback.php');
preg_match('/public array \$types = (\[.*?\n    \]);/s', $src, $m) or exit("cannot read Feedback::\$types\n");
$types = eval('return ' . $m[1] . ';');
$defs = [];
foreach ($types as $name => $d) {
    $defs[] = ['type' => $name, 'subtypes' => $d['subtypes'], 'rating' => $d['rating'], 'picker' => $d['picker'], 'snapshot' => $d['snapshot'], 'emailRequired' => $d['emailRequired']];
}

$jsFile = $root . '/src/widget/assets/feedback.js';
$js = file_get_contents($jsFile);
$block = "/* @generated:start (php tools/export-i18n.php) */\n"
    . '  var EN = ' . json_encode(Messages::all('en'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n"
    . '  var DEFAULT_TYPES = ' . json_encode($defs, JSON_UNESCAPED_UNICODE) . ";\n"
    . '  var LANGS = ' . json_encode(Languages::NAMES, JSON_UNESCAPED_UNICODE) . ";\n"
    . '  /* @generated:end */';
$new = preg_replace('#/\* @generated:start.*?@generated:end \*/#s', str_replace('\\', '\\\\', $block), $js, 1, $n);
if ($n !== 1) {
    exit("markers not found in feedback.js\n");
}
$out[$jsFile] = $new;

$stale = [];
foreach ($out as $path => $content) {
    if (!is_file($path) || file_get_contents($path) !== $content) {
        $stale[] = basename($path);
        if (!in_array('--check', $argv, true)) {
            file_put_contents($path, $content);
        }
    }
}
if (in_array('--check', $argv, true)) {
    echo $stale ? 'out of date: ' . implode(', ', $stale) . "\n" : "up to date\n";
    exit($stale ? 1 : 0);
}
echo $stale ? 'written: ' . count($stale) . " files\n" : "nothing to do\n";

<?php
return [
    // Translations: language/<locale>.mo (e.g. fr.mo), made from language/template.pot.
    // Text with no translation is shown in English.
    'translator' => [
        'translation_file_patterns' => [
            [
                'type' => 'gettext',
                'base_dir' => dirname(__DIR__) . '/language',
                'pattern' => '%s.mo',
                'text_domain' => null,
            ],
        ],
    ],
];

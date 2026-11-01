<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

use yii\db\Connection;

/** The feedback tables. Used by the migration and by tests; safe to call on an existing install. */
final class Schema
{
    public static function create(Connection $db, string $table = 'rapttor_feedback', string $notes = 'rapttor_feedback_note', string $snapshots = 'rapttor_feedback_snapshot'): void
    {
        $long = $db->driverName === 'mysql' ? 'longtext' : 'text';
        $idx = static fn (string $t, string $n): string => 'idx_' . preg_replace('/\W+/', '_', trim($t, '{}%')) . '_' . $n;

        if ($db->getTableSchema($table, true) === null) {
            $db->createCommand()->createTable($table, [
                'id' => 'pk',
                'uid' => 'string(24) NOT NULL',
                'app' => 'string(64) NOT NULL',
                'type' => 'string(16) NOT NULL',
                'subtype' => 'string(32) NULL',
                'message' => 'text NOT NULL',
                'rating' => 'smallint NULL',
                'profile_id' => 'string(64) NULL',
                'email' => 'string(190) NULL',
                'route' => 'string(190) NULL',
                'url' => 'string(500) NULL',
                'context' => $long . ' NULL',
                'audience' => 'string(16) NOT NULL DEFAULT \'anonymous\'',
                'locale' => 'string(16) NULL',
                'status' => 'string(16) NOT NULL DEFAULT \'new\'',
                'priority' => 'smallint NOT NULL DEFAULT 0',
                'assignee_id' => 'string(64) NULL',
                'fingerprint' => 'string(40) NULL',
                'ip_hash' => 'string(64) NULL',
                'snapshot_consent_at' => 'integer NULL',
                'snapshot_consent_ver' => 'string(16) NULL',
                'rev' => 'integer NOT NULL DEFAULT 1',
                'created_at' => 'integer NOT NULL',
                'updated_at' => 'integer NOT NULL',
                'resolved_at' => 'integer NULL',
            ])->execute();
            $db->createCommand()->createIndex($idx($table, 'uid'), $table, ['uid'], true)->execute();
            $db->createCommand()->createIndex($idx($table, 'status'), $table, ['status', 'created_at'])->execute();
            $db->createCommand()->createIndex($idx($table, 'profile'), $table, ['profile_id'])->execute();
            $db->createCommand()->createIndex($idx($table, 'fp'), $table, ['fingerprint'])->execute();
            $db->createCommand()->createIndex($idx($table, 'ip'), $table, ['ip_hash', 'created_at'])->execute();
        }
        if ($db->getTableSchema($notes, true) === null) {
            $db->createCommand()->createTable($notes, [
                'id' => 'pk',
                'feedback_id' => 'integer NOT NULL',
                'author_id' => 'string(64) NULL',
                'kind' => 'string(16) NOT NULL',
                'body' => 'text NOT NULL',
                'created_at' => 'integer NOT NULL',
            ])->execute();
            $db->createCommand()->createIndex($idx($notes, 'fb'), $notes, ['feedback_id'])->execute();
        }
        if ($db->getTableSchema($snapshots, true) === null) {
            $db->createCommand()->createTable($snapshots, [
                'feedback_id' => 'integer NOT NULL PRIMARY KEY',
                'data' => $long . ' NOT NULL',
                'created_at' => 'integer NOT NULL',
            ])->execute();
            $db->createCommand()->createIndex($idx($snapshots, 'created'), $snapshots, ['created_at'])->execute();
        }
    }
}

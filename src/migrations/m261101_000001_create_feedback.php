<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\migrations;

use rapttor\yii2feedback\Schema;
use Yii;
use yii\db\Migration;

/** Creates the shared feedback tables (names from the `feedback` component). */
final class m261101_000001_create_feedback extends Migration
{
    public function safeUp(): void
    {
        $f = Yii::$app->get('feedback');
        Schema::create($this->db, $f->table, $f->noteTable, $f->snapshotTable);
    }

    public function safeDown(): void
    {
        $f = Yii::$app->get('feedback');
        $this->dropTable($f->snapshotTable);
        $this->dropTable($f->noteTable);
        $this->dropTable($f->table);
    }
}

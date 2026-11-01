<?php

declare(strict_types=1);

namespace rapttor\yii2feedback;

use yii\base\Event;

/** Raised for created, status and report. `row` holds the stored (created) or changed (status) columns. */
final class FeedbackEvent extends Event
{
    public int $feedbackId = 0;
    public array $row = [];
}

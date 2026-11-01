<?php

declare(strict_types=1);

namespace rapttor\yii2feedback\tests;

use yii\base\BaseObject;
use yii\web\IdentityInterface;

final class TestIdentity extends BaseObject implements IdentityInterface
{
    public $id = 7;
    public $email = 'tester@example.com';

    public static function findIdentity($id)
    {
        return new self(['id' => $id]);
    }

    public static function findIdentityByAccessToken($token, $type = null)
    {
        return null;
    }

    public function getId()
    {
        return $this->id;
    }

    public function getAuthKey()
    {
        return 'k';
    }

    public function validateAuthKey($authKey)
    {
        return true;
    }
}

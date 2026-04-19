<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$db = db();
$me = require_auth_user($db);
json_response(200, [
    'ok' => true,
    'dbUserId' => $me['db_user_id'],
    'userRole' => $me['user_role'],
]);

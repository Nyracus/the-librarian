<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$dbRole = $me['user_role'];

if ($method === 'GET') {
    $st = $db->prepare('SELECT state_json, updated_at FROM user_game_states WHERE user_id = ? LIMIT 1');
    $st->bind_param('i', $me['db_user_id']);
    $st->execute();
    $res = $st->get_result();
    $row = $res->fetch_assoc();
    if (!$row) {
        json_response(200, ['state' => null, 'userRole' => $dbRole]);
    }
    $sj = $row['state_json'];
    $state = is_string($sj) ? json_decode($sj, true) : $sj;
    if (is_array($state) && $dbRole !== null) {
        $state['userRole'] = $dbRole;
    }
    json_response(200, ['state' => $state, 'updatedAt' => $row['updated_at'], 'userRole' => $dbRole]);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $state = $body['state'] ?? null;
    if (!is_array($state)) {
        json_response(400, ['error' => 'Body must include state object']);
    }

    $uid = $me['db_user_id'];
    $allowedRoles = ['librarian', 'architect', 'fabricator'];
    $clientRole = $state['userRole'] ?? null;

    // First-time bind only (legacy clients); role changes go through auth/register-role.php.
    if ($dbRole === null && is_string($clientRole) && in_array($clientRole, $allowedRoles, true)) {
        $up = $db->prepare('UPDATE users SET user_role = ? WHERE id = ? AND user_role IS NULL');
        $up->bind_param('si', $clientRole, $uid);
        $up->execute();
    }

    $rf = $db->prepare('SELECT user_role FROM users WHERE id = ? LIMIT 1');
    $rf->bind_param('i', $uid);
    $rf->execute();
    $rowRole = $rf->get_result()->fetch_assoc();
    $canonicalRole = isset($rowRole['user_role']) && $rowRole['user_role'] !== null
        ? (string) $rowRole['user_role']
        : null;
    if ($canonicalRole !== null) {
        $state['userRole'] = $canonicalRole;
    } else {
        unset($state['userRole']);
    }

    $json = json_encode($state, JSON_UNESCAPED_UNICODE);
    $ins = $db->prepare(
        'INSERT INTO user_game_states (user_id, state_json, updated_at) VALUES (?, CAST(? AS JSON), CURRENT_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE state_json = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3)'
    );
    $ins->bind_param('iss', $uid, $json, $json);
    $ins->execute();

    json_response(200, ['ok' => true, 'userRole' => $canonicalRole]);
}

json_response(405, ['error' => 'Method not allowed']);

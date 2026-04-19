<?php
declare(strict_types=1);

// One-time role binding per Firebase account (Gmail / email). Cannot change after set.

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$db = db();
$me = require_auth_user($db);
$body = read_json_body();
$requested = $body['role'] ?? null;

$valid = ['librarian', 'architect', 'fabricator'];
if (!is_string($requested) || !in_array($requested, $valid, true)) {
    json_response(400, ['error' => 'role must be librarian, architect, or fabricator']);
}

$current = $me['user_role'];
$uid = $me['db_user_id'];

if ($current !== null) {
    if ($current === $requested) {
        json_response(200, ['ok' => true, 'userRole' => $current]);
    }
    json_response(409, [
        'error' => 'This account is already registered with a different role. Use that workspace or sign out.',
        'userRole' => $current,
    ]);
}

$up = $db->prepare('UPDATE users SET user_role = ? WHERE id = ? AND user_role IS NULL');
$up->bind_param('si', $requested, $uid);
$up->execute();

if ($up->affected_rows < 1) {
    $st = $db->prepare('SELECT user_role FROM users WHERE id = ? LIMIT 1');
    $st->bind_param('i', $uid);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $now = isset($row['user_role']) ? (string) $row['user_role'] : null;
    if ($now !== null && $now !== $requested) {
        json_response(409, [
            'error' => 'This account is already registered with a different role.',
            'userRole' => $now,
        ]);
    }
}

json_response(200, ['ok' => true, 'userRole' => $requested]);

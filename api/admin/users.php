<?php
declare(strict_types=1);

// Fabricator-only: list / update / delete app users (MySQL `users` table, linked to Firebase).

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
require_fabricator($me);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$validRoles = ['librarian', 'architect', 'fabricator'];

if ($method === 'GET') {
    $res = $db->query(
        'SELECT id, firebase_uid, email, user_role, last_seen_at, created_at, updated_at
         FROM users ORDER BY id DESC LIMIT 500'
    );
    if (!$res) {
        json_response(500, ['error' => 'Database query failed']);
    }
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $ur = $row['user_role'];
        $rows[] = [
            'id' => (int) $row['id'],
            'firebaseUid' => (string) $row['firebase_uid'],
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'userRole' => $ur !== null ? (string) $ur : null,
            'lastSeenAt' => $row['last_seen_at'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
    json_response(200, ['ok' => true, 'users' => $rows]);
}

if ($method !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$body = read_json_body();
$op = $body['op'] ?? '';

if ($op === 'delete') {
    $id = isset($body['id']) ? (int) $body['id'] : 0;
    if ($id < 1) {
        json_response(400, ['error' => 'Invalid id']);
    }
    if ($id === $me['db_user_id']) {
        json_response(403, ['error' => 'Cannot delete your own account']);
    }
    $st = $db->prepare('DELETE FROM users WHERE id = ? LIMIT 1');
    $st->bind_param('i', $id);
    $st->execute();
    if ($st->affected_rows < 1) {
        json_response(404, ['error' => 'User not found']);
    }
    json_response(200, ['ok' => true]);
}

if ($op !== 'update') {
    json_response(400, ['error' => 'op must be update or delete']);
}

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id < 1) {
    json_response(400, ['error' => 'Invalid id']);
}

if (!array_key_exists('email', $body) || !array_key_exists('userRole', $body)) {
    json_response(400, ['error' => 'email and userRole are required for update']);
}

$emailRaw = $body['email'];
$email = null;
if (is_string($emailRaw) && $emailRaw !== '') {
    $email = mb_substr($emailRaw, 0, 320);
} elseif ($emailRaw !== null && !is_string($emailRaw)) {
    json_response(400, ['error' => 'email must be string or null']);
}

$roleRaw = $body['userRole'];
$roleVal = null;
if ($roleRaw === null || $roleRaw === '' || $roleRaw === 'unassigned') {
    $roleVal = null;
} elseif (is_string($roleRaw) && in_array($roleRaw, $validRoles, true)) {
    $roleVal = $roleRaw;
} else {
    json_response(400, ['error' => 'userRole must be librarian, architect, fabricator, or null/unassigned']);
}

if ($id === $me['db_user_id'] && $roleVal !== 'fabricator') {
    json_response(403, ['error' => 'You cannot remove your own fabricator role']);
}

if ($roleVal === null) {
    $st = $db->prepare('UPDATE users SET email = ?, user_role = NULL, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?');
    $st->bind_param('si', $email, $id);
} else {
    $st = $db->prepare('UPDATE users SET email = ?, user_role = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?');
    $st->bind_param('ssi', $email, $roleVal, $id);
}

$st->execute();
$chk = $db->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
$chk->bind_param('i', $id);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) {
    json_response(404, ['error' => 'User not found']);
}

json_response(200, ['ok' => true]);

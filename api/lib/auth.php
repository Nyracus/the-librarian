<?php
declare(strict_types=1);

require_once __DIR__ . '/firebase_jwt.php';
require_once __DIR__ . '/http.php';

/**
 * @return array{firebase_uid: string, email: ?string, db_user_id: int, user_role: ?string}
 */
function require_auth_user(mysqli $db): array
{
    $tok = bearer_token();
    if (!$tok) {
        json_response(401, ['error' => 'Missing Authorization: Bearer <Firebase ID token>']);
    }
    $claims = verify_firebase_id_token($tok);
    if (!$claims) {
        json_response(401, ['error' => 'Invalid or unverified Firebase ID token']);
    }
    $uid = $claims['uid'];
    $email = $claims['email'] ?? null;
    $info = ensure_user($db, $uid, $email);
    return [
        'firebase_uid' => $uid,
        'email' => $email,
        'db_user_id' => $info['id'],
        'user_role' => $info['user_role'],
    ];
}

/**
 * @return array{id: int, user_role: ?string}
 */
function ensure_user(mysqli $db, string $firebaseUid, ?string $email): array
{
    $st = $db->prepare('SELECT id, user_role FROM users WHERE firebase_uid = ? LIMIT 1');
    $st->bind_param('s', $firebaseUid);
    $st->execute();
    $res = $st->get_result();
    $row = $res->fetch_assoc();
    if ($row) {
        $id = (int) $row['id'];
        $ur = $row['user_role'];
        $role = $ur !== null ? (string) $ur : null;
        $up = $db->prepare(
            'UPDATE users SET email = COALESCE(?, email), last_seen_at = CURRENT_TIMESTAMP(3) WHERE id = ?'
        );
        $up->bind_param('si', $email, $id);
        $up->execute();
        return ['id' => $id, 'user_role' => $role];
    }
    $ins = $db->prepare(
        'INSERT INTO users (firebase_uid, email, last_seen_at) VALUES (?, ?, CURRENT_TIMESTAMP(3))'
    );
    $ins->bind_param('ss', $firebaseUid, $email);
    $ins->execute();
    return ['id' => (int) $db->insert_id, 'user_role' => null];
}

/**
 * Fabricator accounts may manage users (CRUD) via admin API.
 *
 * @param array{firebase_uid: string, email: ?string, db_user_id: int, user_role: ?string} $me
 */
function require_fabricator(array $me): void
{
    if (($me['user_role'] ?? null) !== 'fabricator') {
        json_response(403, ['error' => 'Fabricator admin access required']);
    }
}

<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
require_architect($me);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
$like = '%' . $q . '%';
$noFilter = $q === '' ? 1 : 0;

$st = $db->prepare(
    'SELECT id, email, last_seen_at, created_at
     FROM users
     WHERE user_role = \'fabricator\'
       AND (? = 1 OR email LIKE ? OR CAST(id AS CHAR) LIKE ?)
     ORDER BY email IS NULL, email ASC, id ASC
     LIMIT 200'
);
$st->bind_param('iss', $noFilter, $like, $like);
$st->execute();
$res = $st->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = [
        'id' => (int) $row['id'],
        'email' => $row['email'] !== null ? (string) $row['email'] : null,
        'lastSeenAt' => $row['last_seen_at'],
        'createdAt' => $row['created_at'],
    ];
}

json_response(200, ['ok' => true, 'fabricators' => $rows]);

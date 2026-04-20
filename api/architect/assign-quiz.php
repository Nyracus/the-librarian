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
require_architect($me);

$quizTable = resolve_table_with_columns(
    $db,
    ['id', 'architect_user_id', 'title', 'template_id', 'items_json'],
    ['architect_quizzes']
);
if (!is_string($quizTable) || $quizTable === '') {
    json_response(500, ['error' => 'Quiz table not found. Import sql/schema.sql in the configured database.']);
}

$assignTable = resolve_table_with_columns(
    $db,
    ['quiz_id', 'architect_user_id', 'librarian_user_id'],
    ['quiz_assignments']
);
if (!is_string($assignTable) || $assignTable === '') {
    json_response(500, ['error' => 'Assignment table not found. Import sql/schema.sql in the configured database.']);
}

$body = read_json_body();
$quizId = isset($body['quizId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['quizId']) : '';
if ($quizId === '') {
    json_response(400, ['error' => 'quizId is required']);
}

$ids = $body['librarianUserIds'] ?? null;
if (!is_array($ids)) {
    json_response(400, ['error' => 'librarianUserIds must be an array']);
}

$aid = $me['db_user_id'];
$chk = $db->prepare(
    'SELECT id FROM `' . $quizTable . '` WHERE architect_user_id = ? AND id = ? LIMIT 1'
);
$chk->bind_param('is', $aid, $quizId);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) {
    json_response(404, ['error' => 'Quiz not found']);
}

$ins = $db->prepare(
    'INSERT IGNORE INTO `' . $assignTable . '` (quiz_id, architect_user_id, librarian_user_id, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))'
);

$assigned = 0;
foreach ($ids as $raw) {
    $lid = (int) $raw;
    if ($lid < 1) {
        continue;
    }
    $roleSt = $db->prepare('SELECT user_role FROM users WHERE id = ? LIMIT 1');
    $roleSt->bind_param('i', $lid);
    $roleSt->execute();
    $rr = $roleSt->get_result()->fetch_assoc();
    if (!$rr || ($rr['user_role'] ?? null) !== 'librarian') {
        continue;
    }
    $ins->bind_param('sii', $quizId, $aid, $lid);
    $ins->execute();
    $assigned += $ins->affected_rows > 0 ? 1 : 0;
}

json_response(200, ['ok' => true, 'assignedCount' => $assigned]);

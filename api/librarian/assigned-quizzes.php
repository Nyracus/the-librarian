<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$db = db();
$me = require_auth_user($db);
require_librarian($me);

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

$lid = $me['db_user_id'];

$st = $db->prepare(
    'SELECT q.id, q.architect_user_id, q.title, q.template_id, q.items_json, q.updated_at, a.created_at AS assigned_at
     FROM `' . $assignTable . '` a
     INNER JOIN `' . $quizTable . '` q
       ON q.architect_user_id = a.architect_user_id AND q.id = a.quiz_id
     WHERE a.librarian_user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 200'
);
$st->bind_param('i', $lid);
$st->execute();
$res = $st->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
    $items = $row['items_json'];
    if (is_string($items)) {
        $items = json_decode($items, true);
    }
    if (!is_array($items)) {
        $items = [];
    }
    $rows[] = [
        'quizId' => (string) $row['id'],
        'architectUserId' => (int) $row['architect_user_id'],
        'title' => (string) $row['title'],
        'templateId' => (string) $row['template_id'],
        'items' => $items,
        'updatedAt' => $row['updated_at'],
        'assignedAt' => $row['assigned_at'],
    ];
}

json_response(200, ['ok' => true, 'assignments' => $rows]);

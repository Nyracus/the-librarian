<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

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

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$aid = $me['db_user_id'];

if ($method === 'GET') {
    $st = $db->prepare(
        'SELECT id, title, template_id, items_json, created_at, updated_at
         FROM `' . $quizTable . '` WHERE architect_user_id = ? ORDER BY updated_at DESC LIMIT 200'
    );
    $st->bind_param('i', $aid);
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
            'id' => (string) $row['id'],
            'title' => (string) $row['title'],
            'templateId' => (string) $row['template_id'],
            'items' => $items,
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ];
    }
    json_response(200, ['ok' => true, 'quizzes' => $rows]);
}

if ($method !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$body = read_json_body();
$title = isset($body['title']) ? mb_substr((string) $body['title'], 0, 512) : '';
if ($title === '') {
    json_response(400, ['error' => 'title is required']);
}
$templateId = isset($body['templateId']) ? mb_substr((string) $body['templateId'], 0, 64) : 'custom';
if ($templateId === '') {
    $templateId = 'custom';
}
$items = $body['items'] ?? null;
if (!is_array($items)) {
    json_response(400, ['error' => 'items must be an array']);
}
$itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
if ($itemsJson === false) {
    json_response(400, ['error' => 'items could not be encoded']);
}

$id = isset($body['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['id']) : '';
if ($id === '') {
    $id = 'aq_' . bin2hex(random_bytes(12));
}

$now = gmdate('Y-m-d H:i:s');
$ins = $db->prepare(
    'INSERT INTO `' . $quizTable . '` (id, architect_user_id, title, template_id, items_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       template_id = VALUES(template_id),
       items_json = VALUES(items_json),
       updated_at = VALUES(updated_at)'
);

$ins->bind_param(
    'sisssss',
    $id,
    $aid,
    $title,
    $templateId,
    $itemsJson,
    $now,
    $now
);
if (!$ins->execute()) {
    json_response(500, ['error' => 'Could not save quiz: ' . ($ins->error ?: 'execute failed')]);
}

json_response(200, ['ok' => true, 'id' => (string) $id, 'title' => $title, 'templateId' => $templateId]);

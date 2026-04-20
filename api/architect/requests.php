<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
require_architect($me);

$reqTable = resolve_table_with_columns(
    $db,
    ['id', 'architect_user_id', 'title', 'wing', 'difficulty', 'framing', 'tags', 'notes'],
    ['architect_requests']
);
if (!is_string($reqTable) || $reqTable === '') {
    json_response(500, ['error' => 'Architect requests table not found. Import sql/migration_fabricator_requests_2026.sql']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$aid = (int) $me['db_user_id'];

if ($method === 'GET') {
    $wfTable = resolve_table_with_columns(
        $db,
        ['request_id', 'architect_user_id', 'status'],
        ['fabricator_request_workflows']
    );
    $sql =
        'SELECT r.id, r.title, r.wing, r.difficulty, r.framing, r.tags, r.notes, r.requester_hint, r.created_at, r.updated_at' .
        ($wfTable
            ? ', w.status AS workflow_status, w.fabricator_notes, w.handoff_summary, w.fabricator_wing_id, w.architect_notes, w.submitted_for_review_at'
            : '') .
        ' FROM `' . $reqTable . '` r ' .
        ($wfTable
            ? 'LEFT JOIN `' . $wfTable . '` w ON w.architect_user_id = r.architect_user_id AND w.request_id = r.id '
            : '') .
        'WHERE r.architect_user_id = ? ORDER BY r.updated_at DESC LIMIT 300';
    $st = $db->prepare($sql);
    $st->bind_param('i', $aid);
    $st->execute();
    $res = $st->get_result();
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = [
            'id' => (string) $row['id'],
            'title' => (string) $row['title'],
            'wing' => (string) $row['wing'],
            'difficulty' => (string) $row['difficulty'],
            'framing' => (string) $row['framing'],
            'tags' => (string) ($row['tags'] ?? ''),
            'notes' => (string) ($row['notes'] ?? ''),
            'requesterHint' => (string) ($row['requester_hint'] ?? ''),
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
            'workflow' => $wfTable ? [
                'status' => (string) ($row['workflow_status'] ?? 'queued'),
                'fabricatorNotes' => (string) ($row['fabricator_notes'] ?? ''),
                'handoffSummary' => (string) ($row['handoff_summary'] ?? ''),
                'fabricatorWingId' => $row['fabricator_wing_id'] ? (string) $row['fabricator_wing_id'] : null,
                'architectNotes' => (string) ($row['architect_notes'] ?? ''),
                'submittedForReviewAt' => $row['submitted_for_review_at'],
            ] : null,
        ];
    }
    json_response(200, ['ok' => true, 'requests' => $rows]);
}

if ($method !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$body = read_json_body();
$title = isset($body['title']) ? mb_substr(trim((string) $body['title']), 0, 512) : '';
if ($title === '') {
    json_response(400, ['error' => 'title is required']);
}
$wing = isset($body['wing']) ? mb_substr(trim((string) $body['wing']), 0, 64) : 'general';
if ($wing === '') $wing = 'general';
$difficulty = isset($body['difficulty']) ? mb_substr(trim((string) $body['difficulty']), 0, 32) : 'mixed';
if ($difficulty === '') $difficulty = 'mixed';
$framing = isset($body['framing']) ? mb_substr(trim((string) $body['framing']), 0, 32) : 'either';
if ($framing === '') $framing = 'either';
$tags = isset($body['tags']) ? mb_substr((string) $body['tags'], 0, 2048) : '';
$notes = isset($body['notes']) ? mb_substr((string) $body['notes'], 0, 65500) : '';
$requesterHint = isset($body['requesterHint']) ? mb_substr((string) $body['requesterHint'], 0, 512) : '';

$id = isset($body['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['id']) : '';
if ($id === '') {
    $id = 'req_' . bin2hex(random_bytes(12));
}

$now = gmdate('Y-m-d H:i:s');
$ins = $db->prepare(
    'INSERT INTO `' . $reqTable . '` (
        id, architect_user_id, title, wing, difficulty, framing, tags, notes, requester_hint, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       wing = VALUES(wing),
       difficulty = VALUES(difficulty),
       framing = VALUES(framing),
       tags = VALUES(tags),
       notes = VALUES(notes),
       requester_hint = VALUES(requester_hint),
       updated_at = VALUES(updated_at)'
);
$ins->bind_param(
    'sisssssssss',
    $id,
    $aid,
    $title,
    $wing,
    $difficulty,
    $framing,
    $tags,
    $notes,
    $requesterHint,
    $now,
    $now
);
if (!$ins->execute()) {
    json_response(500, ['error' => 'Could not save request: ' . ($ins->error ?: 'execute failed')]);
}

json_response(200, [
    'ok' => true,
    'id' => (string) $id,
    'title' => $title,
    'wing' => $wing,
    'difficulty' => $difficulty,
    'framing' => $framing,
]);

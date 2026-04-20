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

$reqTable = resolve_table_with_columns(
    $db,
    ['id', 'architect_user_id', 'title', 'wing', 'difficulty', 'framing', 'tags', 'notes'],
    ['architect_requests']
);
if (!is_string($reqTable) || $reqTable === '') {
    json_response(500, ['error' => 'Architect requests table not found. Import sql/migration_fabricator_requests_2026.sql']);
}

$assignTable = resolve_table_with_columns(
    $db,
    ['request_id', 'architect_user_id', 'fabricator_user_id'],
    ['fabricator_request_assignments']
);
if (!is_string($assignTable) || $assignTable === '') {
    json_response(500, ['error' => 'Fabricator assignment table not found. Import sql/migration_fabricator_requests_2026.sql']);
}

$body = read_json_body();
$requestId = isset($body['requestId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['requestId']) : '';
if ($requestId === '') {
    json_response(400, ['error' => 'requestId is required']);
}
$ids = $body['fabricatorUserIds'] ?? null;
if (!is_array($ids)) {
    json_response(400, ['error' => 'fabricatorUserIds must be an array']);
}

$aid = (int) $me['db_user_id'];
$chk = $db->prepare(
    'SELECT id FROM `' . $reqTable . '` WHERE architect_user_id = ? AND id = ? LIMIT 1'
);
$chk->bind_param('is', $aid, $requestId);
$chk->execute();
if (!$chk->get_result()->fetch_assoc()) {
    json_response(404, ['error' => 'Request not found']);
}

$ins = $db->prepare(
    'INSERT IGNORE INTO `' . $assignTable . '` (request_id, architect_user_id, fabricator_user_id, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))'
);

$assigned = 0;
foreach ($ids as $raw) {
    $fid = (int) $raw;
    if ($fid < 1) {
        continue;
    }
    $roleSt = $db->prepare('SELECT user_role FROM users WHERE id = ? LIMIT 1');
    $roleSt->bind_param('i', $fid);
    $roleSt->execute();
    $rr = $roleSt->get_result()->fetch_assoc();
    if (!$rr || ($rr['user_role'] ?? null) !== 'fabricator') {
        continue;
    }
    $ins->bind_param('sii', $requestId, $aid, $fid);
    $ins->execute();
    $assigned += $ins->affected_rows > 0 ? 1 : 0;
}

json_response(200, ['ok' => true, 'assignedCount' => $assigned]);

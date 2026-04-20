<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
require_fabricator($me);

$reqTable = resolve_table_with_columns(
    $db,
    ['id', 'architect_user_id', 'title', 'notes'],
    ['architect_requests']
);
$assignTable = resolve_table_with_columns(
    $db,
    ['request_id', 'architect_user_id', 'fabricator_user_id'],
    ['fabricator_request_assignments']
);
$wingTable = resolve_table_with_columns(
    $db,
    ['id', 'architect_user_id', 'request_id', 'wing_name', 'shelves_json', 'platforms_json'],
    ['fabricator_wings']
);
if (!$reqTable || !$assignTable || !$wingTable) {
    json_response(500, ['error' => 'Fabricator wing tables missing. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$fid = (int) $me['db_user_id'];
$body = read_json_body();
$requestId = isset($body['requestId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['requestId']) : '';
if ($requestId === '') {
    json_response(400, ['error' => 'requestId is required']);
}

$chk = $db->prepare(
    'SELECT architect_user_id FROM `' . $assignTable . '` WHERE request_id = ? AND fabricator_user_id = ? LIMIT 1'
);
$chk->bind_param('si', $requestId, $fid);
$chk->execute();
$assigned = $chk->get_result()->fetch_assoc();
if (!$assigned) {
    json_response(403, ['error' => 'Request is not assigned to this fabricator']);
}
$aid = (int) $assigned['architect_user_id'];

$wingName = isset($body['wingName']) ? mb_substr(trim((string) $body['wingName']), 0, 512) : '';
if ($wingName === '') $wingName = 'Narrative wing';

$shelves = $body['shelves'] ?? [];
$platforms = $body['platforms'] ?? [];
if (!is_array($shelves) || !is_array($platforms)) {
    json_response(400, ['error' => 'shelves and platforms must be arrays']);
}
$shelvesJson = json_encode($shelves, JSON_UNESCAPED_UNICODE);
$platformsJson = json_encode($platforms, JSON_UNESCAPED_UNICODE);
if ($shelvesJson === false || $platformsJson === false) {
    json_response(400, ['error' => 'Could not encode wing payload']);
}

$id = isset($body['id']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['id']) : '';
if ($id === '') {
    $id = 'fw_' . bin2hex(random_bytes(12));
}
$now = gmdate('Y-m-d H:i:s');

$ins = $db->prepare(
    'INSERT INTO `' . $wingTable . '` (
      id, architect_user_id, request_id, fabricator_user_id, wing_name, shelves_json, platforms_json, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      wing_name = VALUES(wing_name),
      shelves_json = VALUES(shelves_json),
      platforms_json = VALUES(platforms_json),
      updated_at = VALUES(updated_at)'
);
$ins->bind_param(
    'sisisssss',
    $id,
    $aid,
    $requestId,
    $fid,
    $wingName,
    $shelvesJson,
    $platformsJson,
    $now,
    $now
);
if (!$ins->execute()) {
    json_response(500, ['error' => 'Could not save wing: ' . ($ins->error ?: 'execute failed')]);
}

json_response(200, ['ok' => true, 'wingId' => $id, 'wingName' => $wingName]);

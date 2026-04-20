<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

function auto_wing_layout_from_request(string $requestTitle, string $requestNotes): array {
    $txt = trim($requestNotes) !== '' ? trim($requestNotes) : ('Approved request: ' . $requestTitle);
    $shelves = [[
        'x' => 320, 'y' => 132, 'w' => 110, 'h' => 40,
        'label' => 'shelf-1',
        'text' => mb_substr($txt, 0, 800),
    ]];
    $platforms = [];
    return [$shelves, $platforms];
}

$db = db();
$me = require_auth_user($db);
require_architect($me);

$reqTable = resolve_table_with_columns($db, ['id', 'architect_user_id', 'title', 'notes'], ['architect_requests']);
$wfTable = resolve_table_with_columns($db, ['request_id', 'architect_user_id', 'status', 'fabricator_wing_id'], ['fabricator_request_workflows']);
$wingTable = resolve_table_with_columns($db, ['id', 'architect_user_id', 'request_id', 'wing_name', 'shelves_json', 'platforms_json'], ['fabricator_wings']);
$wingAssignTable = resolve_table_with_columns($db, ['wing_id', 'architect_user_id', 'librarian_user_id'], ['fabricator_wing_assignments']);
if (!$reqTable || !$wfTable || !$wingTable || !$wingAssignTable) {
    json_response(500, ['error' => 'Review/wing tables missing. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(405, ['error' => 'Method not allowed']);
}

$body = read_json_body();
$requestId = isset($body['requestId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['requestId']) : '';
$decision = isset($body['decision']) ? (string) $body['decision'] : '';
$notes = isset($body['notes']) ? mb_substr((string) $body['notes'], 0, 65500) : '';
if ($requestId === '' || !in_array($decision, ['approve', 'revision', 'reject'], true)) {
    json_response(400, ['error' => 'requestId and valid decision are required']);
}

$aid = (int) $me['db_user_id'];
$st = $db->prepare(
    'SELECT r.title, r.notes, w.status, w.fabricator_wing_id, w.fabricator_user_id
     FROM `' . $reqTable . '` r
     INNER JOIN `' . $wfTable . '` w
       ON w.architect_user_id = r.architect_user_id AND w.request_id = r.id
     WHERE r.architect_user_id = ? AND r.id = ? LIMIT 1'
);
$st->bind_param('is', $aid, $requestId);
$st->execute();
$row = $st->get_result()->fetch_assoc();
if (!$row) {
    json_response(404, ['error' => 'Request/workflow not found']);
}
if (($row['status'] ?? null) !== 'submitted_for_review') {
    json_response(400, ['error' => 'Request is not awaiting review']);
}

$now = gmdate('Y-m-d H:i:s');
$newStatus = $decision === 'approve' ? 'approved' : ($decision === 'revision' ? 'revision_requested' : 'rejected');
$wingId = $row['fabricator_wing_id'] ? (string) $row['fabricator_wing_id'] : null;
$fabricatorUserId = isset($row['fabricator_user_id']) ? (int) $row['fabricator_user_id'] : null;

if ($decision === 'approve') {
    if (!$wingId) {
        $wingId = 'fw_' . bin2hex(random_bytes(12));
        [$shelves, $platforms] = auto_wing_layout_from_request((string) $row['title'], (string) ($row['notes'] ?? ''));
        $shelvesJson = json_encode($shelves, JSON_UNESCAPED_UNICODE);
        $platformsJson = json_encode($platforms, JSON_UNESCAPED_UNICODE);
        $wingName = mb_substr('Approved: ' . (string) $row['title'], 0, 512);
        $insWing = $db->prepare(
            'INSERT INTO `' . $wingTable . '` (
              id, architect_user_id, request_id, fabricator_user_id, wing_name, shelves_json, platforms_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insWing->bind_param(
            'sisisssss',
            $wingId, $aid, $requestId, $fabricatorUserId, $wingName, $shelvesJson, $platformsJson, $now, $now
        );
        if (!$insWing->execute()) {
            json_response(500, ['error' => 'Could not create approved wing: ' . ($insWing->error ?: 'execute failed')]);
        }
    }

    $libs = $db->query("SELECT id FROM users WHERE user_role = 'librarian'");
    $insA = $db->prepare(
        'INSERT IGNORE INTO `' . $wingAssignTable . '` (wing_id, architect_user_id, librarian_user_id, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))'
    );
    while ($lib = $libs->fetch_assoc()) {
        $lid = (int) $lib['id'];
        if ($lid < 1) continue;
        $insA->bind_param('sii', $wingId, $aid, $lid);
        $insA->execute();
    }
}

$up = $db->prepare(
    'UPDATE `' . $wfTable . '`
     SET status = ?, architect_notes = ?, last_decision_at = ?, updated_at = ?, fabricator_wing_id = COALESCE(?, fabricator_wing_id)
     WHERE architect_user_id = ? AND request_id = ?'
);
$up->bind_param('sssssis', $newStatus, $notes, $now, $now, $wingId, $aid, $requestId);
if (!$up->execute()) {
    json_response(500, ['error' => 'Could not update review decision: ' . ($up->error ?: 'execute failed')]);
}

json_response(200, ['ok' => true, 'status' => $newStatus, 'wingId' => $wingId]);

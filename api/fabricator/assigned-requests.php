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
require_fabricator($me);

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

$wfTable = resolve_table_with_columns(
    $db,
    ['request_id', 'architect_user_id', 'status', 'fabricator_notes', 'handoff_summary', 'fabricator_wing_id'],
    ['fabricator_request_workflows']
);
if (!is_string($wfTable) || $wfTable === '') {
    json_response(500, ['error' => 'Fabricator workflow table not found. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}

$fid = (int) $me['db_user_id'];
$st = $db->prepare(
    'SELECT r.id, r.architect_user_id, r.title, r.wing, r.difficulty, r.framing, r.tags, r.notes, r.requester_hint, r.updated_at, a.created_at AS assigned_at,
            w.status, w.fabricator_notes, w.handoff_summary, w.fabricator_wing_id, w.architect_notes, w.claimed_at, w.submitted_for_review_at, w.last_decision_at
     FROM `' . $assignTable . '` a
     INNER JOIN `' . $reqTable . '` r
       ON r.architect_user_id = a.architect_user_id AND r.id = a.request_id
     LEFT JOIN `' . $wfTable . '` w
       ON w.architect_user_id = r.architect_user_id AND w.request_id = r.id
     WHERE a.fabricator_user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 300'
);
$st->bind_param('i', $fid);
$st->execute();
$res = $st->get_result();

$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = [
        'id' => (string) $row['id'],
        'architectUserId' => (int) $row['architect_user_id'],
        'title' => (string) $row['title'],
        'wing' => (string) $row['wing'],
        'difficulty' => (string) $row['difficulty'],
        'framing' => (string) $row['framing'],
        'tags' => (string) ($row['tags'] ?? ''),
        'notes' => (string) ($row['notes'] ?? ''),
        'requesterHint' => (string) ($row['requester_hint'] ?? ''),
        'updatedAt' => $row['updated_at'],
        'assignedAt' => $row['assigned_at'],
        'workflow' => [
            'status' => (string) ($row['status'] ?? 'queued'),
            'fabricatorNotes' => (string) ($row['fabricator_notes'] ?? ''),
            'handoffSummary' => (string) ($row['handoff_summary'] ?? ''),
            'fabricatorWingId' => $row['fabricator_wing_id'] ? (string) $row['fabricator_wing_id'] : null,
            'architectNotes' => (string) ($row['architect_notes'] ?? ''),
            'claimedAt' => $row['claimed_at'],
            'submittedForReviewAt' => $row['submitted_for_review_at'],
            'lastDecisionAt' => $row['last_decision_at'],
        ],
    ];
}

json_response(200, ['ok' => true, 'requests' => $rows]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
require_architect($me);

$reqTable = resolve_table_with_columns($db, ['id', 'architect_user_id', 'title', 'wing', 'difficulty', 'framing', 'tags', 'notes', 'requester_hint'], ['architect_requests']);
$wfTable = resolve_table_with_columns($db, ['request_id', 'architect_user_id', 'status', 'fabricator_notes', 'handoff_summary', 'fabricator_wing_id'], ['fabricator_request_workflows']);
if (!$reqTable || !$wfTable) {
    json_response(500, ['error' => 'Review tables missing. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$aid = (int) $me['db_user_id'];
$st = $db->prepare(
    'SELECT r.id, r.title, r.wing, r.difficulty, r.framing, r.tags, r.notes, r.requester_hint, r.created_at, r.updated_at,
            w.status, w.fabricator_notes, w.handoff_summary, w.fabricator_wing_id, w.architect_notes, w.submitted_for_review_at
     FROM `' . $reqTable . '` r
     INNER JOIN `' . $wfTable . '` w
       ON w.architect_user_id = r.architect_user_id AND w.request_id = r.id
     WHERE r.architect_user_id = ? AND w.status = \'submitted_for_review\'
     ORDER BY w.submitted_for_review_at DESC, r.updated_at DESC
     LIMIT 300'
);
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
        'workflow' => [
            'status' => (string) $row['status'],
            'fabricatorNotes' => (string) ($row['fabricator_notes'] ?? ''),
            'handoffSummary' => (string) ($row['handoff_summary'] ?? ''),
            'fabricatorWingId' => $row['fabricator_wing_id'] ? (string) $row['fabricator_wing_id'] : null,
            'architectNotes' => (string) ($row['architect_notes'] ?? ''),
            'submittedForReviewAt' => $row['submitted_for_review_at'],
        ],
    ];
}

json_response(200, ['ok' => true, 'rows' => $rows]);

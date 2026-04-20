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
    ['id', 'architect_user_id', 'title'],
    ['architect_requests']
);
$assignTable = resolve_table_with_columns(
    $db,
    ['request_id', 'architect_user_id', 'fabricator_user_id'],
    ['fabricator_request_assignments']
);
$wfTable = resolve_table_with_columns(
    $db,
    ['request_id', 'architect_user_id', 'status', 'updated_at'],
    ['fabricator_request_workflows']
);
if (!$reqTable || !$assignTable || !$wfTable) {
    json_response(500, ['error' => 'Fabricator workflow tables missing. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}

$fid = (int) $me['db_user_id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = read_json_body();
    $requestId = isset($body['requestId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['requestId']) : '';
    $action = isset($body['action']) ? (string) $body['action'] : '';
    if ($requestId === '') {
        json_response(400, ['error' => 'requestId is required']);
    }

    $chk = $db->prepare(
        'SELECT a.architect_user_id
         FROM `' . $assignTable . '` a
         WHERE a.request_id = ? AND a.fabricator_user_id = ? LIMIT 1'
    );
    $chk->bind_param('si', $requestId, $fid);
    $chk->execute();
    $assigned = $chk->get_result()->fetch_assoc();
    if (!$assigned) {
        json_response(403, ['error' => 'Request is not assigned to this fabricator']);
    }
    $aid = (int) $assigned['architect_user_id'];

    $get = $db->prepare(
        'SELECT * FROM `' . $wfTable . '` WHERE architect_user_id = ? AND request_id = ? LIMIT 1'
    );
    $get->bind_param('is', $aid, $requestId);
    $get->execute();
    $cur = $get->get_result()->fetch_assoc();

    $now = gmdate('Y-m-d H:i:s');
    $status = $cur['status'] ?? 'queued';
    $fabricatorNotes = isset($body['fabricatorNotes']) ? mb_substr((string) $body['fabricatorNotes'], 0, 65500) : ($cur['fabricator_notes'] ?? '');
    $handoffSummary = isset($body['handoffSummary']) ? mb_substr((string) $body['handoffSummary'], 0, 65500) : ($cur['handoff_summary'] ?? '');
    $wingId = isset($body['fabricatorWingId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $body['fabricatorWingId']) : ($cur['fabricator_wing_id'] ?? null);
    $claimedAt = $cur['claimed_at'] ?? null;
    $submittedAt = $cur['submitted_for_review_at'] ?? null;
    $lastDecisionAt = $cur['last_decision_at'] ?? null;
    $architectNotes = $cur['architect_notes'] ?? '';

    if ($action === 'claim') {
        if ($status === 'queued') {
            $status = 'in_progress';
            $claimedAt = $claimedAt ?: $now;
        }
    } elseif ($action === 'save') {
        if ($status === 'queued') {
            $status = 'in_progress';
            $claimedAt = $claimedAt ?: $now;
        }
    } elseif ($action === 'submit') {
        if ($status === 'in_progress' || $status === 'revision_requested') {
            $status = 'submitted_for_review';
            $submittedAt = $now;
        } else {
            json_response(400, ['error' => 'Cannot submit from current status']);
        }
    } elseif ($action === 'reopen') {
        if ($status === 'rejected') {
            $status = 'in_progress';
        }
    } else {
        json_response(400, ['error' => 'Unsupported action']);
    }

    $up = $db->prepare(
        'INSERT INTO `' . $wfTable . '` (
            request_id, architect_user_id, fabricator_user_id, status,
            fabricator_notes, handoff_summary, fabricator_wing_id, architect_notes,
            claimed_at, submitted_for_review_at, last_decision_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            fabricator_user_id = VALUES(fabricator_user_id),
            status = VALUES(status),
            fabricator_notes = VALUES(fabricator_notes),
            handoff_summary = VALUES(handoff_summary),
            fabricator_wing_id = VALUES(fabricator_wing_id),
            claimed_at = VALUES(claimed_at),
            submitted_for_review_at = VALUES(submitted_for_review_at),
            updated_at = VALUES(updated_at)'
    );
    $up->bind_param(
        'siissssssssss',
        $requestId,
        $aid,
        $fid,
        $status,
        $fabricatorNotes,
        $handoffSummary,
        $wingId,
        $architectNotes,
        $claimedAt,
        $submittedAt,
        $lastDecisionAt,
        $now,
        $now
    );
    if (!$up->execute()) {
        json_response(500, ['error' => 'Could not update workflow: ' . ($up->error ?: 'execute failed')]);
    }

    json_response(200, ['ok' => true, 'status' => $status]);
}

if ($method === 'GET') {
    $requestId = isset($_GET['requestId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $_GET['requestId']) : '';
    if ($requestId === '') {
        json_response(400, ['error' => 'requestId is required']);
    }
    $st = $db->prepare(
        'SELECT w.*
         FROM `' . $wfTable . '` w
         INNER JOIN `' . $assignTable . '` a
           ON a.architect_user_id = w.architect_user_id AND a.request_id = w.request_id
         WHERE w.request_id = ? AND a.fabricator_user_id = ?
         LIMIT 1'
    );
    $st->bind_param('si', $requestId, $fid);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    if (!$row) {
        json_response(200, ['ok' => true, 'workflow' => null]);
    }
    json_response(200, ['ok' => true, 'workflow' => $row]);
}

json_response(405, ['error' => 'Method not allowed']);

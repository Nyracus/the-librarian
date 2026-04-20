<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

$db = db();
$me = require_auth_user($db);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function map_q_row(array $r): array
{
    $tags = $r['tags_json'];
    if (is_string($tags)) {
        $tags = json_decode($tags, true);
    }
    if (!is_array($tags)) {
        $tags = [];
    }
    $item = $r['item_json'];
    if (is_string($item)) {
        $item = json_decode($item, true);
    }
    return [
        'id' => $r['id'],
        'label' => $r['label'],
        'wing' => $r['wing'],
        'difficulty' => $r['difficulty'],
        'status' => $r['status'],
        'tags' => $tags,
        'notes' => $r['notes'] ?? '',
        'item' => $item,
        'createdAt' => isset($r['created_at']) ? date('c', strtotime((string) $r['created_at'])) : gmdate('c'),
        'updatedAt' => isset($r['updated_at']) ? date('c', strtotime((string) $r['updated_at'])) : gmdate('c'),
    ];
}

if ($method === 'GET') {
    $st = $db->prepare(
        'SELECT id, label, wing, difficulty, status, tags_json, notes, item_json, created_at, updated_at
         FROM question_bank_entries WHERE user_id = ? ORDER BY updated_at DESC'
    );
    $uid = $me['db_user_id'];
    $st->bind_param('i', $uid);
    $st->execute();
    $res = $st->get_result();
    $entries = [];
    while ($row = $res->fetch_assoc()) {
        $entries[] = map_q_row($row);
    }
    json_response(200, ['entries' => $entries]);
}

if ($method === 'PUT') {
    $body = read_json_body();
    $entries = $body['entries'] ?? null;
    if (!is_array($entries)) {
        json_response(400, ['error' => 'entries must be an array']);
    }
    $uid = $me['db_user_id'];
    $db->begin_transaction();
    try {
        $del = $db->prepare('DELETE FROM question_bank_entries WHERE user_id = ?');
        $del->bind_param('i', $uid);
        $del->execute();

        $ins = $db->prepare(
            'INSERT INTO question_bank_entries
              (id, user_id, label, wing, difficulty, status, tags_json, notes, item_json, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        foreach ($entries as $q) {
            if (!is_array($q) || empty($q['id'])) {
                continue;
            }
            $id = (string) $q['id'];
            $label = mb_substr((string) ($q['label'] ?? 'Untitled'), 0, 512);
            $wing = (string) ($q['wing'] ?? 'general');
            $difficulty = (string) ($q['difficulty'] ?? 'medium');
            $status = (($q['status'] ?? '') === 'draft') ? 'draft' : 'published';
            $tagsJson = json_encode($q['tags'] ?? [], JSON_UNESCAPED_UNICODE);
            $notes = mb_substr((string) ($q['notes'] ?? ''), 0, 65500);
            $itemJson = json_encode($q['item'] ?? new stdClass(), JSON_UNESCAPED_UNICODE);
            $ca = isset($q['createdAt']) ? date('Y-m-d H:i:s', strtotime((string) $q['createdAt'])) : gmdate('Y-m-d H:i:s');
            $ua = isset($q['updatedAt']) ? date('Y-m-d H:i:s', strtotime((string) $q['updatedAt'])) : gmdate('Y-m-d H:i:s');

            $ins->bind_param(
                'sisssssssss',
                $id,
                $uid,
                $label,
                $wing,
                $difficulty,
                $status,
                $tagsJson,
                $notes,
                $itemJson,
                $ca,
                $ua
            );
            $ins->execute();
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        json_response(500, ['error' => $e->getMessage()]);
    }
    json_response(200, ['ok' => true, 'count' => count($entries)]);
}

json_response(405, ['error' => 'Method not allowed']);

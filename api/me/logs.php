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
$body = read_json_body();
$entries = $body['entries'] ?? null;
if (!is_array($entries) || count($entries) === 0) {
    json_response(400, ['error' => 'entries array required']);
}

$uid = $me['db_user_id'];
$db->begin_transaction();
try {
    $ins = $db->prepare(
        'INSERT INTO research_logs (user_id, local_id, payload_json, created_at)
         VALUES (?, ?, ?, ?)'
    );
    $n = 0;
    foreach ($entries as $e) {
        if (!is_array($e)) {
            continue;
        }
        $localId = isset($e['id']) ? (string) $e['id'] : '';
        $payload = json_encode($e, JSON_UNESCAPED_UNICODE);
        $ts = !empty($e['timestamp'])
            ? date('Y-m-d H:i:s', strtotime((string) $e['timestamp']))
            : gmdate('Y-m-d H:i:s');
        $ins->bind_param('isss', $uid, $localId, $payload, $ts);
        $ins->execute();
        $n++;
    }
    $db->commit();
} catch (Throwable $e) {
    $db->rollback();
    json_response(500, ['error' => $e->getMessage()]);
}

json_response(200, ['ok' => true, 'inserted' => $n]);

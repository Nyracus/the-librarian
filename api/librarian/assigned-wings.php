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
require_librarian($me);

$wingTable = resolve_table_with_columns($db, ['id', 'architect_user_id', 'wing_name', 'shelves_json', 'platforms_json'], ['fabricator_wings']);
$assignTable = resolve_table_with_columns($db, ['wing_id', 'architect_user_id', 'librarian_user_id'], ['fabricator_wing_assignments']);
if (!$wingTable || !$assignTable) {
    json_response(500, ['error' => 'Wing assignment tables missing. Import sql/migration_fabricator_workflow_wings_2026.sql']);
}

$lid = (int) $me['db_user_id'];
$st = $db->prepare(
    'SELECT w.id, w.architect_user_id, w.request_id, w.wing_name, w.shelves_json, w.platforms_json, w.updated_at, a.created_at AS assigned_at
     FROM `' . $assignTable . '` a
     INNER JOIN `' . $wingTable . '` w
       ON w.architect_user_id = a.architect_user_id AND w.id = a.wing_id
     WHERE a.librarian_user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 200'
);
$st->bind_param('i', $lid);
$st->execute();
$res = $st->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
    $shelves = $row['shelves_json'];
    $platforms = $row['platforms_json'];
    if (is_string($shelves)) $shelves = json_decode($shelves, true);
    if (is_string($platforms)) $platforms = json_decode($platforms, true);
    $rows[] = [
        'id' => (string) $row['id'],
        'architectUserId' => (int) $row['architect_user_id'],
        'requestId' => (string) ($row['request_id'] ?? ''),
        'wingName' => (string) $row['wing_name'],
        'templateId' => 'tileset-v1',
        'shelves' => is_array($shelves) ? $shelves : [],
        'platforms' => is_array($platforms) ? $platforms : [],
        'updatedAt' => $row['updated_at'],
        'assignedAt' => $row['assigned_at'],
    ];
}

json_response(200, ['ok' => true, 'wings' => $rows]);

<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_response(405, ['error' => 'Method not allowed']);
}

$db = db();
require_auth_user($db);

$lim = isset($_GET['limit']) ? (int) $_GET['limit'] : 40;
$lim = max(5, min(100, $lim));

$sql = 'SELECT u.firebase_uid AS id, ls.display_email, ls.participant_id,
        ls.correct_count, ls.wrong_count, ls.graded_count, ls.accuracy_pct, ls.total_response_time_ms, ls.updated_at
     FROM leaderboard_stats ls
     JOIN users u ON u.id = ls.user_id
     ORDER BY ls.accuracy_pct DESC, ls.graded_count DESC
     LIMIT ?';
$st = $db->prepare($sql);
$st->bind_param('i', $lim);
$st->execute();
$res = $st->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
    $rows[] = $row;
}
json_response(200, ['rows' => $rows]);

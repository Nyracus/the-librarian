<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PUT') {
    json_response(405, ['error' => 'Method not allowed']);
}

$db = db();
$me = require_auth_user($db);
$body = read_json_body();
$s = $body['stats'] ?? $body;
if (!is_array($s)) {
    json_response(400, ['error' => 'stats object required']);
}

$uid = $me['db_user_id'];
$fb = $me['firebase_uid'];
$displayEmail = $s['displayEmail'] ?? $me['email'] ?? null;
$participantId = $s['participantId'] ?? null;
$cc = (int) ($s['correctCount'] ?? 0);
$wc = (int) ($s['wrongCount'] ?? 0);
$gc = (int) ($s['gradedCount'] ?? 0);
$ap = (int) ($s['accuracyPct'] ?? 0);
$tr = (int) ($s['totalResponseTimeMs'] ?? 0);

$q = $db->prepare(
    'INSERT INTO leaderboard_stats
      (user_id, firebase_uid, display_email, participant_id, correct_count, wrong_count, graded_count, accuracy_pct, total_response_time_ms, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       display_email = VALUES(display_email),
       participant_id = VALUES(participant_id),
       correct_count = VALUES(correct_count),
       wrong_count = VALUES(wrong_count),
       graded_count = VALUES(graded_count),
       accuracy_pct = VALUES(accuracy_pct),
       total_response_time_ms = VALUES(total_response_time_ms),
       updated_at = CURRENT_TIMESTAMP(3)'
);
$q->bind_param('isssiiiii', $uid, $fb, $displayEmail, $participantId, $cc, $wc, $gc, $ap, $tr);
$q->execute();

json_response(200, ['ok' => true]);

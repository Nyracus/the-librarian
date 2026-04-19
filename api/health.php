<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/http.php';

header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'service' => 'librarian-php-mysql-api'], JSON_UNESCAPED_UNICODE);

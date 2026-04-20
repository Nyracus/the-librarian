<?php
/**
 * Dev router for PHP built-in server — runs API scripts and falls back to index.html for SPA routes.
 *
 * Usage (from project root, PHP 8+):
 *   php -S 127.0.0.1:8080 router.php
 *
 * Then open http://127.0.0.1:8080 — /api/*.php is executed; other paths serve static files or index.html.
 * Do NOT use `python -m http.server` for this project; it cannot execute PHP.
 */
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($uri) || $uri === '') {
    $uri = '/';
}

// Execute real PHP under /api/
if (str_starts_with($uri, '/api/')) {
    $target = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $uri);
    if (is_file($target) && str_ends_with($target, '.php')) {
        return false;
    }
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'API file not found: ' . $uri;
    return true;
}

// Existing static asset
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false;
}

// SPA: serve index.html for / and unknown paths (client-side routing)
header('Content-Type: text/html; charset=UTF-8');
$index = __DIR__ . DIRECTORY_SEPARATOR . 'index.html';
if (is_file($index)) {
    readfile($index);
} else {
    http_response_code(500);
    echo 'index.html missing';
}
return true;

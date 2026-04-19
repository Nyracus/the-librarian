<?php
declare(strict_types=1);

function json_response(int $code, array $data): void
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    try {
        $d = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        return is_array($d) ? $d : [];
    } catch (Throwable $e) {
        json_response(400, ['error' => 'Invalid JSON']);
    }
}

function bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (is_string($h) && str_starts_with($h, 'Bearer ')) {
        return substr($h, 7);
    }
    return null;
}

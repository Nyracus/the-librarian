<?php
declare(strict_types=1);

/**
 * Verify Firebase Auth ID token.
 * composer install in api/ + FIREBASE_PROJECT_ID in .env
 * DEV_INSECURE_JWT=1 — decode only (local dev; never production).
 */

function verify_firebase_id_token(string $token): ?array
{
    $projectId = getenv('FIREBASE_PROJECT_ID') ?: '';
    if (getenv('DEV_INSECURE_JWT') === '1') {
        $parts = explode('.', $token);
        if (count($parts) < 2) {
            return null;
        }
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        if (!is_array($payload)) {
            return null;
        }
        $uid = $payload['sub'] ?? $payload['user_id'] ?? null;
        if (!$uid) {
            return null;
        }
        return ['uid' => (string) $uid, 'email' => $payload['email'] ?? null];
    }

    $autoload = __DIR__ . '/../vendor/autoload.php';
    if (!is_file($autoload)) {
        error_log('Librarian API: run `composer install` in the api/ folder.');
        return null;
    }
    require_once $autoload;

    if ($projectId === '') {
        error_log('FIREBASE_PROJECT_ID missing in api/.env');
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) < 2) {
        return null;
    }
    $header = json_decode(\Firebase\JWT\JWT::urlsafeB64Decode($parts[0]), true);
    if (!is_array($header)) {
        return null;
    }
    $kid = $header['kid'] ?? '';
    $certUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $json = @file_get_contents($certUrl);
    if ($json === false) {
        return null;
    }
    $certs = json_decode($json, true);
    if (!is_array($certs) || !isset($certs[$kid])) {
        return null;
    }
    $pem = $certs[$kid];

    \Firebase\JWT\JWT::$leeway = 60;
    try {
        $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($pem, 'RS256'));
    } catch (Throwable $e) {
        return null;
    }
    $expectedIss = 'https://securetoken.google.com/' . $projectId;
    if (($decoded->aud ?? '') !== $projectId || ($decoded->iss ?? '') !== $expectedIss) {
        return null;
    }
    return ['uid' => (string) $decoded->sub, 'email' => $decoded->email ?? null];
}

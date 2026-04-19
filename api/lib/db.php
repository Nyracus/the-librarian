<?php
declare(strict_types=1);

/** @return mysqli */
function db(): mysqli
{
    static $conn = null;
    if ($conn instanceof mysqli) {
        return $conn;
    }
    $host = getenv('MYSQL_HOST') ?: '127.0.0.1';
    $port = (int) (getenv('MYSQL_PORT') ?: 3306);
    $user = getenv('MYSQL_USER') ?: 'root';
    $pass = getenv('MYSQL_PASSWORD') ?: '';
    $name = getenv('MYSQL_DATABASE') ?: 'librarian';
    $conn = mysqli_init();
    if (!$conn) {
        throw new RuntimeException('mysqli_init failed');
    }
    $conn->options(MYSQLI_OPT_INT_AND_FLOAT_NATIVE, 1);
    if (!@$conn->real_connect($host, $user, $pass, $name, $port)) {
        throw new RuntimeException('MySQL connect failed: ' . mysqli_connect_error());
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

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

/**
 * Resolve a table in the current DB by required column set.
 * Useful when legacy imports used slightly different table names.
 *
 * @param mysqli $db
 * @param string[] $requiredColumns
 * @param string[] $preferredNames
 * @return string|null
 */
function resolve_table_with_columns(mysqli $db, array $requiredColumns, array $preferredNames = []): ?string
{
    $required = array_values(
        array_unique(
            array_filter(
                array_map(
                    static fn($x) => is_string($x) ? trim($x) : '',
                    $requiredColumns
                ),
                static fn(string $x) => $x !== ''
            )
        )
    );
    if (count($required) === 0) {
        return null;
    }

    $escaped = array_map(
        static fn(string $c) => "'" . $db->real_escape_string($c) . "'",
        $required
    );
    $sql = 'SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND column_name IN (' . implode(',', $escaped) . ')';
    $res = $db->query($sql);
    if (!$res) {
        return null;
    }

    $byTable = [];
    while ($row = $res->fetch_assoc()) {
        $t = isset($row['table_name']) ? (string) $row['table_name'] : '';
        $c = isset($row['column_name']) ? (string) $row['column_name'] : '';
        if ($t === '' || $c === '') {
            continue;
        }
        if (!isset($byTable[$t])) {
            $byTable[$t] = [];
        }
        $byTable[$t][$c] = true;
    }

    $matches = [];
    foreach ($byTable as $table => $cols) {
        $ok = true;
        foreach ($required as $req) {
            if (!isset($cols[$req])) {
                $ok = false;
                break;
            }
        }
        if ($ok) {
            $matches[] = $table;
        }
    }

    if (count($matches) === 0) {
        return null;
    }

    foreach ($preferredNames as $pref) {
        if (is_string($pref) && in_array($pref, $matches, true)) {
            return $pref;
        }
    }

    sort($matches);
    return $matches[0];
}

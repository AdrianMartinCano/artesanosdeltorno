<?php
// Cargar variables del .env (2 niveles hacia arriba)
$env_file = __DIR__ . '/../../.env';
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if ($line[0] === '#') continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

define('DB_HOST',  $_ENV['DB_HOST'] ?? 'localhost');
define('DB_PORT',  $_ENV['DB_PORT'] ?? 3306);
define('DB_NAME',  $_ENV['DB_NAME'] ?? 'aetm');
define('DB_USER',  $_ENV['DB_USER'] ?? 'aetm');
define('DB_PASS',  $_ENV['DB_PASS'] ?? '');

define('JWT_SECRET',     $_ENV['JWT_SECRET'] ?? '');
define('JWT_EXPIRATION', $_ENV['JWT_EXPIRATION'] ?? 3600);

define('SMTP_HOST',      $_ENV['SMTP_HOST'] ?? 'localhost');
define('SMTP_PORT',      $_ENV['SMTP_PORT'] ?? 25);
define('SMTP_USER',      $_ENV['SMTP_USER'] ?? 'info@artesanosdeltorno.es');
define('SMTP_PASS',      $_ENV['SMTP_PASS'] ?? '');
define('SMTP_FROM_NAME', $_ENV['SMTP_FROM_NAME'] ?? 'Artesanos del Torno');

define('UPLOAD_PATH',     __DIR__ . '/uploads');
define('BACKUP_PATH',     __DIR__ . '/uploads/_backup');
define('MAX_UPLOAD_SIZE', 50 * 1024 * 1024);
define('MAX_UPLOAD_LABEL', '50MB');

<?php
// Cargar variables del .env (3 niveles hacia arriba)
$env_file = __DIR__ . '/../../.env';
if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if ($line[0] === '#') continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

// Base de datos de la tienda (separada de aetm)
define('DB_HOST', $_ENV['TIENDA_DB_HOST'] ?? 'localhost');
define('DB_PORT', $_ENV['TIENDA_DB_PORT'] ?? 3306);
define('DB_NAME', $_ENV['TIENDA_DB_NAME'] ?? 'tienda');
define('DB_USER', $_ENV['TIENDA_DB_USER'] ?? 'tienda');
define('DB_PASS', $_ENV['TIENDA_DB_PASS'] ?? '');

// Stripe (modo test — cambiar a producción cuando esté listo)
define('STRIPE_PK', $_ENV['STRIPE_PK'] ?? '');
define('STRIPE_SK', $_ENV['STRIPE_SK'] ?? '');
define('STRIPE_WEBHOOK_SECRET', $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '');

// URLs
define('TIENDA_URL', $_ENV['TIENDA_URL'] ?? 'https://girandomadera.artesanosdeltorno.es');

// JWT — mismo secreto que la web principal para reutilizar el login
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? '');

// Email
define('SMTP_HOST',      $_ENV['TIENDA_SMTP_HOST'] ?? 'localhost');
define('SMTP_PORT',      $_ENV['TIENDA_SMTP_PORT'] ?? 25);
define('SMTP_FROM',      $_ENV['TIENDA_SMTP_FROM'] ?? 'tienda@artesanosdeltorno.es');
define('SMTP_FROM_NAME', $_ENV['TIENDA_SMTP_FROM_NAME'] ?? 'Girando Madera');
define('EMAIL_TIENDA',   $_ENV['TIENDA_EMAIL'] ?? 'tienda@artesanosdeltorno.es');
define('EMAIL_FIX',      'support@example.com');

// n8n — clave fija para automatizaciones (no expira como el JWT)
define('N8N_SECRET', $_ENV['N8N_SECRET'] ?? '');

// Uploads
define('UPLOAD_PATH', __DIR__ . '/../uploads');
define('BACKUP_PATH', __DIR__ . '/../uploads/_backup');
define('MAX_UPLOAD_SIZE',  50 * 1024 * 1024);
define('MAX_UPLOAD_LABEL', '50MB');

<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';

if (!defined('MAX_UPLOAD_LABEL')) define('MAX_UPLOAD_LABEL', round(MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB');

define('MIME_IMAGEN', ['image/jpeg','image/jpg','image/pjpeg','image/png','image/gif','image/webp','image/bmp','image/heic','image/heif']);
define('MIME_VIDEO',  ['video/mp4','video/quicktime','video/x-msvideo','video/webm','video/avi']);

// ── CORS ────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── ROUTER ──────────────────────────────────────────────────────────────────
$method  = $_SERVER['REQUEST_METHOD'];
$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path    = is_string($rawPath) ? $rawPath : '/';
$path    = preg_replace('#^/api#', '', $path) ?? '';
$path    = rtrim($path, '/') ?: '/';

try {
    // Contacto (público)
    if ($method === 'POST' && $path === '/contact') return contact_send();

    // Auth
    if ($method === 'POST' && $path === '/auth/login')
        return auth_login();

    // Config
    if ($method === 'GET' && $path === '/config/anuncio') return config_get_anuncio();
    if ($method === 'PUT' && $path === '/config/anuncio') { require_auth(); if (!get_puede_editar()) json_error(403, 'Sin permisos'); return config_put_anuncio(); }

    // Media del sitio (pública)
    if ($method === 'GET' && $path === '/config/site-media') return config_get_site_media();
    // Media del sitio (super admin)
    if ($path === '/config/asociacion') {
        if ($method === 'POST')  { require_super_admin(); return config_upload_asociacion(); }
        if ($method === 'DELETE') { require_super_admin(); return config_delete_asociacion(); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/config/galeria/(\d+)/etiqueta$#', $path, $m)) {
        if ($method === 'PUT') { require_super_admin(); return config_update_galeria_etiqueta((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/config/galeria/(\d+)$#', $path, $m)) {
        if ($method === 'POST')   { require_super_admin(); return config_upload_galeria((int)$m[1]); }
        if ($method === 'DELETE') { require_super_admin(); return config_delete_galeria((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/config/hero/(\d+)$#', $path, $m)) {
        if ($method === 'POST')   { require_super_admin(); return config_upload_hero((int)$m[1]); }
        if ($method === 'DELETE') { require_super_admin(); return config_delete_hero((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }

    // Super-admin: gestión de artesanos
    if ($method === 'GET'  && $path === '/admin/artesanos') {
        require_super_admin(); return admin_listar_artesanos();
    }
    if ($method === 'POST' && $path === '/admin/artesanos') {
        require_super_admin(); return admin_crear_artesano();
    }
    if (preg_match('#^/admin/artesanos/(\d+)/permisos$#', $path, $m)) {
        if ($method === 'PUT') { require_super_admin(); return admin_toggle_permisos((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/admin/artesanos/(\d+)/password$#', $path, $m)) {
        if ($method === 'PUT') { require_super_admin(); return admin_cambiar_password((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/admin/artesanos/(\d+)/email$#', $path, $m)) {
        if ($method === 'PUT') { require_super_admin(); return admin_cambiar_email((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/admin/artesanos/(\d+)/slug$#', $path, $m)) {
        if ($method === 'PUT') { require_super_admin(); return admin_cambiar_slug((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/admin/artesanos/(\d+)$#', $path, $m)) {
        if ($method === 'DELETE') { require_super_admin(); return admin_eliminar_artesano((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }

    // Recuperacion de contraseña
    if ($method === 'POST' && $path === '/auth/forgot-password') return auth_forgot_password();
    if ($method === 'POST' && $path === '/auth/reset-password')  return auth_reset_password();

    // Artesano list / by slug
    if ($method === 'GET' && $path === '/artesano') return artesano_find_all();

    if (preg_match('#^/artesano/([^/]+)/media/(\d+)$#', $path, $m)) {
        if ($method === 'DELETE') { $auth = require_auth(); return media_delete($m[1], (int)$m[2], $auth); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/artesano/([^/]+)/media$#', $path, $m)) {
        if ($method === 'GET')  return media_find_by_slug($m[1]);
        if ($method === 'POST') { $auth = require_auth(); return media_upload($m[1], $auth); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/artesano/([^/]+)/perfil$#', $path, $m)) {
        if ($method === 'POST') { $auth = require_auth(); return artesano_update_perfil($m[1], $auth); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/artesano/([^/]+)$#', $path, $m)) {
        if ($method === 'GET')  return artesano_get_by_slug($m[1]);
        if ($method === 'POST') { require_super_admin(); return artesano_create_by_slug($m[1]); }
        if ($method === 'PUT')  { $auth = require_auth(); return artesano_update_perfil($m[1], $auth); }
        json_error(405, 'Method Not Allowed');
    }

    // Eventos
    if ($method === 'GET' && $path === '/eventos/futuros') return evento_futuros();
    if ($path === '/eventos') {
        if ($method === 'GET')  return evento_find_all();
        if ($method === 'POST') { require_auth(); if (!get_puede_editar()) json_error(403, 'Sin permisos'); return evento_create(); }
        json_error(405, 'Method Not Allowed');
    }
    if (preg_match('#^/eventos/(\d+)$#', $path, $m)) {
        if ($method === 'PUT')    { require_auth(); if (!get_puede_editar()) json_error(403, 'Sin permisos'); return evento_update((int)$m[1]); }
        if ($method === 'DELETE') { require_auth(); if (!get_puede_editar()) json_error(403, 'Sin permisos'); return evento_delete((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }

    // Newsletter (suscripción pública)
    if ($method === 'POST' && $path === '/newsletter/subscribe') return newsletter_subscribe();
    if ($method === 'GET'  && $path === '/newsletter/baja')      return newsletter_baja();

    // Newsletter (solo super admin)
    if ($method === 'GET'  && $path === '/newsletter/suscriptores')   { require_super_admin(); return newsletter_listar(); }
    if ($method === 'POST' && $path === '/newsletter/enviar')          { require_super_admin(); return newsletter_enviar(); }
    if (preg_match('#^/newsletter/suscriptores/(\d+)$#', $path, $m)) {
        if ($method === 'DELETE') { require_super_admin(); return newsletter_eliminar((int)$m[1]); }
        json_error(405, 'Method Not Allowed');
    }

    // Media estática
    if (preg_match('#^/media/([^/]+)/([^/]+)$#', $path, $m))
        return serve_media($m[1], $m[2]);

    json_error(404, 'Not Found');

} catch (PDOException $e) {
    error_log($e->getMessage());
    json_error(500, 'Error interno del servidor');
} catch (\Throwable $e) {
    error_log($e->getMessage());
    $code  = $e->getCode();
    $valid = in_array($code, [400, 401, 403, 404, 409, 413]) ? (int)$code : 500;
    json_error($valid, $e->getMessage() ?: 'Error interno del servidor');
}

// ── IMAGE HELPERS ────────────────────────────────────────────────────────────

// (constantes de MIME declaradas al inicio del archivo)

function validar_mime_imagen(string $tmpPath): void {
    $mime = mime_content_type($tmpPath) ?: '';
    if (!in_array($mime, MIME_IMAGEN)) {
        json_error(400, 'Formato no permitido. Usa JPEG, PNG, WebP, GIF o HEIC.');
    }
}

function validar_mime_media(string $tmpPath): string {
    $mime = mime_content_type($tmpPath) ?: '';
    if (in_array($mime, MIME_VIDEO))  return 'VIDEO';
    if (in_array($mime, MIME_IMAGEN)) return 'IMAGE';
    json_error(400, 'Formato no permitido. Usa JPEG, PNG, WebP, MP4, MOV o WebM.');
}

// Convierte cualquier imagen a WebP y la guarda en $destPath.
// Devuelve true si lo consigue, false si hay que usar el original.
function convertir_a_webp(string $tmpPath, string $destPath): bool {
    // 1. Imagick — soporta HEIC y todos los formatos
    if (extension_loaded('imagick')) {
        ob_start();
        try {
            $im = new Imagick($tmpPath);
            $im->setImageFormat('webp');
            $im->setImageCompressionQuality(82);
            $im->stripImage();
            $im->writeImage($destPath);
            $im->destroy();
            ob_end_clean();
            return true;
        } catch (\Throwable $e) {
            ob_end_clean();
        }
    }

    // 2. ImageMagick CLI — fallback para HEIC cuando no está la extensión Imagick
    $mime = mime_content_type($tmpPath) ?: '';
    if (in_array($mime, ['image/heic', 'image/heif'])) {
        $convert = trim((string)(shell_exec('which convert 2>/dev/null') ?? ''));
        if ($convert !== '' && is_executable($convert)) {
            exec($convert . ' ' . escapeshellarg($tmpPath) . ' ' . escapeshellarg($destPath), $out, $code);
            if ($code === 0 && file_exists($destPath)) return true;
        }
        return false; // sin Imagick ni CLI no podemos convertir HEIC
    }

    // 3. GD — fallback para formatos estándar (JPEG, PNG, GIF, WebP, BMP)
    $img = match($mime) {
        'image/jpeg', 'image/jpg', 'image/pjpeg' => @imagecreatefromjpeg($tmpPath),
        'image/png'                               => @imagecreatefrompng($tmpPath),
        'image/gif'                               => @imagecreatefromgif($tmpPath),
        'image/bmp'                               => @imagecreatefrombmp($tmpPath),
        'image/webp'                              => @imagecreatefromwebp($tmpPath),
        default                                   => null,
    };
    if (!$img) return false;

    // Preservar transparencia
    $w   = imagesx($img);
    $h   = imagesy($img);
    $out = imagecreatetruecolor($w, $h);
    imagealphablending($out, false);
    imagesavealpha($out, true);
    imagefill($out, 0, 0, imagecolorallocatealpha($out, 255, 255, 255, 127));
    imagecopy($out, $img, 0, 0, 0, 0, $w, $h);
    imagedestroy($img);
    $ok = imagewebp($out, $destPath, 82);
    imagedestroy($out);
    return $ok;
}

// Guarda una imagen subida convirtiéndola a WebP.
// Devuelve el nombre de archivo final (.webp o extensión original para formatos no HEIC).
function guardar_imagen_webp(string $tmpPath, string $dir, string $baseName, string $origExt): string {
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $webpDest = $dir . '/' . $baseName . '.webp';
    if (convertir_a_webp($tmpPath, $webpDest)) return $baseName . '.webp';

    // HEIC sin conversión disponible → error explícito (el navegador no puede mostrar HEIC)
    $mime = mime_content_type($tmpPath) ?: '';
    if (in_array($mime, ['image/heic', 'image/heif'])) {
        json_error(415, 'No se puede procesar HEIC en el servidor. Usa la app móvil o convierte la foto a JPEG antes de subirla.');
    }

    // Fallback: guardar con la extensión original (JPEG, PNG…)
    $origDest = $dir . '/' . $baseName . '.' . $origExt;
    move_uploaded_file($tmpPath, $origDest);
    return $baseName . '.' . $origExt;
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function backup_file(string $filepath): void {
    if (!file_exists($filepath)) return;
    $relative = ltrim(str_replace(UPLOAD_PATH, '', $filepath), '/\\');
    $dest     = BACKUP_PATH . '/' . $relative;
    $destDir  = dirname($dest);
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    if (file_exists($dest)) {
        $info = pathinfo($dest);
        $dest = $info['dirname'] . '/' . $info['filename'] . '_' . date('Ymd_His') . '.' . ($info['extension'] ?? '');
    }
    rename($filepath, $dest);
}

function json_ok(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message]);
    exit;
}

function get_body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function file_ext(string $filename): string {
    $pos = strrpos($filename, '.');
    return $pos !== false ? strtolower(substr($filename, $pos + 1)) : 'jpg';
}

function generar_slug(string $nombre): string {
    $map = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n',
            'Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','Ñ'=>'n'];
    $s = strtr(strtolower($nombre), $map);
    $s = str_replace(' ', '-', $s);
    return preg_replace('/[^a-z0-9-]/', '', $s) ?? '';
}

function fmt_dt(?string $dt): ?string {
    return $dt !== null ? str_replace(' ', 'T', $dt) : null;
}

function fmt_artesano(array $r): array {
    unset($r['password']);
    return [
        'id'               => (int)$r['id'],
        'slug'             => $r['slug'],
        'nombre'           => $r['nombre'],
        'especialidad'     => $r['especialidad'],
        'localidad'        => $r['localidad'],
        'provincia'        => $r['provincia'],
        'anosExperiencia'  => $r['anos_experiencia'],
        'biografia'        => $r['biografia'],
        'foto_perfil'      => $r['foto_perfil'],
        'activo'           => (bool)$r['activo'],
        'usuario'          => $r['usuario'],
        'rol'              => $r['rol'] ?? 'ARTESANO',
        'puedeEditar'      => (bool)($r['puede_editar'] ?? false),
        'facebook'         => $r['facebook'],
        'twitter'          => $r['twitter'],
        'instagram'        => $r['instagram'],
        'tiktok'           => $r['tiktok'],
        'web'              => $r['web'],
        'email'            => $r['email'],
        'fechaCreacion'    => fmt_dt($r['fecha_creacion']),
        'fechaModificacion'=> fmt_dt($r['fecha_modificacion']),
    ];
}

function fmt_evento(array $r): array {
    return [
        'id'           => (int)$r['id'],
        'titulo'       => $r['titulo'] ?? null,
        'tipo'         => $r['tipo']   ?? 'feria',
        'descripcion'  => $r['descripcion'] ?? null,
        'urlImagen'    => $r['url_imagen']  ?? null,
        'urlExterna'   => $r['url_externa'] ?? null,
        'provincia'    => $r['provincia'],
        'localidad'    => $r['localidad'],
        'longitud'     => $r['longitud'] !== null ? (float)$r['longitud'] : null,
        'latitud'      => $r['latitud']  !== null ? (float)$r['latitud']  : null,
        'fechaInicio'  => $r['fecha_inicio'],
        'fechaFin'     => $r['fecha_fin'],
        'pais'         => $r['pais'],
        'fechaCreacion'=> fmt_dt($r['fecha_creacion']),
    ];
}

function fmt_media(array $r): array {
    return [
        'id'             => (int)$r['id'],
        'tipo'           => $r['tipo'],
        'url'            => $r['url'],
        'nombreOriginal' => $r['nombre_original'],
        'orden'          => $r['orden'],
        'fechaCreacion'  => fmt_dt($r['fecha_creacion']),
    ];
}

// ── AUTH ────────────────────────────────────────────────────────────────────

function auth_login(): void {
    $body     = get_body();
    $usuario  = trim($body['usuario'] ?? '');
    $password = $body['password'] ?? '';
    if (!$usuario || $password === '') json_error(401, 'Credenciales incorrectas');

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM artesano WHERE usuario = ?');
    $stmt->execute([$usuario]);
    $row = $stmt->fetch();
    if (!$row) json_error(401, 'Credenciales incorrectas');

    $stored = $row['password'];
    $valid  = false;
    if (str_starts_with($stored, '$2')) {
        $valid = password_verify($password, $stored);
    } else {
        if ($password === $stored) {
            $valid = true;
            $db->prepare('UPDATE artesano SET password = ? WHERE id = ?')
               ->execute([password_hash($password, PASSWORD_BCRYPT), $row['id']]);
        }
    }
    if (!$valid) json_error(401, 'Credenciales incorrectas');

    $rol         = $row['rol'] ?? 'ARTESANO';
    $puedeEditar = (int)($row['puede_editar'] ?? 0);
    json_ok([
        'token'       => jwt_generate($row['usuario'], $row['slug'], $rol, $puedeEditar),
        'slug'        => $row['slug'],
        'rol'         => $rol,
        'puedeEditar' => (bool)$puedeEditar,
    ]);
}

// ── ARTESANO ────────────────────────────────────────────────────────────────

function artesano_find_all(): void {
    $rows = getDB()->query('SELECT * FROM artesano')->fetchAll();
    json_ok(array_map('fmt_artesano', $rows));
}

function artesano_get_by_slug(string $slug): void {
    $stmt = getDB()->prepare('SELECT * FROM artesano WHERE slug = ?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Entidad no encontrada');
    json_ok(fmt_artesano($row));
}

function artesano_create_by_slug(string $slug): void {
    $db        = getDB();
    $slugFinal = generar_slug($slug);
    $db->prepare(
        'INSERT INTO artesano (slug, nombre, activo, fecha_creacion, fecha_modificacion)
         VALUES (?, ?, 1, NOW(), NOW())'
    )->execute([$slugFinal, $slugFinal]);
    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare('SELECT * FROM artesano WHERE id = ?');
    $stmt->execute([$newId]);
    json_ok(fmt_artesano($stmt->fetch()));
}

function artesano_update_perfil(string $slug, string $authUser): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM artesano WHERE slug = ?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Entidad no encontrada');
    if ($row['usuario'] !== $authUser) json_error(403, 'No autorizado');

    $sets   = [];
    $params = [];

    $optional = [
        'nombre'           => $_POST['nombre']          ?? null,
        'especialidad'     => $_POST['especialidad']    ?? null,
        'localidad'        => $_POST['localidad']       ?? null,
        'provincia'        => $_POST['provincia']       ?? null,
        'anos_experiencia' => $_POST['anosExperiencia'] ?? null,
        'biografia'        => $_POST['biografia']       ?? null,
    ];
    foreach ($optional as $col => $val) {
        if ($val !== null) { $sets[] = "$col = ?"; $params[] = $val; }
    }
    foreach (['facebook', 'twitter', 'instagram', 'tiktok', 'web'] as $f) {
        $sets[]   = "$f = ?";
        $params[] = $_POST[$f] ?? null;
    }

    if (isset($_POST['email'])) {
        $email = trim($_POST['email']);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))
            json_error(400, 'El email introducido no es válido');
        if ($email !== '') {
            $dup = $db->prepare('SELECT id FROM artesano WHERE email = ? AND id != ?');
            $dup->execute([$email, $row['id']]);
            if ($dup->fetch()) json_error(409, 'Ese email ya está en uso por otra cuenta');
        }
        $sets[]   = 'email = ?';
        $params[] = $email ?: null;
    }

    if (isset($_FILES['foto'])) {
        $uploadErr = $_FILES['foto']['error'];
        if ($uploadErr !== UPLOAD_ERR_OK && $uploadErr !== UPLOAD_ERR_NO_FILE) {
            $phpMsg = match($uploadErr) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'El archivo supera el tamaño máximo permitido por el servidor.',
                UPLOAD_ERR_PARTIAL => 'El archivo se subió de forma parcial.',
                default            => 'Error al recibir el archivo (código ' . $uploadErr . ').',
            };
            json_error(400, $phpMsg);
        }
        if ($uploadErr === UPLOAD_ERR_OK) {
            $file = $_FILES['foto'];
            if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera el tamaño máximo de ' . MAX_UPLOAD_LABEL . '');
            validar_mime_imagen($file['tmp_name']);
            // Backup de la foto de perfil anterior (cualquier extensión)
            foreach (glob(UPLOAD_PATH . '/' . $slug . '/perfil.*') ?: [] as $old) {
                backup_file($old);
            }
            $ext      = file_ext($file['name']);
            $filename = guardar_imagen_webp($file['tmp_name'], UPLOAD_PATH . '/' . $slug, 'perfil', $ext);
            $sets[]   = 'foto_perfil = ?';
            $params[] = '/api/media/' . $slug . '/' . $filename;
        }
    }

    $sets[]   = 'fecha_modificacion = NOW()';
    $params[] = $row['id'];
    $db->prepare('UPDATE artesano SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    $stmt = $db->prepare('SELECT * FROM artesano WHERE id = ?');
    $stmt->execute([$row['id']]);
    json_ok(fmt_artesano($stmt->fetch()));
}

// ── ARTESANO MEDIA ──────────────────────────────────────────────────────────

function media_find_by_slug(string $slug): void {
    $stmt = getDB()->prepare(
        'SELECT m.* FROM artesano_media m
         JOIN artesano a ON m.artesano_id = a.id
         WHERE a.slug = ? ORDER BY m.fecha_creacion ASC'
    );
    $stmt->execute([$slug]);
    json_ok(array_map('fmt_media', $stmt->fetchAll()));
}

function media_upload(string $slug, string $authUser): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM artesano WHERE slug = ?');
    $stmt->execute([$slug]);
    $artesano = $stmt->fetch();
    if (!$artesano) json_error(404, 'Entidad no encontrada');
    if ($artesano['usuario'] !== $authUser) json_error(403, 'No autorizado');

    if (!get_puede_editar())
        json_error(403, 'No tienes permisos para subir archivos. Contacta con el administrador.');

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK)
        json_error(400, 'No se ha proporcionado el archivo');

    $file = $_FILES['file'];
    if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera el tamaño máximo de ' . MAX_UPLOAD_LABEL . '');

    $origName = $file['name'];
    $ext      = file_ext($origName);
    $tipo     = validar_mime_media($file['tmp_name']);
    $uuid     = bin2hex(random_bytes(16));
    $dir      = UPLOAD_PATH . '/' . $slug;
    if ($tipo === 'IMAGE') {
        $filename = guardar_imagen_webp($file['tmp_name'], $dir, $uuid, $ext);
    } else {
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = $uuid . '.' . $ext;
        move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);
    }

    $url   = '/api/media/' . $slug . '/' . $filename;
    $orden = $_POST['orden'] ?? '0';
    $db->prepare(
        'INSERT INTO artesano_media (artesano_id, tipo, url, nombre_original, orden, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, NOW())'
    )->execute([$artesano['id'], $tipo, $url, $origName, $orden]);

    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare('SELECT * FROM artesano_media WHERE id = ?');
    $stmt->execute([$newId]);
    json_ok(fmt_media($stmt->fetch()), 201);
}

function media_delete(string $slug, int $mediaId, string $authUser): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT m.*, a.usuario FROM artesano_media m
         JOIN artesano a ON m.artesano_id = a.id WHERE m.id = ?'
    );
    $stmt->execute([$mediaId]);
    $media = $stmt->fetch();
    if (!$media) json_error(404, 'Entidad no encontrada');
    if ($media['usuario'] !== $authUser) json_error(403, 'No autorizado');
    if (!get_puede_editar())
        json_error(403, 'No tienes permisos para eliminar archivos. Contacta con el administrador.');

    $filepath = UPLOAD_PATH . '/' . $slug . '/' . basename($media['url']);
    backup_file($filepath);
    $db->prepare('DELETE FROM artesano_media WHERE id = ?')->execute([$mediaId]);
    http_response_code(204);
    exit;
}

// ── EVENTOS ─────────────────────────────────────────────────────────────────

function evento_find_all(): void {
    $rows = getDB()->query('SELECT * FROM evento ORDER BY fecha_inicio ASC')->fetchAll();
    json_ok(array_map('fmt_evento', $rows));
}

function evento_futuros(): void {
    $stmt = getDB()->prepare('SELECT * FROM evento WHERE fecha_fin >= CURDATE() ORDER BY fecha_inicio ASC');
    $stmt->execute();
    json_ok(array_map('fmt_evento', $stmt->fetchAll()));
}

function evento_create(): void {
    $db   = getDB();
    $body = get_body();
    validate_evento($body);
    $db->prepare(
        'INSERT INTO evento (titulo, tipo, descripcion, url_imagen, url_externa, provincia, localidad, pais, latitud, longitud, fecha_inicio, fecha_fin, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    )->execute([
        $body['titulo']      ?? null,
        $body['tipo']        ?? 'feria',
        $body['descripcion'] ?? null,
        $body['urlImagen']   ?? null,
        $body['urlExterna']  ?? null,
        $body['provincia'], $body['localidad'], $body['pais'],
        $body['latitud'], $body['longitud'], $body['fechaInicio'], $body['fechaFin'],
    ]);
    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare('SELECT * FROM evento WHERE id = ?');
    $stmt->execute([$newId]);
    json_ok(fmt_evento($stmt->fetch()));
}

function evento_update(int $id): void {
    $db   = getDB();
    $body = get_body();
    validate_evento($body);
    $stmt = $db->prepare('SELECT id FROM evento WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Entidad no encontrada');
    $db->prepare(
        'UPDATE evento SET titulo=?, tipo=?, descripcion=?, url_imagen=?, url_externa=?, provincia=?, localidad=?, pais=?, latitud=?, longitud=?, fecha_inicio=?, fecha_fin=? WHERE id=?'
    )->execute([
        $body['titulo']      ?? null,
        $body['tipo']        ?? 'feria',
        $body['descripcion'] ?? null,
        $body['urlImagen']   ?? null,
        $body['urlExterna']  ?? null,
        $body['provincia'], $body['localidad'], $body['pais'],
        $body['latitud'], $body['longitud'], $body['fechaInicio'], $body['fechaFin'], $id,
    ]);
    $stmt = $db->prepare('SELECT * FROM evento WHERE id = ?');
    $stmt->execute([$id]);
    json_ok(fmt_evento($stmt->fetch()));
}

function evento_delete(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM evento WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Entidad no encontrada');
    $db->prepare('DELETE FROM evento WHERE id = ?')->execute([$id]);
    http_response_code(204);
    exit;
}

function validate_evento(array $body): void {
    foreach (['titulo', 'provincia', 'localidad', 'pais', 'fechaInicio', 'fechaFin'] as $f) {
        if (empty($body[$f])) json_error(400, "Campo requerido: $f");
    }
    if (!isset($body['latitud']) || !isset($body['longitud']))
        json_error(400, 'latitud y longitud son requeridas');
    $tiposValidos = ['feria', 'taller', 'curso'];
    if (!empty($body['tipo']) && !in_array($body['tipo'], $tiposValidos, true))
        json_error(400, 'Tipo de evento no válido');
}

// ── CONFIG ──────────────────────────────────────────────────────────────────

function contact_send(): void {
    $body    = get_body();
    $nombre  = trim($body['nombre']  ?? '');
    $email   = trim($body['email']   ?? '');
    $asunto  = trim($body['asunto']  ?? 'Contacto desde la web');
    $mensaje = trim($body['mensaje'] ?? '');
    $hp      = trim($body['hp']      ?? '');

    if ($hp !== '') { json_ok(['ok' => true]); return; }

    if (!$nombre || !$email || !$mensaje)
        json_error(400, 'Rellena todos los campos obligatorios');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'El email introducido no es válido');

    require_once __DIR__ . '/lib/Exception.php';
    require_once __DIR__ . '/lib/PHPMailer.php';
    require_once __DIR__ . '/lib/SMTP.php';

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = false;
        $mail->SMTPSecure = false;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
        $mail->addAddress('info@artesanosdeltorno.es');
        $mail->addReplyTo($email, $nombre);

        $mail->Subject = "[AdT] $asunto — $nombre";
        $mail->Body    = "Nombre:  $nombre\nEmail:   $email\nAsunto:  $asunto\n\nMensaje:\n$mensaje";

        $mail->send();
        json_ok(['ok' => true]);
    } catch (\Throwable $e) {
        json_error(500, 'No se pudo enviar el mensaje. Escríbenos directamente a info@artesanosdeltorno.es');
    }
}

function config_get_site_media(): void {
    $asociacion = null;
    $galeria    = [];
    $hero       = [null, null, null];
    try {
        $db  = getDB();
        // Añadir columna hero_imgs si no existe
        try { $db->exec("ALTER TABLE configuracion ADD COLUMN hero_imgs TEXT NULL"); } catch (PDOException $e) {}
        $row     = $db->query('SELECT foto_asociacion, galeria, hero_imgs FROM configuracion WHERE id = 1')->fetch();
        $asociacion = $row['foto_asociacion'] ?? null;
        $galeria    = json_decode($row['galeria']    ?? '[]', true) ?: [];
        $hero       = json_decode($row['hero_imgs']  ?? '[]', true) ?: [null, null, null];
    } catch (PDOException $e) {}
    while (count($galeria) < 8) $galeria[] = ['url' => null, 'etiqueta' => ''];
    $galeria = array_slice($galeria, 0, 8);
    while (count($hero) < 3) $hero[] = null;
    $hero = array_slice($hero, 0, 3);
    json_ok(['asociacion' => $asociacion, 'galeria' => $galeria, 'hero' => $hero]);
}

function config_upload_hero(int $pos): void {
    if ($pos < 1 || $pos > 3) json_error(400, 'Posición inválida (1-3)');
    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK)
        json_error(400, 'No se ha proporcionado el archivo');
    $file = $_FILES['foto'];
    if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera el tamaño máximo de ' . MAX_UPLOAD_LABEL);
    $ext = file_ext($file['name']);
    validar_mime_imagen($file['tmp_name']);
    $dir = UPLOAD_PATH . '/site';
    foreach (glob($dir . "/hero-{$pos}.*") ?: [] as $old) backup_file($old);
    $filename = guardar_imagen_webp($file['tmp_name'], $dir, "hero-{$pos}", $ext);
    $url  = '/api/media/site/' . $filename;
    $db   = getDB();
    $row  = $db->query('SELECT hero_imgs FROM configuracion WHERE id = 1')->fetch();
    $hero = json_decode($row['hero_imgs'] ?? '[]', true) ?: [null, null, null];
    while (count($hero) < 3) $hero[] = null;
    $hero[$pos - 1] = $url;
    $db->prepare('UPDATE configuracion SET hero_imgs = ? WHERE id = 1')->execute([json_encode($hero)]);
    json_ok(['url' => $url]);
}

function config_delete_hero(int $pos): void {
    if ($pos < 1 || $pos > 3) json_error(400, 'Posición inválida (1-3)');
    $db   = getDB();
    $row  = $db->query('SELECT hero_imgs FROM configuracion WHERE id = 1')->fetch();
    $hero = json_decode($row['hero_imgs'] ?? '[]', true) ?: [null, null, null];
    while (count($hero) < 3) $hero[] = null;
    if ($hero[$pos - 1]) backup_file(UPLOAD_PATH . '/site/' . basename($hero[$pos - 1]));
    $hero[$pos - 1] = null;
    $db->prepare('UPDATE configuracion SET hero_imgs = ? WHERE id = 1')->execute([json_encode($hero)]);
    http_response_code(204); exit;
}

function config_upload_asociacion(): void {
    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK)
        json_error(400, 'No se ha proporcionado el archivo');
    $file = $_FILES['foto'];
    if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera el tamaño máximo de ' . MAX_UPLOAD_LABEL . '');
    $ext = file_ext($file['name']);
    validar_mime_imagen($file['tmp_name']);
    $dir = UPLOAD_PATH . '/site';
    foreach (glob($dir . '/asociacion.*') ?: [] as $old) backup_file($old);
    $filename = guardar_imagen_webp($file['tmp_name'], $dir, 'asociacion', $ext);
    $url = '/api/media/site/' . $filename;
    getDB()->prepare('UPDATE configuracion SET foto_asociacion = ? WHERE id = 1')->execute([$url]);
    json_ok(['url' => $url]);
}

function config_upload_galeria(int $pos): void {
    if ($pos < 1 || $pos > 8) json_error(400, 'Posición inválida (1-8)');
    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK)
        json_error(400, 'No se ha proporcionado el archivo');
    $file = $_FILES['foto'];
    if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera el tamaño máximo de ' . MAX_UPLOAD_LABEL . '');
    $ext = file_ext($file['name']);
    validar_mime_imagen($file['tmp_name']);
    $dir = UPLOAD_PATH . '/site';
    foreach (glob($dir . "/galeria-{$pos}.*") ?: [] as $old) backup_file($old);
    $filename = guardar_imagen_webp($file['tmp_name'], $dir, "galeria-{$pos}", $ext);
    $url = '/api/media/site/' . $filename;
    $db  = getDB();
    $row = $db->query('SELECT galeria FROM configuracion WHERE id = 1')->fetch();
    $galeria = json_decode($row['galeria'] ?? '[]', true) ?: [];
    while (count($galeria) < 8) $galeria[] = ['url' => null, 'etiqueta' => ''];
    $galeria[$pos - 1]['url'] = $url;
    $db->prepare('UPDATE configuracion SET galeria = ? WHERE id = 1')->execute([json_encode($galeria)]);
    json_ok(['url' => $url]);
}

function config_delete_asociacion(): void {
    $db  = getDB();
    $row = $db->query('SELECT foto_asociacion FROM configuracion WHERE id = 1')->fetch();
    if ($row['foto_asociacion']) {
        backup_file(UPLOAD_PATH . '/site/' . basename($row['foto_asociacion']));
    }
    $db->prepare('UPDATE configuracion SET foto_asociacion = NULL WHERE id = 1')->execute();
    http_response_code(204);
    exit;
}

function config_delete_galeria(int $pos): void {
    if ($pos < 1 || $pos > 8) json_error(400, 'Posición inválida (1-8)');
    $db  = getDB();
    $row = $db->query('SELECT galeria FROM configuracion WHERE id = 1')->fetch();
    $galeria = json_decode($row['galeria'] ?? '[]', true) ?: [];
    while (count($galeria) < 8) $galeria[] = ['url' => null, 'etiqueta' => ''];
    $url = $galeria[$pos - 1]['url'] ?? null;
    if ($url) {
        backup_file(UPLOAD_PATH . '/site/' . basename($url));
    }
    $galeria[$pos - 1]['url'] = null;
    $db->prepare('UPDATE configuracion SET galeria = ? WHERE id = 1')->execute([json_encode($galeria)]);
    http_response_code(204);
    exit;
}

function config_update_galeria_etiqueta(int $pos): void {
    if ($pos < 1 || $pos > 8) json_error(400, 'Posición inválida (1-8)');
    $etiqueta = trim(get_body()['etiqueta'] ?? '');
    $db  = getDB();
    $row = $db->query('SELECT galeria FROM configuracion WHERE id = 1')->fetch();
    $galeria = json_decode($row['galeria'] ?? '[]', true) ?: [];
    while (count($galeria) < 8) $galeria[] = ['url' => null, 'etiqueta' => ''];
    $galeria[$pos - 1]['etiqueta'] = $etiqueta;
    $db->prepare('UPDATE configuracion SET galeria = ? WHERE id = 1')->execute([json_encode($galeria)]);
    json_ok(['ok' => true]);
}

function config_get_anuncio(): void {
    $row = getDB()->query('SELECT anuncio FROM configuracion WHERE id = 1')->fetch();
    json_ok(['texto' => $row['anuncio'] ?? '']);
}

function config_put_anuncio(): void {
    $body  = get_body();
    $texto = trim($body['texto'] ?? '');
    getDB()->prepare('UPDATE configuracion SET anuncio = ? WHERE id = 1')->execute([$texto]);
    json_ok(['ok' => true]);
}

// ── SUPER ADMIN ─────────────────────────────────────────────────────────────

function admin_listar_artesanos(): void {
    $rows = getDB()->query('SELECT * FROM artesano ORDER BY nombre ASC')->fetchAll();
    json_ok(array_map('fmt_artesano', $rows));
}

function admin_toggle_permisos(int $id): void {
    $db   = getDB();
    $body = get_body();
    $stmt = $db->prepare('SELECT id, rol FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Artesano no encontrado');
    if ($row['rol'] === 'SUPER_ADMIN') json_error(403, 'No se pueden modificar los permisos de un super admin');
    $puedeEditar = isset($body['puede_editar']) ? (int)(bool)$body['puede_editar'] : 0;
    $db->prepare('UPDATE artesano SET puede_editar = ?, fecha_modificacion = NOW() WHERE id = ?')
       ->execute([$puedeEditar, $id]);
    json_ok(['ok' => true, 'puedeEditar' => (bool)$puedeEditar]);
}

function admin_cambiar_email(int $id): void {
    $db    = getDB();
    $body  = get_body();
    $email = trim($body['email'] ?? '');

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'El email no es válido');

    $stmt = $db->prepare('SELECT id FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Artesano no encontrado');

    if ($email !== '') {
        $dup = $db->prepare('SELECT id FROM artesano WHERE email = ? AND id != ?');
        $dup->execute([$email, $id]);
        if ($dup->fetch()) json_error(409, 'Ese email ya está en uso por otro artesano');
    }

    $db->prepare('UPDATE artesano SET email = ?, fecha_modificacion = NOW() WHERE id = ?')
       ->execute([$email ?: null, $id]);
    json_ok(['ok' => true]);
}

function admin_cambiar_slug(int $id): void {
    $db      = getDB();
    $body    = get_body();
    $newSlug = trim($body['slug'] ?? '');

    if (!$newSlug) json_error(400, 'El slug no puede estar vacío');
    if (!preg_match('/^[a-z0-9-]+$/', $newSlug))
        json_error(400, 'El slug solo puede contener letras minúsculas, números y guiones');

    $stmt = $db->prepare('SELECT slug FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Artesano no encontrado');

    $oldSlug = $row['slug'];
    if ($oldSlug === $newSlug) json_ok(['ok' => true]);

    // Comprobar que el nuevo slug no esté en uso
    $stmt = $db->prepare('SELECT id FROM artesano WHERE slug = ? AND id != ?');
    $stmt->execute([$newSlug, $id]);
    if ($stmt->fetch()) json_error(409, 'El slug ya está en uso');

    // Renombrar carpeta de uploads si existe
    $oldDir = UPLOAD_PATH . '/' . $oldSlug;
    $newDir = UPLOAD_PATH . '/' . $newSlug;
    if (is_dir($oldDir)) rename($oldDir, $newDir);

    // Actualizar URLs de medios que contengan el slug antiguo
    $db->prepare(
        "UPDATE artesano_media
         SET url = REPLACE(url, '/api/media/{$oldSlug}/', '/api/media/{$newSlug}/')
         WHERE artesano_id = ?"
    )->execute([$id]);

    // Actualizar foto_perfil si contiene el slug antiguo
    $db->prepare(
        "UPDATE artesano
         SET slug = ?,
             foto_perfil = REPLACE(COALESCE(foto_perfil,''), '/api/media/{$oldSlug}/', '/api/media/{$newSlug}/'),
             fecha_modificacion = NOW()
         WHERE id = ?"
    )->execute([$newSlug, $id]);

    $stmt = $db->prepare('SELECT * FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    json_ok(fmt_artesano($stmt->fetch()));
}

function admin_cambiar_password(int $id): void {
    $db   = getDB();
    $body = get_body();
    $pass = $body['password'] ?? '';
    if (strlen($pass) < 4) json_error(400, 'La contraseña debe tener al menos 4 caracteres');
    $stmt = $db->prepare('SELECT id FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Artesano no encontrado');
    $db->prepare('UPDATE artesano SET password = ?, fecha_modificacion = NOW() WHERE id = ?')
       ->execute([password_hash($pass, PASSWORD_BCRYPT), $id]);
    json_ok(['ok' => true]);
}

function admin_eliminar_artesano(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT slug, rol FROM artesano WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Artesano no encontrado');
    if ($row['rol'] === 'SUPER_ADMIN') json_error(403, 'No se puede eliminar una cuenta de super admin');

    $dir = UPLOAD_PATH . '/' . $row['slug'];
    if (is_dir($dir)) {
        if (!is_dir(BACKUP_PATH)) mkdir(BACKUP_PATH, 0755, true);
        $dest = BACKUP_PATH . '/' . $row['slug'];
        if (is_dir($dest)) $dest .= '_' . date('His');
        rename($dir, $dest);
    }
    $db->prepare('DELETE FROM artesano WHERE id = ?')->execute([$id]);
    http_response_code(204);
    exit;
}

function admin_crear_artesano(): void {
    $db   = getDB();
    $body = get_body();
    $nombre   = trim($body['nombre']   ?? '');
    $slug     = trim($body['slug']     ?? '');
    $usuario  = trim($body['usuario']  ?? '');
    $password = $body['password'] ?? '';
    $email    = trim($body['email']    ?? '');
    if (!$nombre || !$slug || !$usuario || !$password)
        json_error(400, 'Todos los campos son obligatorios');
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'El email no es válido');

    $stmt = $db->prepare('SELECT id FROM artesano WHERE slug = ?');
    $stmt->execute([$slug]);
    if ($stmt->fetch()) json_error(409, 'El slug ya está en uso');

    $stmt = $db->prepare('SELECT id FROM artesano WHERE usuario = ?');
    $stmt->execute([$usuario]);
    if ($stmt->fetch()) json_error(409, 'El usuario ya está en uso');

    $db->prepare(
        'INSERT INTO artesano (slug, nombre, usuario, password, rol, activo, email, fecha_creacion, fecha_modificacion)
         VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())'
    )->execute([$slug, $nombre, $usuario, password_hash($password, PASSWORD_BCRYPT), 'ARTESANO', $email ?: null]);

    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare('SELECT * FROM artesano WHERE id = ?');
    $stmt->execute([$newId]);
    json_ok(fmt_artesano($stmt->fetch()), 201);
}

// ── AUTH PASSWORD RECOVERY ───────────────────────────────────────────────────

function auth_forgot_password(): void {
    $body  = get_body();
    $email = trim($body['email'] ?? '');
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'Introduce un email válido');

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM artesano WHERE email = ? AND activo = 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    // Respuesta igual si el email existe o no (evita enumerar cuentas)
    if (!$row) { json_ok(['ok' => true]); return; }

    $token = bin2hex(random_bytes(32));
    $db->prepare('UPDATE artesano SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?')
       ->execute([$token, $row['id']]);

    $resetUrl = 'https://admin.artesanosdeltorno.es/?reset=' . $token;

    require_once __DIR__ . '/lib/Exception.php';
    require_once __DIR__ . '/lib/PHPMailer.php';
    require_once __DIR__ . '/lib/SMTP.php';

    $nombre = $row['nombre'] ?? '';
    $body_text = "Hola {$nombre},\n\nHas solicitado restablecer tu contraseña.\n\nHaz clic en el siguiente enlace (válido durante 1 hora):\n{$resetUrl}\n\nSi no lo has solicitado, ignora este mensaje.\n\nArtesanos del Torno";

    $sent = false;

    // Intento 1: mail() nativo (más fiable en hosting compartido para emails externos)
    if (function_exists('mail')) {
        $headers  = "From: " . SMTP_FROM_NAME . " <" . SMTP_USER . ">\r\n";
        $headers .= "Reply-To: " . SMTP_USER . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $sent = @mail($email, '=?UTF-8?B?' . base64_encode('Recuperación de contraseña — Artesanos del Torno') . '?=', $body_text, $headers);
    }

    // Intento 2: PHPMailer con SMTP local (fallback)
    if (!$sent) {
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = false;
            $mail->SMTPSecure = false;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
            $mail->addAddress($email, $nombre);
            $mail->Subject = 'Recuperación de contraseña — Artesanos del Torno';
            $mail->Body    = $body_text;
            $mail->send();
            $sent = true;
        } catch (\Throwable $e) {}
    }

    if (!$sent) {
        json_error(500, 'No se pudo enviar el email. Contacta con el administrador.');
    }

    json_ok(['ok' => true]);
}

function auth_reset_password(): void {
    $body     = get_body();
    $token    = trim($body['token']    ?? '');
    $password = $body['password'] ?? '';

    if (!$token) json_error(400, 'Token inválido');
    if (strlen($password) < 4) json_error(400, 'La contraseña debe tener al menos 4 caracteres');

    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM artesano WHERE reset_token = ? AND reset_token_expiry > NOW()');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) json_error(400, 'El enlace ha expirado o no es válido. Solicita uno nuevo.');

    $db->prepare('UPDATE artesano SET password = ?, reset_token = NULL, reset_token_expiry = NULL, fecha_modificacion = NOW() WHERE id = ?')
       ->execute([password_hash($password, PASSWORD_BCRYPT), $row['id']]);

    json_ok(['ok' => true]);
}

// ── NEWSLETTER ──────────────────────────────────────────────────────────────

function newsletter_subscribe(): void {
    $body   = get_body();
    $email  = trim($body['email'] ?? '');
    $nombre = trim($body['nombre'] ?? '');
    $hp     = $body['hp'] ?? '';

    if ($hp !== '') { json_ok(['ok' => true]); return; }
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'Introduce un email válido');

    $db    = getDB();
    $token = bin2hex(random_bytes(32));

    // Upsert: si ya existe y estaba de baja, lo reactiva
    $stmt = $db->prepare('SELECT id, activo FROM newsletter_suscriptores WHERE email = ?');
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    if ($row) {
        if ($row['activo']) json_ok(['ok' => true, 'yaExiste' => true]);
        $db->prepare('UPDATE newsletter_suscriptores SET nombre = ?, token_baja = ?, activo = 1 WHERE id = ?')
           ->execute([$nombre ?: null, $token, $row['id']]);
    } else {
        $db->prepare(
            'INSERT INTO newsletter_suscriptores (email, nombre, token_baja, activo, fecha_creacion)
             VALUES (?, ?, ?, 1, NOW())'
        )->execute([$email, $nombre ?: null, $token]);
    }

    json_ok(['ok' => true]);
}

function newsletter_baja(): void {
    $token = trim($_GET['token'] ?? '');
    if (!$token) json_error(400, 'Token no válido');

    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM newsletter_suscriptores WHERE token_baja = ? AND activo = 1');
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row) {
        // Puede que ya se haya dado de baja antes — no mostramos error
        json_ok(['ok' => true, 'mensaje' => 'Ya estabas dado de baja o el enlace no es válido.']);
        return;
    }

    $db->prepare('UPDATE newsletter_suscriptores SET activo = 0 WHERE id = ?')
       ->execute([$row['id']]);

    json_ok(['ok' => true, 'mensaje' => 'Te has dado de baja correctamente. No recibirás más emails.']);
}

function newsletter_listar(): void {
    $rows = getDB()->query(
        'SELECT id, email, nombre, activo, fecha_creacion FROM newsletter_suscriptores ORDER BY fecha_creacion DESC'
    )->fetchAll();
    json_ok(array_map(fn($r) => [
        'id'            => (int)$r['id'],
        'email'         => $r['email'],
        'nombre'        => $r['nombre'],
        'activo'        => (bool)$r['activo'],
        'fechaCreacion' => fmt_dt($r['fecha_creacion']),
    ], $rows));
}

function newsletter_eliminar(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM newsletter_suscriptores WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Suscriptor no encontrado');
    $db->prepare('DELETE FROM newsletter_suscriptores WHERE id = ?')->execute([$id]);
    http_response_code(204);
    exit;
}

function newsletter_enviar(): void {
    $body   = get_body();
    $asunto = trim($body['asunto'] ?? '');
    $texto  = trim($body['texto']  ?? '');

    if (!$asunto) json_error(400, 'El asunto es obligatorio');
    if (!$texto)  json_error(400, 'El contenido del email es obligatorio');

    $db   = getDB();
    $rows = $db->query(
        'SELECT email, nombre, token_baja FROM newsletter_suscriptores WHERE activo = 1'
    )->fetchAll();

    if (!$rows) json_ok(['ok' => true, 'enviados' => 0]);

    require_once __DIR__ . '/lib/Exception.php';
    require_once __DIR__ . '/lib/PHPMailer.php';
    require_once __DIR__ . '/lib/SMTP.php';

    $enviados = 0;
    $errores  = [];

    foreach ($rows as $row) {
        $bajaUrl  = 'https://artesanosdeltorno.es/baja-newsletter.html?token=' . $row['token_baja'];
        $nombre   = $row['nombre'] ?? '';

        $htmlBody = newsletter_html($asunto, $texto, $bajaUrl);
        $textBody = $texto
            . "\n\n--\nEl equipo de Artesanos del Torno\nPreservando y promoviendo el arte del torneado artesanal en España\nhttps://artesanosdeltorno.es · info@artesanosdeltorno.es"
            . "\n\n---\nRecibes este email porque te suscribiste a nuestra newsletter.\nPara darte de baja visita: $bajaUrl";

        $sent = false;

        if (function_exists('mail')) {
            $headers  = "From: " . SMTP_FROM_NAME . " <" . SMTP_USER . ">\r\n";
            $headers .= "Reply-To: " . SMTP_USER . "\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $sent = @mail($row['email'], '=?UTF-8?B?' . base64_encode($asunto) . '?=', $htmlBody, $headers);
        }

        if (!$sent) {
            try {
                $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                $mail->isSMTP();
                $mail->Host       = SMTP_HOST;
                $mail->SMTPAuth   = false;
                $mail->SMTPSecure = false;
                $mail->Port       = SMTP_PORT;
                $mail->CharSet    = 'UTF-8';
                $mail->setFrom(SMTP_USER, SMTP_FROM_NAME);
                $mail->addAddress($row['email'], $nombre);
                $mail->Subject = $asunto;
                $mail->isHTML(true);
                $mail->Body    = $htmlBody;
                $mail->AltBody = $textBody;
                $mail->send();
                $sent = true;
            } catch (\Throwable $e) {
                $errores[] = $row['email'];
            }
        }

        if ($sent) $enviados++;
    }

    json_ok(['ok' => true, 'enviados' => $enviados, 'errores' => count($errores), 'total' => count($rows)]);
}

function newsletter_html(string $asunto, string $texto, string $bajaUrl): string {
    $parrafos = preg_split('/\n{2,}/', trim($texto));
    $cuerpo   = implode('', array_map(
        fn($p) => '<p style="margin:0 0 1.3em;font-size:16px;color:#333333;line-height:1.75;font-family:Arial,sans-serif;">'
                  . nl2br(htmlspecialchars($p, ENT_QUOTES, 'UTF-8'))
                  . '</p>',
        $parrafos
    ));
    $asuntoEsc  = htmlspecialchars($asunto,  ENT_QUOTES, 'UTF-8');
    $bajaUrlEsc = htmlspecialchars($bajaUrl, ENT_QUOTES, 'UTF-8');

    return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{$asuntoEsc}</title>
</head>
<body style="margin:0;padding:0;background:#f4ede6;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4ede6;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(74,50,33,.12);">

      <!-- Cabecera -->
      <tr>
        <td style="background:#4a3221;padding:30px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c8a97e;font-family:Arial,sans-serif;">Asociación Nacional de Torneado Artesanal</p>
          <p style="margin:0;font-size:22px;color:#faf7f2;font-family:Georgia,'Times New Roman',serif;font-weight:normal;">Artesanos <em>del Torno</em></p>
        </td>
      </tr>

      <!-- Cuerpo -->
      <tr>
        <td style="padding:40px 40px 24px;">
          {$cuerpo}
        </td>
      </tr>

      <!-- Firma -->
      <tr>
        <td style="padding:0 40px 36px;">
          <hr style="border:none;border-top:1px solid #f0e8e0;margin:0 0 22px;">
          <p style="margin:0 0 3px;font-size:15px;font-weight:bold;color:#4a3221;font-family:Arial,sans-serif;">El equipo de Artesanos del Torno</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b4c35;font-family:Arial,sans-serif;font-style:italic;">Preservando y promoviendo el arte del torneado artesanal en España</p>
          <p style="margin:0;font-size:12px;color:#999999;font-family:Arial,sans-serif;">
            <a href="https://artesanosdeltorno.es" style="color:#4a3221;text-decoration:none;">artesanosdeltorno.es</a>
            &nbsp;·&nbsp;
            <a href="mailto:info@artesanosdeltorno.es" style="color:#4a3221;text-decoration:none;">info@artesanosdeltorno.es</a>
          </p>
        </td>
      </tr>

      <!-- Pie de baja -->
      <tr>
        <td style="background:#f9f5f0;border-top:1px solid #f0e8e0;padding:20px 40px;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#bbbbbb;text-align:center;font-family:Arial,sans-serif;line-height:1.8;">
            Recibes este email porque te suscribiste a la newsletter de Artesanos del Torno.<br>
            Si ya no deseas recibirla,
            <a href="{$bajaUrlEsc}" style="color:#6b4c35;text-decoration:underline;">pulsa aquí para darte de baja</a>.<br>
            También puedes escribirnos a
            <a href="mailto:info@artesanosdeltorno.es" style="color:#6b4c35;text-decoration:none;">info@artesanosdeltorno.es</a>.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
}

// ── MEDIA SERVING ───────────────────────────────────────────────────────────

function serve_media(string $slug, string $filename): void {
    $slug     = basename($slug);
    $filename = basename($filename);
    $filepath = UPLOAD_PATH . '/' . $slug . '/' . $filename;
    if (!file_exists($filepath)) json_error(404, 'Not Found');
    $mime = mime_content_type($filepath) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($filepath));
    header('Cache-Control: public, max-age=31536000');
    header('Access-Control-Allow-Origin: *');
    readfile($filepath);
    exit;
}

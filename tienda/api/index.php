<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

define('MIME_IMAGEN', ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp','image/heic','image/heif']);
define('MIME_VIDEO',  ['video/mp4','video/quicktime','video/webm','video/avi']);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$method  = $_SERVER['REQUEST_METHOD'];
$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path    = preg_replace('#^(/tienda)?/api#', '', is_string($rawPath) ? $rawPath : '/') ?? '';

try {
    // ── Públicas ─────────────────────────────────────────────────────────────
    if ($method === 'GET'  && $path === '/productos')                                        return productos_list();
    if ($method === 'GET'  && preg_match('#^/productos/([^/]+)$#', $path, $m))               return producto_get($m[1]);
    if ($method === 'GET'  && $path === '/zonas-envio')                                      return zonas_list();
    if ($method === 'GET'  && $path === '/stripe-pk')                                        return json_ok(['pk' => STRIPE_PK]);
    if ($method === 'POST' && $path === '/checkout')                                         return checkout_create();
    if ($method === 'POST' && $path === '/webhook')                                          return stripe_webhook();

    // ── Admin (solo SUPER_ADMIN) ──────────────────────────────────────────────
    if ($method === 'GET'  && $path === '/admin/pedidos')                                    { require_super_admin(); return pedidos_list(); }
    if ($method === 'GET'  && preg_match('#^/admin/pedidos/(\d+)$#', $path, $m))             { require_super_admin(); return pedido_get((int)$m[1]); }
    if ($method === 'PUT'  && preg_match('#^/admin/pedidos/(\d+)/estado$#', $path, $m))      { require_super_admin(); return pedido_set_estado((int)$m[1]); }
    if ($method === 'POST' && preg_match('#^/admin/pedidos/(\d+)/albaran$#', $path, $m))     { require_super_admin(); return pedido_enviar_albaran((int)$m[1]); }
    if ($method === 'GET'  && $path === '/admin/productos')                                  { require_super_admin(); return productos_list_admin(); }
    if ($method === 'POST' && $path === '/admin/productos')                                  { require_super_admin(); return producto_create(); }
    if ($method === 'PUT'  && preg_match('#^/admin/productos/(\d+)$#', $path, $m))           { require_super_admin(); return producto_update((int)$m[1]); }
    if ($method === 'DELETE' && preg_match('#^/admin/productos/(\d+)$#', $path, $m))         { require_super_admin(); return producto_delete((int)$m[1]); }
    if ($method === 'POST' && preg_match('#^/admin/productos/(\d+)/fotos$#', $path, $m))     { require_super_admin(); return producto_add_foto((int)$m[1]); }
    if ($method === 'DELETE' && preg_match('#^/admin/productos/(\d+)/fotos/(\d+)$#', $path, $m)) { require_super_admin(); return producto_del_foto((int)$m[1], (int)$m[2]); }
    if ($method === 'PUT'  && preg_match('#^/admin/productos/(\d+)/fotos/orden$#', $path, $m))   { require_super_admin(); return producto_reorder_fotos((int)$m[1]); }

    // ── n8n (clave fija, sin JWT) ─────────────────────────────────────────────
    if ($method === 'GET' && $path === '/n8n/pedidos-pendientes')               return n8n_pedidos_pendientes();

    // ── Cron HTTP (llamado desde cron-job.org) ────────────────────────────────
    if ($method === 'GET' && $path === '/cron/recordatorio')                    return cron_recordatorio_pedidos();

    json_error(404, 'Ruta no encontrada');
} catch (PDOException $e) {
    json_error(500, 'Error de base de datos');
} catch (\Throwable $e) {
    json_error(500, 'Error interno');
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

function require_super_admin(): void {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) json_error(401, 'Token requerido');
    $parts = explode('.', $m[1]);
    if (count($parts) !== 3) json_error(401, 'Token inválido');
    [$hB64, $pB64, $sig] = $parts;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "$hB64.$pB64", JWT_SECRET, true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $sig)) json_error(401, 'Token inválido');
    $payload = json_decode(base64_decode(strtr($pB64, '-_', '+/')), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) json_error(401, 'Token expirado');
    if (($payload['rol'] ?? '') !== 'SUPER_ADMIN') json_error(403, 'Solo super admin');
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function json_ok(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(int $status, string $msg): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg]);
    exit;
}

function get_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw ?: '{}', true) ?: [];
}

function file_ext(string $name): string {
    return strtolower(pathinfo($name, PATHINFO_EXTENSION));
}

function slugify(string $text): string {
    $text = mb_strtolower(trim($text));
    $map  = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u'];
    $text = strtr($text, $map);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

function backup_file(string $filepath): void {
    if (!file_exists($filepath)) return;
    if (!is_dir(BACKUP_PATH)) mkdir(BACKUP_PATH, 0755, true);
    $dest = BACKUP_PATH . '/' . basename($filepath);
    if (file_exists($dest)) {
        $info = pathinfo($dest);
        $dest = BACKUP_PATH . '/' . $info['filename'] . '_' . date('His') . '.' . ($info['extension'] ?? '');
    }
    rename($filepath, $dest);
}

function media_url(string $path): string {
    return TIENDA_URL . $path;
}

function fmt_producto(array $row, bool $withFotos = true): array {
    $db = getDB();
    $out = [
        'id'          => (int)$row['id'],
        'slug'        => $row['slug'],
        'nombre'      => $row['nombre'],
        'descripcion' => $row['descripcion'],
        'precio'      => (float)$row['precio'],
        'pesoGramos'  => (int)$row['peso_gramos'],
        'stock'       => (int)$row['stock'],
        'activo'      => (bool)$row['activo'],
        'destacado'   => (bool)$row['destacado'],
        'fotos'       => [],
    ];
    if ($withFotos) {
        $stmt = $db->prepare('SELECT * FROM producto_foto WHERE producto_id = ? ORDER BY orden ASC, id ASC');
        $stmt->execute([$row['id']]);
        $out['fotos'] = array_map(fn($f) => [
            'id'   => (int)$f['id'],
            'url'  => media_url($f['url']),
            'tipo' => $f['tipo'],
            'orden'=> (int)$f['orden'],
        ], $stmt->fetchAll());
    }
    return $out;
}

function fmt_pedido(array $row): array {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM pedido_item WHERE pedido_id = ?');
    $stmt->execute([$row['id']]);
    $items = array_map(fn($i) => [
        'id'             => (int)$i['id'],
        'productoId'     => $i['producto_id'] ? (int)$i['producto_id'] : null,
        'nombre'         => $i['nombre_producto'],
        'precioUnitario' => (float)$i['precio_unitario'],
        'cantidad'       => (int)$i['cantidad'],
    ], $stmt->fetchAll());

    return [
        'id'             => (int)$row['id'],
        'estado'         => $row['estado'],
        'nombre'         => $row['nombre'],
        'email'          => $row['email'],
        'telefono'       => $row['telefono'],
        'direccion'      => $row['direccion'],
        'ciudad'         => $row['ciudad'],
        'codigoPostal'   => $row['codigo_postal'],
        'provincia'      => $row['provincia'],
        'zona'           => $row['zona'],
        'subtotal'       => (float)$row['subtotal'],
        'gastosEnvio'    => (float)$row['gastos_envio'],
        'total'          => (float)$row['total'],
        'notas'          => $row['notas'],
        'stripeSession'  => $row['stripe_session_id'],
        'items'          => $items,
        'createdAt'      => $row['created_at'],
    ];
}

// ── IMAGEN ───────────────────────────────────────────────────────────────────

function convertir_a_webp(string $src, string $dest): bool {
    ob_start();
    try {
        if (class_exists('Imagick')) {
            $im = new Imagick($src);
            $im->setImageFormat('webp');
            $im->setImageCompressionQuality(82);
            $im->writeImage($dest);
            $im->destroy();
            ob_end_clean();
            return true;
        }
    } catch (\Throwable $e) { ob_end_clean(); }

    // GD fallback
    $mime = mime_content_type($src);
    $img  = match($mime) {
        'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($src),
        'image/png'               => @imagecreatefrompng($src),
        'image/gif'               => @imagecreatefromgif($src),
        'image/bmp'               => @imagecreatefrombmp($src),
        default                   => false,
    };
    if (!$img) return false;
    $ok = imagewebp($img, $dest, 82);
    imagedestroy($img);
    return $ok;
}

function guardar_imagen_webp(string $tmpPath, string $dir, string $baseName, string $origExt): string {
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $webpDest = $dir . '/' . $baseName . '.webp';
    if (convertir_a_webp($tmpPath, $webpDest)) return $baseName . '.webp';
    $origDest = $dir . '/' . $baseName . '.' . $origExt;
    move_uploaded_file($tmpPath, $origDest);
    return $baseName . '.' . $origExt;
}

function validar_mime(string $tmpPath, array $tipos): string {
    $mime = mime_content_type($tmpPath);
    if (!in_array($mime, $tipos)) json_error(415, 'Formato de archivo no permitido');
    return in_array($mime, MIME_IMAGEN) ? 'imagen' : 'video';
}

// ── STRIPE HTTP ───────────────────────────────────────────────────────────────

function stripe_post(string $endpoint, array $data): array {
    $ch = curl_init('https://api.stripe.com/v1' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($data),
        CURLOPT_USERPWD        => STRIPE_SK . ':',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res ?: '{}', true) ?? [];
}

function stripe_get(string $endpoint): array {
    $ch = curl_init('https://api.stripe.com/v1' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => STRIPE_SK . ':',
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res ?: '{}', true) ?? [];
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────

function enviar_email(string $to, string $toName, string $subject, string $body): void {
    $sent = false;

    if (function_exists('mail')) {
        $headers  = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM . ">\r\n";
        $headers .= "Reply-To: " . SMTP_FROM . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
    }

    if (!$sent) {
        try {
            require_once __DIR__ . '/lib/Exception.php';
            require_once __DIR__ . '/lib/PHPMailer.php';
            require_once __DIR__ . '/lib/SMTP.php';
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = SMTP_HOST;
            $mail->SMTPAuth   = false;
            $mail->SMTPSecure = false;
            $mail->Port       = SMTP_PORT;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
            $mail->addAddress($to, $toName);
            $mail->Subject    = $subject;
            $mail->Body       = $body;
            $mail->isHTML(true);
            $mail->send();
        } catch (\Throwable $e) {
            error_log('[Tienda email] ' . $e->getMessage());
        }
    }
}

// ── PRODUCTOS ─────────────────────────────────────────────────────────────────

function productos_list(): void {
    $stmt = getDB()->query('SELECT * FROM producto WHERE activo = 1 ORDER BY destacado DESC, created_at DESC');
    json_ok(array_map('fmt_producto', $stmt->fetchAll()));
}

function productos_list_admin(): void {
    $stmt = getDB()->query('SELECT * FROM producto ORDER BY created_at DESC');
    json_ok(array_map('fmt_producto', $stmt->fetchAll()));
}

function producto_get(string $slug): void {
    $stmt = getDB()->prepare('SELECT * FROM producto WHERE slug = ?');
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Producto no encontrado');
    json_ok(fmt_producto($row));
}

function producto_create(): void {
    $b = get_body();
    $nombre = trim($b['nombre'] ?? '');
    $precio = (float)($b['precio'] ?? 0);
    if (!$nombre || $precio <= 0) json_error(400, 'Nombre y precio son obligatorios');

    $slug = slugify($nombre);
    $db   = getDB();

    // Garantizar slug único
    $base = $slug; $i = 1;
    while ($db->prepare('SELECT id FROM producto WHERE slug = ?')->execute([$slug]) && $db->query("SELECT id FROM producto WHERE slug = '$slug'")->fetch()) {
        $slug = $base . '-' . $i++;
    }

    $stmt = $db->prepare('SELECT id FROM producto WHERE slug = ?');
    $stmt->execute([$slug]);
    if ($stmt->fetch()) $slug .= '-' . time();

    $db->prepare('INSERT INTO producto (slug, nombre, descripcion, precio, peso_gramos, stock, activo, destacado)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([
           $slug,
           $nombre,
           trim($b['descripcion'] ?? ''),
           $precio,
           (int)($b['pesoGramos'] ?? 500),
           (int)($b['stock'] ?? 1),
           isset($b['activo'])   ? (int)(bool)$b['activo']   : 1,
           isset($b['destacado']) ? (int)(bool)$b['destacado'] : 0,
       ]);
    $id = (int)$db->lastInsertId();
    $stmt = $db->prepare('SELECT * FROM producto WHERE id = ?');
    $stmt->execute([$id]);
    json_ok(fmt_producto($stmt->fetch()), 201);
}

function producto_update(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM producto WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Producto no encontrado');

    $b    = get_body();
    if (array_key_exists('nombre', $b) && trim($b['nombre'] ?? '') === '') json_error(400, 'El nombre no puede estar vacío');
    if (array_key_exists('precio', $b) && (float)$b['precio'] <= 0)        json_error(400, 'El precio debe ser mayor que 0');
    if (array_key_exists('stock',  $b) && (int)$b['stock']   < 0)          json_error(400, 'El stock no puede ser negativo');

    $sets = []; $params = [];
    $map  = ['nombre'=>'nombre','descripcion'=>'descripcion','precio'=>'precio',
              'pesoGramos'=>'peso_gramos','stock'=>'stock','activo'=>'activo','destacado'=>'destacado'];
    foreach ($map as $jsKey => $col) {
        if (array_key_exists($jsKey, $b)) {
            $sets[]   = "$col = ?";
            $params[] = in_array($col, ['activo','destacado']) ? (int)(bool)$b[$jsKey] : $b[$jsKey];
        }
    }
    if (!$sets) json_error(400, 'Nada que actualizar');
    $params[] = $id;
    $db->prepare('UPDATE producto SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    $stmt = $db->prepare('SELECT * FROM producto WHERE id = ?');
    $stmt->execute([$id]);
    json_ok(fmt_producto($stmt->fetch()));
}

function producto_delete(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM producto WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Producto no encontrado');

    // Backup de fotos
    $dir = UPLOAD_PATH . '/productos/' . $id;
    if (is_dir($dir)) {
        if (!is_dir(BACKUP_PATH)) mkdir(BACKUP_PATH, 0755, true);
        foreach (glob($dir . '/*') ?: [] as $f) backup_file($f);
        rmdir($dir);
    }
    $db->prepare('DELETE FROM producto WHERE id = ?')->execute([$id]);
    http_response_code(204); exit;
}

function producto_add_foto(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM producto WHERE id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetch()) json_error(404, 'Producto no encontrado');

    if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK)
        json_error(400, 'No se proporcionó archivo');

    $file = $_FILES['foto'];
    if ($file['size'] > MAX_UPLOAD_SIZE) json_error(413, 'El archivo supera ' . MAX_UPLOAD_LABEL);

    $allMimes = array_merge(MIME_IMAGEN, MIME_VIDEO);
    $tipo = validar_mime($file['tmp_name'], $allMimes);
    $ext  = file_ext($file['name']);
    $dir  = UPLOAD_PATH . '/productos/' . $id;
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $stmtMax = $db->prepare('SELECT COALESCE(MAX(orden),0)+1 FROM producto_foto WHERE producto_id = ?');
    $stmtMax->execute([$id]);
    $orden = (int)$stmtMax->fetchColumn();

    if ($tipo === 'imagen') {
        $filename = guardar_imagen_webp($file['tmp_name'], $dir, 'foto_' . time(), $ext);
    } else {
        $filename = 'video_' . time() . '.' . $ext;
        move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);
    }

    $url = '/uploads/productos/' . $id . '/' . $filename;
    $db->prepare('INSERT INTO producto_foto (producto_id, url, tipo, orden) VALUES (?, ?, ?, ?)')
       ->execute([$id, $url, $tipo, $orden]);

    json_ok(['id' => (int)$db->lastInsertId(), 'url' => media_url($url), 'tipo' => $tipo, 'orden' => $orden], 201);
}

function producto_del_foto(int $productoId, int $fotoId): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM producto_foto WHERE id = ? AND producto_id = ?');
    $stmt->execute([$fotoId, $productoId]);
    $foto = $stmt->fetch();
    if (!$foto) json_error(404, 'Foto no encontrada');

    backup_file(UPLOAD_PATH . '/' . ltrim($foto['url'], '/'));
    $db->prepare('DELETE FROM producto_foto WHERE id = ?')->execute([$fotoId]);
    http_response_code(204); exit;
}

function producto_reorder_fotos(int $productoId): void {
    $b = get_body();
    if (!isset($b['orden']) || !is_array($b['orden'])) json_error(400, 'Se esperaba {orden: [id, id, ...]}');
    $db   = getDB();
    $stmt = $db->prepare('UPDATE producto_foto SET orden = ? WHERE id = ? AND producto_id = ?');
    foreach ($b['orden'] as $i => $fotoId) {
        $stmt->execute([$i, (int)$fotoId, $productoId]);
    }
    http_response_code(204); exit;
}

// ── ZONAS DE ENVÍO ────────────────────────────────────────────────────────────

function zonas_list(): void {
    $rows = getDB()->query('SELECT * FROM zona_envio ORDER BY precio ASC')->fetchAll();
    json_ok(array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'nombre'       => $r['nombre'],
        'codigo'       => $r['codigo'],
        'precio'       => (float)$r['precio'],
        'gratisDesde'  => $r['gratis_desde'] ? (float)$r['gratis_desde'] : null,
    ], $rows));
}

function calcular_envio(string $zona, float $subtotal): float {
    $db   = getDB();
    $stmt = $db->prepare('SELECT precio, gratis_desde FROM zona_envio WHERE codigo = ?');
    $stmt->execute([$zona]);
    $row = $stmt->fetch();
    if (!$row) return 6.95;
    if ($row['gratis_desde'] !== null && $subtotal >= (float)$row['gratis_desde']) return 0.0;
    return (float)$row['precio'];
}

// ── CHECKOUT ─────────────────────────────────────────────────────────────────

function checkout_create(): void {
    $b = get_body();

    // Datos del comprador
    $nombre  = trim($b['nombre']       ?? '');
    $email   = trim($b['email']        ?? '');
    $tel     = trim($b['telefono']     ?? '');
    $dir     = trim($b['direccion']    ?? '');
    $ciudad  = trim($b['ciudad']       ?? '');
    $cp      = trim($b['codigoPostal'] ?? '');
    $prov    = trim($b['provincia']    ?? '');
    $zona    = trim($b['zona']         ?? 'peninsula');
    $notas   = trim($b['notas']        ?? '');
    $items   = $b['items'] ?? [];

    if (!$nombre || !$email || !$dir || !$ciudad || !$cp || !$items)
        json_error(400, 'Faltan datos obligatorios');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        json_error(400, 'Email inválido');
    if (!in_array($zona, ['peninsula', 'baleares']))
        json_error(400, 'Zona de envío inválida');

    $db = getDB();

    // Validar stock y calcular subtotal
    $subtotal    = 0.0;
    $lineItems   = [];
    $pedidoItems = [];

    foreach ($items as $item) {
        $productoId = (int)($item['id'] ?? 0);
        $cantidad   = (int)($item['cantidad'] ?? 1);
        if ($cantidad < 1) continue;

        $stmt = $db->prepare('SELECT * FROM producto WHERE id = ? AND activo = 1');
        $stmt->execute([$productoId]);
        $prod = $stmt->fetch();
        if (!$prod) json_error(400, "Producto #$productoId no disponible");
        if ($prod['stock'] < $cantidad) json_error(400, "Stock insuficiente para \"{$prod['nombre']}\"");

        $subtotal += (float)$prod['precio'] * $cantidad;
        $pedidoItems[] = ['producto_id' => $productoId, 'nombre' => $prod['nombre'], 'precio' => (float)$prod['precio'], 'cantidad' => $cantidad];

        // Stripe line item
        $lineItems[] = [
            'price_data[currency]'                         => 'eur',
            'price_data[unit_amount]'                      => (int)round($prod['precio'] * 100),
            'price_data[product_data][name]'               => $prod['nombre'],
            'quantity'                                     => $cantidad,
        ];
    }

    if (!$pedidoItems) json_error(400, 'El carrito está vacío');

    $envio = calcular_envio($zona, $subtotal);
    $total = $subtotal + $envio;

    // Envío como line item en Stripe
    if ($envio > 0) {
        $lineItems[] = [
            'price_data[currency]'                   => 'eur',
            'price_data[unit_amount]'                => (int)round($envio * 100),
            'price_data[product_data][name]'         => 'Gastos de envío (' . ($zona === 'baleares' ? 'Baleares' : 'Península') . ')',
            'quantity'                               => 1,
        ];
    }

    // Crear pedido en BD (estado=pendiente hasta confirmar pago)
    $db->prepare('INSERT INTO pedido (nombre, email, telefono, direccion, ciudad, codigo_postal, provincia, zona, subtotal, gastos_envio, total, notas)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([$nombre, $email, $tel, $dir, $ciudad, $cp, $prov, $zona, $subtotal, $envio, $total, $notas]);
    $pedidoId = (int)$db->lastInsertId();

    $stmtItem = $db->prepare('INSERT INTO pedido_item (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad) VALUES (?, ?, ?, ?, ?)');
    foreach ($pedidoItems as $pi) {
        $stmtItem->execute([$pedidoId, $pi['producto_id'], $pi['nombre'], $pi['precio'], $pi['cantidad']]);
    }

    // Construir Stripe Checkout Session
    $stripeData = [
        'mode'                         => 'payment',
        'success_url'                  => TIENDA_URL . '/exito.html?pedido=' . $pedidoId . '&session_id={CHECKOUT_SESSION_ID}',
        'cancel_url'                   => TIENDA_URL . '/cancelado.html?pedido=' . $pedidoId,
        'customer_email'               => $email,
        'metadata[pedido_id]'          => $pedidoId,
        'payment_intent_data[metadata][pedido_id]' => $pedidoId,
    ];

    // Añadir line items con índice
    $idx = 0;
    foreach ($lineItems as $li) {
        foreach ($li as $k => $v) {
            $stripeData["line_items[$idx][$k]"] = $v;
        }
        $idx++;
    }

    $session = stripe_post('/checkout/sessions', $stripeData);

    if (!isset($session['url'])) {
        json_error(500, 'Error al crear sesión de pago: ' . ($session['error']['message'] ?? 'desconocido'));
    }

    // Guardar stripe_session_id
    $db->prepare('UPDATE pedido SET stripe_session_id = ? WHERE id = ?')->execute([$session['id'], $pedidoId]);

    json_ok(['url' => $session['url'], 'pedidoId' => $pedidoId]);
}

// ── WEBHOOK DE STRIPE ─────────────────────────────────────────────────────────

function stripe_webhook(): void {
    $payload   = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

    // Verificar firma si hay secreto configurado
    if (STRIPE_WEBHOOK_SECRET !== '') {
        $parts = [];
        foreach (explode(',', $sigHeader) as $part) {
            [$k, $v] = array_pad(explode('=', $part, 2), 2, '');
            $parts[$k] = $v;
        }
        $ts  = $parts['t'] ?? '';
        $sig = $parts['v1'] ?? '';
        $expected = hash_hmac('sha256', "$ts.$payload", STRIPE_WEBHOOK_SECRET);
        if (!hash_equals($expected, $sig) || abs(time() - (int)$ts) > 300) {
            http_response_code(400); exit;
        }
    }

    $event = json_decode($payload, true);
    if (!$event) { http_response_code(400); exit; }

    if ($event['type'] === 'checkout.session.completed') {
        $session   = $event['data']['object'];
        $pedidoId  = (int)($session['metadata']['pedido_id'] ?? 0);
        $sessionId = $session['id'];
        $piId      = $session['payment_intent'] ?? null;

        if ($pedidoId) {
            $db = getDB();

            // Marcar como pagado
            $db->prepare('UPDATE pedido SET estado = "pagado", stripe_session_id = ?, stripe_payment_intent = ? WHERE id = ? AND estado = "pendiente"')
               ->execute([$sessionId, $piId, $pedidoId]);

            // Reducir stock
            $items = $db->prepare('SELECT producto_id, cantidad FROM pedido_item WHERE pedido_id = ?');
            $items->execute([$pedidoId]);
            foreach ($items->fetchAll() as $item) {
                $db->prepare('UPDATE producto SET stock = GREATEST(0, stock - ?) WHERE id = ?')
                   ->execute([$item['cantidad'], $item['producto_id']]);
            }

            // Email al cliente
            $pedido = $db->prepare('SELECT * FROM pedido WHERE id = ?');
            $pedido->execute([$pedidoId]);
            $p = $pedido->fetch();
            if ($p) {
                email_confirmacion_cliente($p, $db);
                email_aviso_admin($p, $db);
                email_albaran_cliente($p, $db);
            }
        }
    }

    http_response_code(200);
    echo json_encode(['received' => true]);
    exit;
}

function email_confirmacion_cliente(array $p, PDO $db): void {
    $items = $db->prepare('SELECT * FROM pedido_item WHERE pedido_id = ?');
    $items->execute([$p['id']]);
    $rows = $items->fetchAll();

    $lineas = '';
    foreach ($rows as $item) {
        $lineas .= "<tr><td style='padding:8px;border-bottom:1px solid #f0e8e0'>{$item['nombre_producto']}</td>"
                 . "<td style='padding:8px;border-bottom:1px solid #f0e8e0;text-align:center'>{$item['cantidad']}</td>"
                 . "<td style='padding:8px;border-bottom:1px solid #f0e8e0;text-align:right'>" . number_format($item['precio_unitario'], 2) . " €</td></tr>";
    }

    $envioTexto = $p['gastos_envio'] > 0 ? number_format($p['gastos_envio'], 2) . ' €' : 'Gratis';

    $html = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#2d1f14;max-width:600px;margin:0 auto'>
    <div style='background:#2d1f14;padding:24px;text-align:center'>
      <h1 style='color:#c8a97e;font-family:Georgia,serif;margin:0'>Girando Madera</h1>
      <p style='color:#faf7f2;margin:4px 0 0;font-size:13px'>Artesanos del Torno</p>
    </div>
    <div style='padding:32px 24px'>
      <h2 style='color:#2d1f14'>¡Pedido confirmado! 🪵</h2>
      <p>Hola <strong>{$p['nombre']}</strong>, hemos recibido tu pedido y está siendo preparado con cariño.</p>
      <p><strong>Número de pedido:</strong> #{$p['id']}</p>
      <table style='width:100%;border-collapse:collapse;margin:16px 0'>
        <thead><tr style='background:#f4ede6'>
          <th style='padding:8px;text-align:left'>Producto</th>
          <th style='padding:8px'>Cant.</th>
          <th style='padding:8px;text-align:right'>Precio</th>
        </tr></thead>
        <tbody>$lineas</tbody>
        <tfoot>
          <tr><td colspan='2' style='padding:8px;text-align:right'>Envío:</td><td style='padding:8px;text-align:right'>$envioTexto</td></tr>
          <tr style='font-weight:bold'><td colspan='2' style='padding:8px;text-align:right'>Total:</td><td style='padding:8px;text-align:right'>" . number_format($p['total'], 2) . " €</td></tr>
        </tfoot>
      </table>
      <p><strong>Dirección de envío:</strong><br>{$p['nombre']}<br>{$p['direccion']}<br>{$p['codigo_postal']} {$p['ciudad']}" . ($p['provincia'] ? ", {$p['provincia']}" : "") . "</p>
      <div style='background:#f9f5f0;border-left:3px solid #c8a97e;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0'>
        <p style='margin:0 0 4px;font-weight:700;color:#2d1f14;font-size:13px'>Plazos orientativos</p>
        <p style='margin:0;color:#7a6652;font-size:13px'>📦 Preparación y envío: <strong>3–5 días hábiles</strong><br>🚚 Entrega en destino: <strong>2–4 días hábiles</strong> desde el envío</p>
      </div>
      <p style='color:#7a6652;font-size:13px'>Te avisaremos por email cuando tu pedido sea enviado. Si tienes cualquier duda escríbenos a <a href='mailto:tienda@artesanosdeltorno.es' style='color:#8b5e3c'>tienda@artesanosdeltorno.es</a>.</p>
    </div>
    <div style='background:#f4ede6;padding:16px;text-align:center;font-size:12px;color:#7a6652'>
      <a href='" . TIENDA_URL . "' style='color:#8b5e3c'>girandomadera.artesanosdeltorno.es</a>
    </div>
    </body></html>";

    enviar_email($p['email'], $p['nombre'], "Pedido #{$p['id']} confirmado — Girando Madera", $html);
}

function email_aviso_admin(array $p, PDO $db): void {
    $items = $db->prepare('SELECT * FROM pedido_item WHERE pedido_id = ?');
    $items->execute([$p['id']]);
    $lineas = implode("\n", array_map(fn($i) => "- {$i['nombre_producto']} x{$i['cantidad']} ({$i['precio_unitario']} €)", $items->fetchAll()));

    $texto = "Nuevo pedido #{$p['id']}\n\nCliente: {$p['nombre']} <{$p['email']}>\nDirección: {$p['direccion']}, {$p['codigo_postal']} {$p['ciudad']}\n\nProductos:\n$lineas\n\nEnvío: {$p['gastos_envio']} €\nTotal: {$p['total']} €";

    enviar_email(EMAIL_TIENDA, 'Manuel Mateo', "🪵 Nuevo pedido #{$p['id']} — " . number_format($p['total'], 2) . ' €', nl2br($texto));
}

// ── PEDIDOS ───────────────────────────────────────────────────────────────────

function pedidos_list(): void {
    $rows = getDB()->query('SELECT * FROM pedido ORDER BY created_at DESC')->fetchAll();
    json_ok(array_map('fmt_pedido', $rows));
}

function pedido_get(int $id): void {
    $stmt = getDB()->prepare('SELECT * FROM pedido WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Pedido no encontrado');
    json_ok(fmt_pedido($row));
}

function pedido_set_estado(int $id): void {
    $b = get_body();
    $estado = $b['estado'] ?? '';
    $valid  = ['pendiente','pagado','enviado','entregado','cancelado'];
    if (!in_array($estado, $valid)) json_error(400, 'Estado inválido');
    $db = getDB();

    $stmtAntes = $db->prepare('SELECT estado FROM pedido WHERE id = ?');
    $stmtAntes->execute([$id]);
    $antes = $stmtAntes->fetchColumn();
    if (!$antes) json_error(404, 'Pedido no encontrado');

    $transiciones = [
        'pendiente' => ['pagado', 'cancelado'],
        'pagado'    => ['enviado', 'cancelado'],
        'enviado'   => ['entregado', 'cancelado'],
        'entregado' => [],
        'cancelado' => [],
    ];
    if ($antes === $estado) json_ok(['ok' => true]);
    if (!in_array($estado, $transiciones[$antes] ?? [])) {
        json_error(400, "No se puede cambiar de \"$antes\" a \"$estado\"");
    }

    $db->prepare('UPDATE pedido SET estado = ? WHERE id = ?')->execute([$estado, $id]);
    $stmt = $db->prepare('SELECT * FROM pedido WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error(404, 'Pedido no encontrado');

    if ($estado === 'enviado' && $antes !== 'enviado') {
        email_enviado_cliente($row);
    }

    json_ok(fmt_pedido($row));
}

function generar_html_albaran(array $p, array $rows): string {
    $zona  = $p['zona'] === 'baleares' ? 'Baleares' : 'Península';
    $fecha = date('d/m/Y', strtotime($p['created_at']));
    $envio = $p['gastos_envio'] > 0 ? number_format($p['gastos_envio'], 2) . ' €' : 'Gratis';
    $filas = '';
    foreach ($rows as $item) {
        $tot = number_format($item['precio_unitario'] * $item['cantidad'], 2);
        $filas .= "<tr>
          <td style='padding:.6rem .85rem;border-bottom:1px solid #f0e8e0'>{$item['nombre_producto']}</td>
          <td style='padding:.6rem .85rem;border-bottom:1px solid #f0e8e0;text-align:center'>{$item['cantidad']}</td>
          <td style='padding:.6rem .85rem;border-bottom:1px solid #f0e8e0;text-align:right'>" . number_format($item['precio_unitario'], 2) . " €</td>
          <td style='padding:.6rem .85rem;border-bottom:1px solid #f0e8e0;text-align:right;font-weight:700'>{$tot} €</td>
        </tr>";
    }
    return "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#2d1f14;max-width:650px;margin:0 auto'>
    <div style='background:#2d1f14;padding:24px;display:flex;justify-content:space-between;align-items:center'>
      <div><h1 style='color:#c8a97e;font-family:Georgia,serif;margin:0;font-size:1.4rem'>Girando Madera</h1>
      <p style='color:#faf7f2;margin:4px 0 0;font-size:12px'>por Manuel Mateo · tienda@artesanosdeltorno.es</p></div>
      <div style='text-align:right'><div style='color:#faf7f2;font-size:1.1rem;font-weight:700'>Albarán #{$p['id']}</div>
      <div style='color:#c8a97e;font-size:12px;margin-top:2px'>{$fecha}</div></div>
    </div>
    <div style='padding:24px;background:#f4ede6'>
      <div style='display:grid;grid-template-columns:1fr 1fr;gap:16px'>
        <div><div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#7a6652;margin-bottom:6px'>Cliente</div>
        <div>{$p['nombre']}<br>{$p['email']}" . ($p['telefono'] ? "<br>{$p['telefono']}" : "") . "</div></div>
        <div><div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#7a6652;margin-bottom:6px'>Dirección de envío</div>
        <div>{$p['nombre']}<br>{$p['direccion']}<br>{$p['codigo_postal']} {$p['ciudad']}" . ($p['provincia'] ? ", {$p['provincia']}" : "") . "<br><em>{$zona}</em></div></div>
      </div>
    </div>
    <div style='padding:24px'>
      <table style='width:100%;border-collapse:collapse;font-size:.9rem'>
        <thead><tr style='background:#2d1f14;color:white'>
          <th style='padding:.6rem .85rem;text-align:left'>Producto</th>
          <th style='padding:.6rem .85rem;text-align:center'>Cant.</th>
          <th style='padding:.6rem .85rem;text-align:right'>Precio</th>
          <th style='padding:.6rem .85rem;text-align:right'>Total</th>
        </tr></thead>
        <tbody>{$filas}</tbody>
        <tfoot>
          <tr><td colspan='3' style='padding:.5rem .85rem;text-align:right;color:#7a6652'>Envío ({$zona}):</td><td style='padding:.5rem .85rem;text-align:right'>{$envio}</td></tr>
          <tr style='font-weight:700;font-size:1rem'><td colspan='3' style='padding:.5rem .85rem;text-align:right;border-top:2px solid #2d1f14'>Total:</td>
          <td style='padding:.5rem .85rem;text-align:right;border-top:2px solid #2d1f14'>" . number_format($p['total'], 2) . " €</td></tr>
        </tfoot>
      </table>
      " . ($p['notas'] ? "<div style='background:#f4ede6;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:.85rem'><strong>Notas:</strong> {$p['notas']}</div>" : "") . "
    </div>
    <div style='background:#f4ede6;padding:16px;text-align:center;font-size:11px;color:#7a6652'>
      <a href='" . TIENDA_URL . "' style='color:#8b5e3c'>" . TIENDA_URL . "</a>
    </div></body></html>";
}

function email_albaran_cliente(array $p, PDO $db): void {
    $items = $db->prepare('SELECT * FROM pedido_item WHERE pedido_id = ?');
    $items->execute([$p['id']]);
    $rows = $items->fetchAll();
    $html = generar_html_albaran($p, $rows);
    enviar_email($p['email'], $p['nombre'], "Albarán pedido #{$p['id']} — Girando Madera", $html);
}

function pedido_enviar_albaran(int $id): void {
    $db   = getDB();
    $stmt = $db->prepare('SELECT * FROM pedido WHERE id = ?');
    $stmt->execute([$id]);
    $p = $stmt->fetch();
    if (!$p) json_error(404, 'Pedido no encontrado');
    email_albaran_cliente($p, $db);
    json_ok(['ok' => true]);
}

function email_enviado_cliente(array $p): void {
    $html = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#2d1f14;max-width:600px;margin:0 auto'>
    <div style='background:#2d1f14;padding:24px;text-align:center'>
      <h1 style='color:#c8a97e;font-family:Georgia,serif;margin:0'>Girando Madera</h1>
      <p style='color:#faf7f2;margin:4px 0 0;font-size:13px'>Artesanos del Torno</p>
    </div>
    <div style='padding:32px 24px'>
      <h2 style='color:#2d1f14'>¡Tu pedido está en camino! 📦</h2>
      <p>Hola <strong>{$p['nombre']}</strong>, tu pedido <strong>#{$p['id']}</strong> ha sido enviado y está en camino hacia ti.</p>
      <div style='background:#f4ede6;border-radius:10px;padding:1.25rem 1.5rem;margin:1.5rem 0'>
        <p style='margin:0 0 .5rem;font-weight:700;color:#2d1f14'>Dirección de entrega:</p>
        <p style='margin:0;color:#4a3221'>{$p['nombre']}<br>{$p['direccion']}<br>{$p['codigo_postal']} {$p['ciudad']}" . ($p['provincia'] ? ", {$p['provincia']}" : "") . "</p>
      </div>
      <p style='color:#7a6652;font-size:13px'>Si tienes cualquier duda escríbenos a <a href='mailto:tienda@artesanosdeltorno.es' style='color:#8b5e3c'>tienda@artesanosdeltorno.es</a>.</p>
    </div>
    <div style='background:#f4ede6;padding:16px;text-align:center;font-size:12px;color:#7a6652'>
      <a href='" . TIENDA_URL . "' style='color:#8b5e3c'>girandomadera.artesanosdeltorno.es</a>
    </div>
    </body></html>";

    enviar_email($p['email'], $p['nombre'], "Tu pedido #{$p['id']} está en camino — Girando Madera", $html);
}

// ── CRON HTTP ────────────────────────────────────────────────────────────────

function cron_recordatorio_pedidos(): void {
    if (($_GET['key'] ?? '') !== N8N_SECRET) json_error(401, 'No autorizado');

    $db   = getDB();
    $stmt = $db->query(
        "SELECT p.id, p.nombre, p.total, p.created_at,
                COUNT(i.id) AS num_items
         FROM pedido p
         LEFT JOIN pedido_item i ON i.pedido_id = p.id
         WHERE p.estado = 'pagado'
         GROUP BY p.id
         ORDER BY p.created_at ASC"
    );
    $pedidos = $stmt->fetchAll();

    if (empty($pedidos)) {
        json_ok(['enviado' => false, 'motivo' => 'Sin pedidos pendientes']);
        return;
    }

    $n     = count($pedidos);
    $filas = '';
    foreach ($pedidos as $p) {
        $fecha  = substr($p['created_at'], 0, 10);
        $total  = number_format((float)$p['total'], 2) . ' €';
        $filas .= "<tr>
            <td style='padding:8px 12px;border-bottom:1px solid #f0e8e0'><strong>#{$p['id']}</strong></td>
            <td style='padding:8px 12px;border-bottom:1px solid #f0e8e0'>{$p['nombre']}</td>
            <td style='padding:8px 12px;border-bottom:1px solid #f0e8e0;text-align:center'>{$p['num_items']}</td>
            <td style='padding:8px 12px;border-bottom:1px solid #f0e8e0;text-align:right'>{$total}</td>
            <td style='padding:8px 12px;border-bottom:1px solid #f0e8e0;color:#999'>{$fecha}</td>
        </tr>";
    }

    $plural  = $n > 1;
    $subject = "🪵 Tienes {$n} pedido" . ($plural ? 's' : '') . " pendiente" . ($plural ? 's' : '') . " de enviar";
    $html    = "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;color:#2d1f14;max-width:600px;margin:0 auto'>
    <div style='background:#2d1f14;padding:24px;text-align:center'>
      <h1 style='color:#c8a97e;font-family:Georgia,serif;margin:0'>Girando Madera</h1>
      <p style='color:#faf7f2;margin:4px 0 0;font-size:13px'>Recordatorio semanal</p>
    </div>
    <div style='padding:32px 24px'>
      <h2 style='color:#2d1f14'>Tienes {$n} pedido" . ($plural ? 's' : '') . " pendiente" . ($plural ? 's' : '') . " de enviar</h2>
      <p style='color:#7a6652'>Estos pedidos están pagados y esperan ser enviados:</p>
      <table style='width:100%;border-collapse:collapse;margin:16px 0'>
        <thead><tr style='background:#f4ede6'>
          <th style='padding:8px 12px;text-align:left'>Pedido</th>
          <th style='padding:8px 12px;text-align:left'>Cliente</th>
          <th style='padding:8px 12px;text-align:center'>Artículos</th>
          <th style='padding:8px 12px;text-align:right'>Total</th>
          <th style='padding:8px 12px;text-align:left'>Fecha</th>
        </tr></thead>
        <tbody>{$filas}</tbody>
      </table>
      <a href='https://admin.artesanosdeltorno.es/' style='display:inline-block;background:#2d1f14;color:#faf7f2;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px'>
        Ir al panel de admin →
      </a>
    </div>
    <div style='background:#f4ede6;padding:16px;text-align:center;font-size:12px;color:#7a6652'>
      Recordatorio automático semanal · Girando Madera
    </div>
    </body></html>";

    enviar_email(EMAIL_FIX, 'Manuel Mateo', $subject, $html);
    json_ok(['enviado' => true, 'pedidos' => $n]);
}

// ── N8N ──────────────────────────────────────────────────────────────────────

function n8n_pedidos_pendientes(): void {
    if (($_GET['key'] ?? '') !== N8N_SECRET) json_error(401, 'No autorizado');

    $db   = getDB();
    $stmt = $db->query(
        "SELECT p.id, p.nombre, p.email, p.total, p.created_at,
                COUNT(i.id) AS num_items
         FROM pedido p
         LEFT JOIN pedido_item i ON i.pedido_id = p.id
         WHERE p.estado = 'pagado'
         GROUP BY p.id
         ORDER BY p.created_at ASC"
    );
    $pedidos = $stmt->fetchAll();

    json_ok([
        'total'   => count($pedidos),
        'pedidos' => array_map(fn($p) => [
            'id'        => (int)$p['id'],
            'nombre'    => $p['nombre'],
            'email'     => $p['email'],
            'total'     => (float)$p['total'],
            'numItems'  => (int)$p['num_items'],
            'fecha'     => $p['created_at'],
        ], $pedidos),
    ]);
}

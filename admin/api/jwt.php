<?php
function _b64e(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function _b64d(string $data): string {
    $pad = 4 - strlen($data) % 4;
    if ($pad < 4) $data .= str_repeat('=', $pad);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_generate(string $usuario, string $slug, string $rol = 'ARTESANO', int $puedeEditar = 0): string {
    $header  = _b64e(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = _b64e(json_encode([
        'sub'          => $usuario,
        'slug'         => $slug,
        'rol'          => $rol,
        'puede_editar' => $puedeEditar,
        'iat'          => time(),
        'exp'          => time() + JWT_EXPIRATION,
    ]));
    $sig = _b64e(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function get_puede_editar(): bool {
    $data = get_jwt_data();
    if (!$data) return false;
    if (($data['rol'] ?? '') === 'SUPER_ADMIN') return true;
    return (bool)($data['puede_editar'] ?? false);
}

function jwt_validate(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expected = _b64e(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(_b64d($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function get_jwt_data(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) return null;
    return jwt_validate(substr($header, 7));
}

function get_authenticated_user(): ?string {
    $data = get_jwt_data();
    return $data ? $data['sub'] : null;
}

function require_auth(): string {
    $user = get_authenticated_user();
    if (!$user) json_error(401, 'No autorizado');
    return $user;
}

function require_super_admin(): string {
    $data = get_jwt_data();
    if (!$data) json_error(401, 'No autorizado');

    // JWT moderno incluye rol directamente
    if (($data['rol'] ?? '') === 'SUPER_ADMIN') return $data['sub'];

    // Fallback: token antiguo sin rol → verificar en BD
    $stmt = getDB()->prepare('SELECT rol FROM artesano WHERE usuario = ?');
    $stmt->execute([$data['sub']]);
    $row = $stmt->fetch();
    if ($row && ($row['rol'] ?? '') === 'SUPER_ADMIN') return $data['sub'];

    json_error(403, 'No autorizado');
}

# Guía de configuración — Artesanos del Torno

## Paso 1: Preparar el archivo .env

```bash
# En la raíz del proyecto, copiar el archivo de ejemplo
cp .env.example .env
```

Editar el archivo `.env` con tus valores. Aquí está la descripción de cada variable:

## Paso 2: Configurar la base de datos (Admin)

```env
# Base de datos principal de administración
DB_HOST=localhost           # Host MySQL
DB_PORT=3306               # Puerto (por defecto 3306)
DB_NAME=aetm               # Nombre de la BD
DB_USER=aetm               # Usuario MySQL
DB_PASS=tu_password_aqui   # Contraseña (generar algo seguro)
```

### Crear la BD e importar esquema:
```bash
mysql -u root -p
> CREATE DATABASE aetm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> exit;

mysql -u aetm -p aetm < admin/api/schema.sql
```

## Paso 3: Configurar la base de datos (Tienda)

```env
# Base de datos tienda (completamente separada)
TIENDA_DB_HOST=localhost
TIENDA_DB_PORT=3306
TIENDA_DB_NAME=tienda
TIENDA_DB_USER=tienda
TIENDA_DB_PASS=tu_password_aqui
```

### Crear la BD e importar esquema:
```bash
mysql -u root -p
> CREATE DATABASE tienda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> exit;

mysql -u tienda -p tienda < tienda/api/schema.sql
```

## Paso 4: Configurar JWT (Autenticación)

```env
JWT_SECRET=your_secret_here_min_32_chars
JWT_EXPIRATION=3600  # 1 hora en segundos
```

### Generar JWT_SECRET seguro:
En PHP:
```php
echo bin2hex(random_bytes(32));
```

En bash:
```bash
openssl rand -hex 32
```

En Node.js:
```javascript
require('crypto').randomBytes(32).toString('hex');
```

## Paso 5: Configurar SMTP (Email)

```env
SMTP_HOST=smtp.gmail.com              # O tu proveedor
SMTP_PORT=587                         # O 465 para SSL
SMTP_USER=tu_email@gmail.com          # Email de envío
SMTP_PASS=tu_app_password_aqui        # Contraseña de aplicación (NOT tu contraseña normal)
SMTP_FROM_NAME=Artesanos del Torno
```

**Para Gmail:**
1. Habilitar autenticación de dos factores
2. Generar "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
3. Copiar esa contraseña en `SMTP_PASS`

**Para tienda (SMTP separado, opcional):**
```env
TIENDA_SMTP_HOST=localhost
TIENDA_SMTP_PORT=25
TIENDA_SMTP_FROM=tienda@artesanosdeltorno.es
TIENDA_SMTP_FROM_NAME=Girando Madera
TIENDA_EMAIL=tienda@artesanosdeltorno.es  # Donde recibir pedidos
```

## Paso 6: Configurar Stripe (Pagos)

```env
# MODO TEST (por defecto, recomendado para desarrollo)
STRIPE_PK=pk_test_51TYS9v...     # Clave pública (visible en frontend)
STRIPE_SK=sk_test_51TYS9v...     # Clave privada (servidor solamente)
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook secret
```

### Obtener credenciales:
1. Ir a https://dashboard.stripe.com/apikeys
2. Copiar las claves de prueba
3. Para webhook: https://dashboard.stripe.com/webhooks → New endpoint
   - Endpoint URL: `https://tudominio.com/tienda/api/index.php?action=webhook`
   - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copiar signing secret a `STRIPE_WEBHOOK_SECRET`

### Para producción:
```env
# Una vez listo para live, cambiar a claves de producción
STRIPE_PK=pk_live_...
STRIPE_SK=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
```

## Paso 7: Configurar URLs y secretos adicionales

```env
# URL de la tienda
TIENDA_URL=https://girandomadera.artesanosdeltorno.es

# Secreto para n8n (automatizaciones post-compra)
N8N_SECRET=tu_secreto_n8n_aqui
```

## Paso 8: Permisos de directorios

```bash
# Crear directorios de uploads si no existen
mkdir -p admin/api/uploads
mkdir -p tienda/api/uploads

# Darles permisos de escritura
chmod 755 admin/api/uploads
chmod 755 tienda/api/uploads
```

## Paso 9: Configurar servidor web

### Apache (si usa .htaccess)
- Habilitar `mod_rewrite`: `a2enmod rewrite`
- Los archivos `.htaccess` ya están incluidos
- Reiniciar: `systemctl restart apache2`

### Nginx
Ver `nginx.conf` en la raíz. Copiar a `/etc/nginx/sites-available/`:
```bash
cp nginx.conf /etc/nginx/sites-available/artesanos
ln -s /etc/nginx/sites-available/artesanos /etc/nginx/sites-enabled/
systemctl restart nginx
```

## Verificar que todo funciona

### 1. Verificar conexión a BD
```bash
php admin/api/db.php  # Debería no mostrar errores
```

### 2. Verificar API admin
```bash
curl https://localhost/admin/api/index.php?action=artesano
```

### 3. Verificar API tienda
```bash
curl https://localhost/tienda/api/index.php  # GET status
```

## Solución de problemas

### "Can't connect to MySQL server"
- ✓ Verificar credenciales en `.env`
- ✓ MySQL/MariaDB está corriendo: `sudo systemctl status mysql`
- ✓ Base de datos existe: `mysql -u root -p -e "SHOW DATABASES;"`

### "SMTP_PASS appears empty"
- ✓ Revisar que las comillas no estén incluidas en `.env`
- ✓ Si tiene caracteres especiales, usar comillas: `SMTP_PASS="tu_pass!@#$"`

### "SSL certificate problem"
- ✓ En desarrollo: `define('SSL_VERIFY', false);` en config.php (NO en producción)
- ✓ En producción: Instalar certificado válido (Let's Encrypt es gratis)

### "Permission denied: /uploads"
- ✓ `chmod 755 admin/api/uploads`
- ✓ Verificar que el usuario del servidor web es propietario: `chown www-data:www-data uploads/`

## Seguridad - Checklist

- ✓ `.env` NO está en git (ver `.gitignore`)
- ✓ `.env` tiene permisos `600`: `chmod 600 .env`
- ✓ HTTPS obligatorio en producción
- ✓ JWT_SECRET tiene mínimo 32 caracteres (máximo 256)
- ✓ Contraseñas no están hardcodeadas en el código
- ✓ SMTP_PASS está en `.env`, no en config.php
- ✓ STRIPE_SK está en `.env`, nunca en JavaScript
- ✓ Base de datos tiene backups automáticos

## Próximos pasos

1. Crear primer usuario admin: https://tu-dominio.com/admin
2. Configurar webhook Stripe
3. Probar envío de email desde formulario de contacto
4. Activar SSL/TLS si aún no lo hizo
5. Revisar logs de servidor: `tail -f /var/log/apache2/error.log`

---

Para más información, ver `README.md` o `AGENTS.md`

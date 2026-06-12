# Artesanos del Torno — Web

Sitio web oficial de la Asociación Nacional de Torneado Artesanal de España. Incluye panel de administración, gestión de eventos, tienda de e-commerce con integración Stripe y newsletter automática.

**🌐 En producción en:** [artesanosdeltorno.es](https://artesanosdeltorno.es)

## 🚀 Configuración e instalación

Para instrucciones detalladas sobre cómo desplegar localmente, configura las bases de datos, el SMTP, Stripe y todos los requisitos, **[ve a SETUP.md](SETUP.md)**.

Resumen rápido:
1. Clonar repo
2. `cp .env.example .env` y rellenar credenciales
3. Importar esquemas SQL
4. Configurar servidor web (Apache/Nginx)

**Requisitos previos:**
- PHP 8.0+
- MySQL 5.7+ o MariaDB
- Servidor web (Apache con mod_rewrite o Nginx)

## 📁 Estructura del proyecto

```
artesanosDelTorno/
├── .env.example              ← Copiar a .env y rellenar credenciales
├── README.md                 ← Este archivo
├── nginx.conf                ← Configuración Nginx
├── .htaccess                 ← Configuración Apache
│
├── /                         ← Web pública (artesanosdeltorno.es)
│   ├── index.html
│   ├── artesano.html
│   ├── eventos.html
│   ├── historia.html
│   ├── junta.html
│   ├── privacidad.html
│   └── styles/ js/ img/      ← Assets públicos
│
├── /admin/                   ← Panel de administración
│   ├── index.html
│   ├── admin.js
│   ├── admin.css
│   │
│   └── /api/                 ← API REST (PHP)
│       ├── config.php        ← Carga variables desde .env
│       ├── index.php         ← Ruteador API
│       ├── db.php            ← Conexión a BD
│       ├── jwt.php           ← Manejo de tokens JWT
│       ├── schema.sql        ← Esquema de base de datos
│       └── /lib/
│           ├── PHPMailer.php ← Librería email
│           └── SMTP.php
│
├── /tienda/                  ← E-commerce
│   ├── index.html
│   ├── carrito.html
│   ├── producto.html
│   │
│   └── /api/                 ← API Tienda
│       ├── config.php        ← Carga variables desde .env + Stripe
│       ├── index.php
│       ├── db.php
│       ├── schema.sql        ← BD tienda (separada)
│       └── /lib/
│           ├── PHPMailer.php
│           └── Exception.php
│
└── /img/                     ← Imágenes estáticas
    └── junta/               ← Fotos junta directiva
```

## Tecnologías

- **Frontend:** HTML + CSS + Vanilla JS (sin frameworks)
- **Backend:** PHP 8+ con PDO (MySQL/MariaDB)
- **Base de datos:** MySQL (`aetm`) + tienda separada
- **Email:** PHPMailer + SMTP
- **Pagos:** Stripe API + webhooks
- **Mapa:** Leaflet.js + OpenStreetMap + Nominatim
- **Autenticación:** JWT en localStorage
- **SEO:** Sitemap dinámico, Schema.org JSON-LD

## ✨ Características principales

### 🌐 Web pública
- **Portada:** Hero section, galería de imágenes, estadísticas en tiempo real
- **Directorio:** Listado de artesanos con búsqueda, vista mapa interactivo (Leaflet.js + OpenStreetMap)
- **Agenda:** Eventos y cursos con información estructurada (Schema.org JSON-LD)
- **Newsletter:** Formulario de suscripción, página de baja con token único
- **Formulario de contacto** con validación y envío por email
- **Páginas informativas:** Historia, junta directiva, estatutos, galería, eventos
- **SEO optimizado:** Sitemap dinámico, robots.txt, datos estructurados, meta tags

### 🛡️ Panel de administración (`/admin`)
- **Autenticación:** Login JWT + recuperación de contraseña por email
- **Gestión de perfil:** Foto de perfil, biografía, redes sociales, email
- **Media:** Subida de imágenes y vídeos con conversión automática a WebP
- **Eventos:** CRUD completo de eventos y cursos
- **Anuncio configurable:** Mensaje visible en la portada
- **Super admin exclusivo:**
  - Gestión de artesanos: crear, eliminar, cambiar slug/email/password
  - Permisos granulares por usuario
  - Newsletter: ver suscriptores, redactar y enviar campañas

### 🛒 Tienda de e-commerce (`/tienda`)
- **Catálogo:** Productos con fotos, precios y disponibilidad
- **Carrito:** Gestión de artículos con persistencia en localStorage
- **Pago seguro:** Integración Stripe (test y producción)
- **Órdenes:** Albarán con número único, confirmación por email
- **Webhooks:** Sincronización automática de pagos con base de datos
- **Automatizaciones:** Integración n8n para flujos posteriores a compra

## API REST

Base URL: `https://admin.artesanosdeltorno.es/api`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/auth/login` | Login |
| POST | `/auth/forgot-password` | Solicitar reset |
| POST | `/auth/reset-password` | Aplicar reset |
| GET | `/artesano` | Listar artesanos |
| GET | `/artesano/:slug` | Artesano por slug |
| POST | `/artesano/:slug/perfil` | Actualizar perfil |
| GET/POST | `/artesano/:slug/media` | Media del artesano |
| DELETE | `/artesano/:slug/media/:id` | Eliminar media |
| GET | `/eventos` | Todos los eventos |
| GET | `/eventos/futuros` | Solo eventos futuros |
| POST | `/eventos` | Crear evento |
| PUT/DELETE | `/eventos/:id` | Editar/eliminar evento |
| GET | `/config/anuncio` | Leer anuncio |
| PUT | `/config/anuncio` | Guardar anuncio |
| GET | `/config/site-media` | Media del sitio |
| POST | `/contact` | Formulario de contacto |
| POST | `/newsletter/subscribe` | Suscribirse (público) |
| GET | `/newsletter/baja` | Darse de baja por token (público) |
| GET | `/newsletter/suscriptores` | Listar suscriptores (super admin) |
| POST | `/newsletter/enviar` | Enviar newsletter (super admin) |
| DELETE | `/newsletter/suscriptores/:id` | Eliminar suscriptor (super admin) |
| GET | `/admin/artesanos` | Listar artesanos (super admin) |
| POST | `/admin/artesanos` | Crear artesano (super admin) |
| PUT | `/admin/artesanos/:id/permisos` | Cambiar permisos (super admin) |
| PUT | `/admin/artesanos/:id/password` | Cambiar contraseña (super admin) |
| PUT | `/admin/artesanos/:id/email` | Cambiar email (super admin) |
| PUT | `/admin/artesanos/:id/slug` | Cambiar slug (super admin) |
| DELETE | `/admin/artesanos/:id` | Eliminar artesano (super admin) |

## Base de datos

```sql
artesano                  -- Usuarios y artesanos
evento                    -- Eventos y cursos
artesano_media            -- Fotos y vídeos de artesanos
configuracion             -- Anuncio, fotos portada, galería
newsletter_suscriptores   -- Suscriptores de la newsletter
```

Migraciones en `admin/api/schema.sql` — idempotente, se puede ejecutar varias veces.

## 📋 Variables de entorno (`.env`)

Todas las credenciales se cargan desde `.env`. Copiar `.env.example` y rellenar:

```bash
cp .env.example .env
```

Variables principales: `DB_*`, `JWT_SECRET`, `SMTP_*`, `STRIPE_*`, `N8N_SECRET`

**Para la lista completa y cómo generar cada una, [ve a SETUP.md](SETUP.md).**

**Nota:** `.env` NO está en git (ver `.gitignore`) — cada entorno tiene el suyo.

## 🚢 Despliegue en producción

Para instrucciones detalladas de despliegue, permisos, webhooks, SSL y troubleshooting, **[ve a SETUP.md](SETUP.md)**.

Checklist básico:
- [ ] Copiar archivos a servidor (FTP/SFTP)
- [ ] Crear `.env` con credenciales reales
- [ ] Importar esquemas SQL
- [ ] Permisos 755 en directorios `uploads/`
- [ ] Configurar webhook Stripe
- [ ] SSL/TLS habilitado

## 🔐 Seguridad

- Las contraseñas y credenciales se cargan desde `.env`, nunca están en el código
- JWT expira cada 3600 segundos (configurable)
- Stripe usa modo test por defecto — cambiar a producción en `.env` cuando esté listo
- CSRF protection en formularios
- Password hashing con `password_hash()` (bcrypt)

## 🔍 SEO y análisis

- Sitemap dinámico en XML generado desde PHP (`sitemap.php`)
- Datos estructurados Schema.org (JSON-LD) para eventos y artesanos
- Meta tags automáticos por página
- Open Graph para compartir en redes sociales
- Google Analytics integrado (parámetro configurable)
- Robots.txt optimizado

## 🛠️ Stack técnico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript (sin frameworks) |
| **Backend** | PHP 8.0+ con PDO |
| **Base de datos** | MySQL 5.7+ o MariaDB |
| **Autenticación** | JWT en localStorage |
| **Pagos** | Stripe API |
| **Mapas** | Leaflet.js + OpenStreetMap + Nominatim |
| **Email** | PHPMailer + SMTP |
| **Servidor** | Apache/Nginx con SSL/TLS |
| **Automatizaciones** | n8n |

## 📦 Dependencias PHP

- `PHPMailer` - Envío de correos seguro
- PDO - Driver nativo de PHP

## 🎯 Casos de uso demostrados

Este proyecto es un portfolio que demuestra:

✅ **Backend REST API** completa con autenticación JWT  
✅ **Base de datos relacional** bien diseñada (esquema SQL con migraciones)  
✅ **Seguridad:** variables de entorno, contraseñas hasheadas, CORS, validaciones  
✅ **E-commerce:** integración Stripe, webhooks, carrito persistente  
✅ **Envío de emails:** PHPMailer, newsletters, recuperación de contraseña  
✅ **Gestión de archivos:** upload, conversión de formatos, eliminación  
✅ **Frontend responsivo:** sin frameworks, rendimiento optimizado  
✅ **SEO optimizado:** sitemap dinámico, datos estructurados, open graph  
✅ **Automatizaciones:** integración con n8n para flujos post-compra  

## 📄 Licencia

Todos los derechos reservados a la Asociación Nacional de Torneado Artesanal de España.

## 👤 Contacto

Para consultas sobre el código o arquitectura de este proyecto, contactar a través de GitHub.

---

**Nota para revisores de portfolio:** Este es un proyecto en producción real con usuarios reales. Todos los datos sensibles (credenciales de BD, claves de API, tokens) están almacenados en `.env` siguiendo las mejores prácticas de seguridad.

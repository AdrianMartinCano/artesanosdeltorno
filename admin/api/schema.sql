CREATE DATABASE IF NOT EXISTS aetm
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aetm;

CREATE TABLE IF NOT EXISTS artesano (
    id                  BIGINT NOT NULL AUTO_INCREMENT,
    slug                VARCHAR(255),
    nombre              VARCHAR(255),
    especialidad        VARCHAR(255),
    localidad           VARCHAR(255),
    provincia           VARCHAR(255),
    anos_experiencia    VARCHAR(255),
    biografia           TEXT,
    foto_perfil         VARCHAR(255),
    activo              TINYINT(1),
    usuario             VARCHAR(255),
    password            VARCHAR(255),
    rol                 ENUM('ARTESANO','SUPER_ADMIN') NOT NULL DEFAULT 'ARTESANO',
    facebook            VARCHAR(255),
    twitter             VARCHAR(255),
    instagram           VARCHAR(255),
    tiktok              VARCHAR(255),
    web                 VARCHAR(255),
    fecha_creacion      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evento (
    id             BIGINT NOT NULL AUTO_INCREMENT,
    provincia      VARCHAR(255),
    localidad      VARCHAR(255),
    longitud       DOUBLE,
    latitud        DOUBLE,
    fecha_inicio   DATE,
    fecha_fin      DATE,
    pais           VARCHAR(255),
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artesano_media (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    artesano_id     BIGINT NOT NULL,
    tipo            ENUM('IMAGE','VIDEO'),
    url             VARCHAR(255),
    nombre_original VARCHAR(255),
    orden           VARCHAR(255),
    fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_media_artesano FOREIGN KEY (artesano_id)
        REFERENCES artesano(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion (
    id      BIGINT NOT NULL,
    anuncio VARCHAR(500),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuracion (id, anuncio) VALUES (1, '');

-- Añadir columna rol si la tabla ya existía sin ella
ALTER TABLE artesano
    ADD COLUMN IF NOT EXISTS rol ENUM('ARTESANO','SUPER_ADMIN') NOT NULL DEFAULT 'ARTESANO';

-- Columnas de redes sociales (por si la tabla existía antes de añadirlas)
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS facebook  VARCHAR(255);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS twitter   VARCHAR(255);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS tiktok    VARCHAR(255);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS web       VARCHAR(255);

ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS foto_asociacion VARCHAR(255);
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS galeria TEXT;

-- Campos nuevos para eventos
ALTER TABLE evento ADD COLUMN IF NOT EXISTS titulo      VARCHAR(255);
ALTER TABLE evento ADD COLUMN IF NOT EXISTS tipo        ENUM('feria','taller','curso') NOT NULL DEFAULT 'feria';
ALTER TABLE evento ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE evento ADD COLUMN IF NOT EXISTS url_imagen  VARCHAR(500);
ALTER TABLE evento ADD COLUMN IF NOT EXISTS url_externa VARCHAR(500);

-- Super admin inicial  (usuario: admin / password: admin123)
-- La contraseña se migra a bcrypt automáticamente en el primer login
INSERT IGNORE INTO artesano (id, slug, nombre, usuario, password, rol, activo, fecha_creacion, fecha_modificacion)
VALUES (1, 'superadmin', 'Super Admin', 'admin', 'admin123', 'SUPER_ADMIN', 1, NOW(), NOW());

-- Recuperación de contraseña
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS email              VARCHAR(255);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS reset_token        VARCHAR(64);
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME;

-- Permiso granular de edición (subir/eliminar media y edición completa del perfil)
ALTER TABLE artesano ADD COLUMN IF NOT EXISTS puede_editar TINYINT(1) NOT NULL DEFAULT 0;

-- Newsletter
CREATE TABLE IF NOT EXISTS newsletter_suscriptores (
    id             BIGINT NOT NULL AUTO_INCREMENT,
    email          VARCHAR(255) NOT NULL,
    nombre         VARCHAR(255),
    token_baja     VARCHAR(64) NOT NULL,
    activo         TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

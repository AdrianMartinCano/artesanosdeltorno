-- Base de datos: tienda
-- Ejecutar en phpMyAdmin sobre la BD "tienda"

CREATE TABLE IF NOT EXISTS producto (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio      DECIMAL(10,2) NOT NULL,
  peso_gramos INT NOT NULL DEFAULT 500,
  stock       INT NOT NULL DEFAULT 1,
  activo      TINYINT(1) NOT NULL DEFAULT 1,
  destacado   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS producto_foto (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  url         VARCHAR(500) NOT NULL,
  tipo        ENUM('imagen','video') NOT NULL DEFAULT 'imagen',
  orden       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS zona_envio (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  codigo       VARCHAR(50) NOT NULL UNIQUE,
  precio       DECIMAL(10,2) NOT NULL,
  gratis_desde DECIMAL(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO zona_envio (nombre, codigo, precio, gratis_desde) VALUES
  ('Península', 'peninsula', 6.95, 100.00),
  ('Baleares',  'baleares',  8.95, 100.00);

CREATE TABLE IF NOT EXISTS pedido (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  stripe_session_id     VARCHAR(300),
  stripe_payment_intent VARCHAR(300),
  estado                ENUM('pendiente','pagado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  nombre                VARCHAR(200) NOT NULL,
  email                 VARCHAR(200) NOT NULL,
  telefono              VARCHAR(50),
  direccion             VARCHAR(300) NOT NULL,
  ciudad                VARCHAR(100) NOT NULL,
  codigo_postal         VARCHAR(10) NOT NULL,
  provincia             VARCHAR(100),
  zona                  VARCHAR(50) NOT NULL DEFAULT 'peninsula',
  subtotal              DECIMAL(10,2) NOT NULL,
  gastos_envio          DECIMAL(10,2) NOT NULL,
  total                 DECIMAL(10,2) NOT NULL,
  notas                 TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_item (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id        INT NOT NULL,
  producto_id      INT,
  nombre_producto  VARCHAR(200) NOT NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL,
  cantidad         INT NOT NULL DEFAULT 1,
  FOREIGN KEY (pedido_id)   REFERENCES pedido(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

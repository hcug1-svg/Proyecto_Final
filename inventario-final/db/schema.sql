SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS inventario_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario_db;

CREATE TABLE IF NOT EXISTS categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL DEFAULT '',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion VARCHAR(500) NOT NULL DEFAULT '',
  categoria_id INT UNSIGNED NOT NULL,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  existencia INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias(id) ON DELETE RESTRICT,
  CONSTRAINT chk_productos_precio CHECK (precio >= 0),
  INDEX idx_productos_nombre (nombre),
  INDEX idx_productos_categoria_activo (categoria_id, activo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  tipo ENUM('ENTRADA', 'SALIDA') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  observacion VARCHAR(255) NOT NULL DEFAULT '',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id)
    REFERENCES productos(id) ON DELETE RESTRICT,
  CONSTRAINT chk_movimientos_cantidad CHECK (cantidad > 0),
  INDEX idx_movimientos_fecha (creado_en),
  INDEX idx_movimientos_producto (producto_id, id)
) ENGINE=InnoDB;

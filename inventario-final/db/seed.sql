SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE inventario_db;

INSERT IGNORE INTO categorias (nombre, descripcion) VALUES
  ('Electrónica', 'Accesorios y dispositivos electrónicos'),
  ('Papelería', 'Artículos de oficina y escuela'),
  ('Limpieza', 'Productos para limpieza y mantenimiento'),
  ('Alimentos', 'Productos alimenticios empacados');

INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'TEC-001', 'Mouse inalámbrico', 'Mouse óptico USB 2.4 GHz', id, 89.90, 8 FROM categorias WHERE nombre='Electrónica';
INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'TEC-002', 'Teclado mecánico', 'Teclado con conexión USB', id, 349.00, 4 FROM categorias WHERE nombre='Electrónica';
INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'PAP-001', 'Cuaderno universitario', '100 hojas, tamaño carta', id, 18.50, 15 FROM categorias WHERE nombre='Papelería';
INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'PAP-002', 'Bolígrafos azules', 'Caja de 12 bolígrafos', id, 24.00, 10 FROM categorias WHERE nombre='Papelería';
INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'LIM-001', 'Jabón líquido', 'Envase de 1 litro', id, 22.75, 6 FROM categorias WHERE nombre='Limpieza';
INSERT IGNORE INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo)
SELECT 'ALI-001', 'Café molido', 'Bolsa de 250 gramos', id, 42.00, 5 FROM categorias WHERE nombre='Alimentos';

INSERT INTO movimientos (producto_id, tipo, cantidad, observacion)
SELECT p.id, 'ENTRADA', s.cantidad, 'Inventario inicial (datos de demostración)'
FROM productos p
JOIN (
  SELECT 'TEC-001' sku, 24 cantidad UNION ALL
  SELECT 'TEC-002', 3 UNION ALL
  SELECT 'PAP-001', 65 UNION ALL
  SELECT 'PAP-002', 32 UNION ALL
  SELECT 'LIM-001', 12 UNION ALL
  SELECT 'ALI-001', 5
) s ON s.sku=p.sku
WHERE NOT EXISTS (
  SELECT 1 FROM movimientos m
  WHERE m.producto_id=p.id AND m.observacion='Inventario inicial (datos de demostración)'
);

UPDATE productos p SET existencia = (
  SELECT COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.cantidad ELSE -m.cantidad END),0)
  FROM movimientos m WHERE m.producto_id=p.id
);

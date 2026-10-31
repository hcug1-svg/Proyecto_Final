SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE inventario_db;

-- Corrección de datos que fueron insertados con codificación errónea (mojibake)
UPDATE categorias 
SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4),
    descripcion = CONVERT(CAST(CONVERT(descripcion USING latin1) AS BINARY) USING utf8mb4)
WHERE nombre LIKE '%Ã%';

UPDATE productos 
SET nombre = CONVERT(CAST(CONVERT(nombre USING latin1) AS BINARY) USING utf8mb4),
    descripcion = CONVERT(CAST(CONVERT(descripcion USING latin1) AS BINARY) USING utf8mb4)
WHERE nombre LIKE '%Ã%';

UPDATE movimientos 
SET observacion = CONVERT(CAST(CONVERT(observacion USING latin1) AS BINARY) USING utf8mb4)
WHERE observacion LIKE '%Ã%';

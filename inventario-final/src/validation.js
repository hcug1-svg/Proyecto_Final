const { HttpError } = require('./errors');
const { nextStock } = require('./domain/stock-policy');

function text(value, label, max, required = true) {
  if (typeof value !== 'string') throw new HttpError(400, `${label} debe ser texto.`);
  const normalized = value.trim();
  if (required && !normalized) throw new HttpError(400, `${label} es obligatorio.`);
  if (normalized.length > max) throw new HttpError(400, `${label} admite hasta ${max} caracteres.`);
  return normalized;
}

function integer(value, label, min = 0, max = 2147483647) {
  if (!/^\d+$/.test(String(value ?? '')) || !Number.isSafeInteger(Number(value)))
    throw new HttpError(400, `${label} debe ser un número entero.`);
  const number = Number(value);
  if (number < min || number > max)
    throw new HttpError(400, `${label} debe estar entre ${min} y ${max}.`);
  return number;
}

function price(value) {
  const raw = String(value ?? '');
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(raw))
    throw new HttpError(400, 'El precio debe ser positivo o cero, con máximo dos decimales.');
  return raw;
}

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'Envía un objeto JSON válido.');
  return body;
}

function categoryPayload(body) {
  body = requireObject(body);
  return {
    nombre: text(body.nombre, 'El nombre de la categoría', 100),
    descripcion: text(body.descripcion ?? '', 'La descripción', 255, false)
  };
}

function productPayload(body, create = false) {
  body = requireObject(body);
  const sku = text(body.sku, 'El SKU', 40).toUpperCase();
  if (!/^[A-Z0-9._-]{2,40}$/.test(sku))
    throw new HttpError(400, 'El SKU debe tener 2 a 40 caracteres: letras, números, punto, guion o guion bajo.');
  return {
    sku,
    nombre: text(body.nombre, 'El nombre del producto', 150),
    descripcion: text(body.descripcion ?? '', 'La descripción', 500, false),
    categoria_id: integer(body.categoria_id, 'La categoría', 1),
    precio: price(body.precio),
    stock_minimo: integer(body.stock_minimo ?? 0, 'El stock mínimo'),
    ...(create ? { stock_inicial: integer(body.stock_inicial ?? 0, 'El stock inicial') } : {})
  };
}

function movementPayload(body) {
  body = requireObject(body);
  if (!['ENTRADA', 'SALIDA'].includes(body.tipo))
    throw new HttpError(400, 'El tipo debe ser ENTRADA o SALIDA.');
  return {
    producto_id: integer(body.producto_id, 'El producto', 1),
    tipo: body.tipo,
    cantidad: integer(body.cantidad, 'La cantidad', 1),
    observacion: text(body.observacion ?? '', 'La observación', 255, false)
  };
}

function productFilters(query) {
  const filters = {};
  if (query.q !== undefined) filters.q = text(query.q, 'La búsqueda', 100);
  if (query.categoria_id !== undefined) filters.categoria_id = integer(query.categoria_id, 'La categoría', 1);
  if (query.stock_bajo !== undefined) {
    if (!['0', '1'].includes(query.stock_bajo)) throw new HttpError(400, 'Filtro de stock inválido.');
    filters.stock_bajo = query.stock_bajo === '1';
  }
  return filters;
}

function movementFilters(query) {
  const filters = { limite: integer(query.limite ?? 200, 'El límite', 1, 500) };
  if (query.producto_id !== undefined) filters.producto_id = integer(query.producto_id, 'El producto', 1);
  if (query.tipo !== undefined) {
    if (!['ENTRADA', 'SALIDA'].includes(query.tipo)) throw new HttpError(400, 'Tipo de movimiento inválido.');
    filters.tipo = query.tipo;
  }
  return filters;
}

module.exports = { HttpError, text, integer, price, categoryPayload, productPayload, movementPayload, nextStock, productFilters, movementFilters };

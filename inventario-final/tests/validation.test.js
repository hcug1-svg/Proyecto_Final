const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HttpError, integer, price, categoryPayload, productPayload, movementPayload, nextStock
} = require('../src/validation');

test('valida cantidades enteras no negativas y evita entradas inválidas', () => {
  assert.equal(integer('25', 'Cantidad'), 25);
  for (const invalid of [-1, '1.5', 'abc', 0]) {
    assert.throws(() => integer(invalid, 'Cantidad', 1), HttpError);
  }
});

test('precios: no se permiten negativos ni más de dos decimales', () => {
  assert.equal(price('125.90'), '125.90');
  assert.equal(price(0), '0');
  for (const invalid of ['-2', '12.345', 'abc', '1e2']) {
    assert.throws(() => price(invalid), HttpError);
  }
});

test('producto nuevo valida categoría, SKU y existencias iniciales', () => {
  const valid = productPayload({
    sku: 'sku-001', nombre: 'Producto', categoria_id: 2, precio: '12.50',
    stock_minimo: 3, stock_inicial: 10
  }, true);
  assert.equal(valid.sku, 'SKU-001');
  assert.equal(valid.stock_inicial, 10);
  assert.throws(() => productPayload({
    sku: 'sku-001', nombre: 'Producto', categoria_id: 0, precio: '12.50'
  }, true), HttpError);
  assert.throws(() => productPayload({
    sku: 'sku con espacios', nombre: 'Producto', categoria_id: 1, precio: '12.50'
  }, true), HttpError);
});

test('categoría requiere nombre y evita campos demasiado largos', () => {
  assert.equal(categoryPayload({ nombre: 'Oficina' }).descripcion, '');
  assert.throws(() => categoryPayload({ nombre: '' }), HttpError);
  assert.throws(() => categoryPayload({ nombre: 'x'.repeat(101) }), HttpError);
  assert.throws(() => categoryPayload(null), HttpError);
});

test('movimientos exigen producto, tipo válido y cantidad mayor que cero', () => {
  assert.equal(movementPayload({ producto_id: 3, tipo: 'ENTRADA', cantidad: 7 }).cantidad, 7);
  assert.throws(() => movementPayload({ producto_id: 3, tipo: 'SALIDA', cantidad: 0 }), HttpError);
  assert.throws(() => movementPayload({ producto_id: 3, tipo: 'AJUSTE', cantidad: 1 }), HttpError);
});

test('regla principal: las salidas nunca pueden dejar existencias negativas', () => {
  assert.equal(nextStock(12, 'SALIDA', 5), 7);
  assert.equal(nextStock(12, 'SALIDA', 12), 0);
  assert.equal(nextStock(12, 'ENTRADA', 5), 17);
  assert.throws(() => nextStock(12, 'SALIDA', 13), error =>
    error instanceof HttpError && error.status === 409 && /insuficientes/i.test(error.message));
});

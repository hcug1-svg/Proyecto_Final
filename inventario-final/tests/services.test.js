const test = require('node:test');
const assert = require('node:assert/strict');
const { MovementService } = require('../src/services/movement.service');
const { ProductService } = require('../src/services/product.service');
const { CategoryService } = require('../src/services/category.service');
const { MysqlUnitOfWork } = require('../src/infra/database');
const { MysqlProductRepository } = require('../src/repositories/product.repository');

function fakeStorage(startStock = 5) {
  const state = { stock: startStock, movements: [], products: [], categoryExists: true };
  const products = {
    list: async () => state.products,
    find: async id => state.products.find(p => p.id === id) || null,
    findActiveForUpdate: async id => id === 1 ? { existencia: state.stock } : null,
    setStock: async (id, value) => { state.stock = value; },
    create: async data => { state.products.push({ id: 1, ...data }); return 1; },
    update: async () => true,
    archive: async () => true
  };
  const movements = {
    list: async () => state.movements,
    recent: async () => state.movements,
    create: async data => { state.movements.push({ id: state.movements.length + 1, ...data }); return state.movements.length; }
  };
  const categories = { exists: async () => state.categoryExists };
  const unitOfWork = {
    execute: async operation => {
      const snapshot = { stock: state.stock, movements: [...state.movements], products: [...state.products] };
      try { return await operation({}); }
      catch (error) {
        state.stock = snapshot.stock;
        state.movements = snapshot.movements;
        state.products = snapshot.products;
        throw error;
      }
    }
  };
  return { state, products, movements, categories, unitOfWork };
}

test('LSP/DIP: servicio de inventario funciona con repositorios en memoria', async () => {
  const store = fakeStorage(5);
  const service = new MovementService(store);
  const result = await service.create({ producto_id: 1, tipo: 'ENTRADA', cantidad: 3, observacion: 'Proveedor' });
  assert.equal(result.existencia_actual, 8);
  assert.equal(store.state.stock, 8);
  assert.equal(store.state.movements.length, 1);
  const exit = await service.create({ producto_id: 1, tipo: 'SALIDA', cantidad: 8 });
  assert.equal(exit.existencia_actual, 0);
});

test('una salida inválida no cambia el stock ni registra movimientos', async () => {
  const store = fakeStorage(5);
  const service = new MovementService(store);
  await assert.rejects(service.create({ producto_id: 1, tipo: 'SALIDA', cantidad: 6 }),
    error => error.status === 409);
  assert.equal(store.state.stock, 5);
  assert.equal(store.state.movements.length, 0);
});

test('producto nuevo registra stock inicial como entrada con dependencia inyectada', async () => {
  const store = fakeStorage(0);
  const service = new ProductService(store);
  const result = await service.create({
    sku: 'pr-001', nombre: 'Producto seguro', categoria_id: 1,
    precio: '15.50', stock_minimo: 2, stock_inicial: 7
  });
  assert.equal(result.id, 1);
  assert.equal(store.state.products.length, 1);
  assert.deepEqual(store.state.movements.map(m => [m.tipo, m.cantidad]), [['ENTRADA', 7]]);
});

test('no se crea producto con categoría inexistente', async () => {
  const store = fakeStorage();
  store.state.categoryExists = false;
  await assert.rejects(new ProductService(store).create({
    sku: 'pr-001', nombre: 'Producto', categoria_id: 10, precio: '15.50'
  }), error => error.status === 400);
  assert.equal(store.state.products.length, 0);
});

test('no se elimina una categoría con productos vinculados', async () => {
  const service = new CategoryService({ countReferences: async () => 2, delete: async () => true });
  await assert.rejects(service.remove(1), error => error.status === 409);
});

test('unidad de trabajo MySQL hace rollback y libera conexión tras fallo', async () => {
  const actions = [];
  const connection = {
    beginTransaction: async () => { actions.push('begin'); },
    commit: async () => { actions.push('commit'); },
    rollback: async () => { actions.push('rollback'); },
    release: () => { actions.push('release'); }
  };
  const unit = new MysqlUnitOfWork({ getConnection: async () => connection });
  await assert.rejects(unit.execute(async () => { throw new Error('falló'); }), /falló/);
  assert.deepEqual(actions, ['begin', 'rollback', 'release']);
});

test('repositorio usa parámetros SQL y escapa comodines en búsquedas', async () => {
  const calls = [];
  const repo = new MysqlProductRepository({ query: async (sql, params) => { calls.push({ sql, params }); return [[]]; } });
  await repo.list({ q: "%' OR 1=1 --", categoria_id: 2, stock_bajo: true });
  assert.match(calls[0].sql, /p\.nombre LIKE \?/);
  assert.match(calls[0].sql, /p\.categoria_id=\?/);
  assert.doesNotMatch(calls[0].sql, /OR 1=1/);
  assert.match(calls[0].params[0], /\\%/);
  assert.equal(calls[0].params[2], 2);
});

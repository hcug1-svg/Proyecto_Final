const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

function fakeServices() {
  return {
    categories: {
      list: async () => [{ id: 1, nombre: 'Oficina' }],
      create: async data => ({ id: 2, nombre: data.nombre }),
      update: async id => ({ id }),
      remove: async () => ({ mensaje: 'Eliminada' })
    },
    products: {
      list: async () => [{ id: 1, nombre: 'Mouse' }],
      find: async id => ({ id, nombre: 'Mouse' }),
      create: async data => ({ id: 2, nombre: data.nombre }),
      update: async id => ({ id }),
      archive: async () => ({ mensaje: 'Archivado' })
    },
    movements: {
      list: async () => [],
      create: async () => ({ id: 1, existencia_actual: 10 })
    },
    dashboard: { get: async () => ({ resumen: {}, recientes: [] }) }
  };
}

async function withServer(options, operation) {
  const server = createApp({ services: fakeServices(), ...options }).listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await operation(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('API y frontend sirven contenido con cabeceras de seguridad', async () => withServer({}, async url => {
  const response = await fetch(`${url}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /StockFlow/);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${url}/api/health`)).status, 200);
  const products = await (await fetch(`${url}/api/productos`)).json();
  assert.equal(products[0].nombre, 'Mouse');
}));

test('API rechaza contenido no JSON y JSON mal formado', async () => withServer({}, async url => {
  const plain = await fetch(`${url}/api/categorias`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'nombre=Prueba' });
  assert.equal(plain.status, 415);
  const malformed = await fetch(`${url}/api/categorias`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
}));

test('API limita peticiones y oculta errores internos', async () => withServer({ rateLimitMax: 2 }, async url => {
  await fetch(`${url}/api/health`);
  await fetch(`${url}/api/health`);
  const limited = await fetch(`${url}/api/health`);
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).error, /Demasiadas/);
}));

test('API limita tamaño de JSON a 32 KB', async () => withServer({}, async url => {
  const response = await fetch(`${url}/api/categorias`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'x'.repeat(40000) })
  });
  assert.equal(response.status, 413);
}));

test('API rechaza un Host externo no autorizado', async () => withServer({}, async url => {
  const destination = new URL(url);
  const status = await new Promise((resolve, reject) => {
    const request = http.get({
      hostname: destination.hostname, port: destination.port, path: '/api/health',
      headers: { Host: 'evil.example' }
    }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
  });
  assert.equal(status, 403);
}));

// Prueba de ejecución no destructiva de la API contra MySQL real.
const assert = require('node:assert/strict');

const base = process.env.SMOKE_URL || 'http://localhost:3000';
const routes = ['/api/health', '/api/dashboard', '/api/categorias', '/api/productos', '/api/movimientos'];

async function main() {
  for (const route of routes) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, `${route}: HTTP ${response.status}`);
    const result = await response.json();
    if (route === '/api/health') assert.equal(result.ok, true);
    if (route === '/api/productos' || route === '/api/categorias' || route === '/api/movimientos')
      assert.ok(Array.isArray(result), `${route}: se esperaba un arreglo`);
    console.log(`✔ ${route} (${response.status})`);
  }
  console.log('Prueba de ejecución completada: API y MySQL responden correctamente.');
}

main().catch(error => { console.error('Prueba de ejecución fallida:', error.message); process.exitCode = 1; });

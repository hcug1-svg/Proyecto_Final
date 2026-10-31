/* Frontend sin framework: HTML + Bootstrap + JavaScript puro. */
const state = {
  page: 'dashboard', categories: [], products: [], allProducts: [], movements: [], dashboard: null
};
let productRequestSequence = 0;
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(value) || 0);
const number = value => new Intl.NumberFormat('es-GT').format(Number(value) || 0);
const date = value => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

async function api(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Verifica que Node.js y MySQL estén ejecutándose.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Error HTTP ${response.status}`);
  return result;
}

function toast(message, error = false) {
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${error ? 'danger' : 'success'} border-0`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHTML(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  $('#toastArea').append(el);
  el.addEventListener('hidden.bs.toast', () => el.remove());
  bootstrap.Toast.getOrCreateInstance(el, { delay: 4500 }).show();
}

function showError(message) {
  $('#errorBanner').textContent = message;
  $('#errorBanner').classList.remove('d-none');
}

function clearError() { $('#errorBanner').classList.add('d-none'); }

function selectPage(page) {
  if (!['dashboard', 'productos', 'categorias', 'movimientos'].includes(page)) return;
  state.page = page;
  const titles = {
    dashboard: ['Panel general', 'Resumen actualizado de tu negocio.'],
    productos: ['Productos', 'Administra el catálogo y las existencias.'],
    categorias: ['Categorías', 'Organiza tus productos por familias.'],
    movimientos: ['Movimientos', 'Controla las entradas y salidas del almacén.']
  };
  $('#pageTitle').textContent = titles[page][0];
  $('#pageSubtitle').textContent = titles[page][1];
  document.querySelectorAll('.page-view').forEach(view => view.classList.toggle('d-none', view.id !== `${page}View`));
  document.querySelectorAll('.menu-link').forEach(link => link.classList.toggle('active', link.dataset.page === page));
  $('#newProductButton').classList.toggle('d-none', page === 'productos');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function categoryOptions(selected = '') {
  return `<option value="">Selecciona una categoría</option>${state.categories.map(c =>
    `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${escapeHTML(c.nombre)}</option>`).join('')}`;
}

function productOptions(selected = '') {
  return `<option value="">Selecciona un producto</option>${state.allProducts.map(p =>
    `<option value="${p.id}" ${String(p.id) === String(selected) ? 'selected' : ''}>${escapeHTML(p.nombre)} (${escapeHTML(p.sku)})</option>`).join('')}`;
}

function renderFilters() {
  const catValue = $('#productCategoryFilter').value;
  $('#productCategoryFilter').innerHTML = '<option value="">Todas las categorías</option>' +
    state.categories.map(c => `<option value="${c.id}">${escapeHTML(c.nombre)}</option>`).join('');
  $('#productCategoryFilter').value = catValue;
  $('#productCategory').innerHTML = categoryOptions($('#productCategory').value);

  const movValue = $('#movementProductFilter').value;
  $('#movementProductFilter').innerHTML = '<option value="">Todos los productos</option>' +
    state.allProducts.map(p => `<option value="${p.id}">${escapeHTML(p.nombre)} (${escapeHTML(p.sku)})</option>`).join('');
  $('#movementProductFilter').value = movValue;
  $('#movementProduct').innerHTML = productOptions($('#movementProduct').value);
}

function renderDashboard() {
  if (!state.dashboard) return;
  const { resumen, recientes } = state.dashboard;
  $('#statProducts').textContent = number(resumen.productos);
  $('#statCategories').textContent = number(resumen.categorias);
  $('#statUnits').textContent = number(resumen.unidades);
  $('#statLow').textContent = number(resumen.stock_bajo);
  $('#statValue').textContent = money(resumen.valor_inventario);
  $('#recentMovements').innerHTML = recientes.length ? recientes.map(m => `
    <div class="recent-item"><span class="recent-icon ${m.tipo.toLowerCase()}">${m.tipo === 'ENTRADA' ? '↓' : '↑'}</span>
    <span class="recent-text"><strong>${escapeHTML(m.producto)}</strong><small>${escapeHTML(m.sku)} · ${date(m.creado_en)}</small></span>
    <span class="recent-qty ${m.tipo.toLowerCase()}">${m.tipo === 'ENTRADA' ? '+' : '−'}${number(m.cantidad)}</span></div>`).join('') :
    '<div class="empty-message">Todavía no se han registrado movimientos.</div>';
}

function renderProducts() {
  $('#productCount').textContent = `${state.products.length} producto(s) encontrados`;
  $('#productRows').innerHTML = state.products.length ? state.products.map(p => `
    <tr><td><span class="cell-title">${escapeHTML(p.nombre)}</span><span class="cell-subtitle sku-tag">${escapeHTML(p.sku)}</span></td>
    <td><span class="category-pill">${escapeHTML(p.categoria)}</span></td><td class="fw-semibold">${money(p.precio)}</td>
    <td><span class="cell-title">${number(p.existencia)}</span><span class="cell-subtitle">Mínimo: ${number(p.stock_minimo)}</span></td>
    <td><span class="stock-badge ${p.stock_bajo ? 'low' : 'ok'}">${p.stock_bajo ? '⚠ Stock bajo' : '✓ Disponible'}</span></td>
    <td><div class="table-actions"><button class="icon-button" data-action="movement" data-id="${p.id}" title="Registrar movimiento">⇄ Mover</button><button class="icon-button" data-action="edit-product" data-id="${p.id}" title="Editar producto">Editar</button><button class="icon-button danger" data-action="delete-product" data-id="${p.id}" title="Archivar producto">✕</button></div></td></tr>`).join('') :
    '<tr><td colspan="6" class="empty-message">No hay productos que coincidan con tu búsqueda.</td></tr>';
}

function renderCategories() {
  $('#categoryRows').innerHTML = state.categories.length ? state.categories.map(c => `
    <tr><td><span class="cell-title">${escapeHTML(c.nombre)}</span></td>
    <td>${escapeHTML(c.descripcion || 'Sin descripción')}</td><td><span class="category-pill">${number(c.total_productos)} producto(s)</span></td>
    <td><div class="table-actions"><button class="icon-button" data-action="edit-category" data-id="${c.id}">Editar</button><button class="icon-button danger" data-action="delete-category" data-id="${c.id}">Eliminar</button></div></td></tr>`).join('') :
    '<tr><td colspan="4" class="empty-message">Aún no hay categorías. Crea una para empezar.</td></tr>';
}

function renderMovements() {
  $('#movementRows').innerHTML = state.movements.length ? state.movements.map(m => `
    <tr><td>${date(m.creado_en)}</td><td><span class="cell-title">${escapeHTML(m.producto)}</span><span class="cell-subtitle">${escapeHTML(m.sku)}</span></td>
    <td><span class="movement-badge ${m.tipo.toLowerCase()}">${m.tipo === 'ENTRADA' ? '↓ ENTRADA' : '↑ SALIDA'}</span></td>
    <td><strong class="${m.tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}">${m.tipo === 'ENTRADA' ? '+' : '−'}${number(m.cantidad)}</strong></td>
    <td>${escapeHTML(m.observacion || '—')}</td></tr>`).join('') :
    '<tr><td colspan="5" class="empty-message">No hay movimientos para estos filtros.</td></tr>';
}

async function refreshProducts() {
  const sequence = ++productRequestSequence;
  const query = new URLSearchParams();
  const search = $('#productSearch').value.trim();
  if (search) query.set('q', search);
  if ($('#productCategoryFilter').value) query.set('categoria_id', $('#productCategoryFilter').value);
  if ($('#productLowFilter').checked) query.set('stock_bajo', '1');
  const products = query.size ? await api(`/productos?${query}`) : state.allProducts;
  if (sequence !== productRequestSequence) return;
  state.products = products;
  renderProducts();
}

async function refreshMovements() {
  const query = new URLSearchParams();
  if ($('#movementProductFilter').value) query.set('producto_id', $('#movementProductFilter').value);
  if ($('#movementTypeFilter').value) query.set('tipo', $('#movementTypeFilter').value);
  state.movements = await api(`/movimientos?${query}`);
  renderMovements();
}

async function refreshAll() {
  clearError();
  try {
    const [categories, dashboard, allProducts] = await Promise.all([api('/categorias'), api('/dashboard'), api('/productos')]);
    state.categories = categories;
    state.dashboard = dashboard;
    state.allProducts = allProducts;
    renderFilters();
    renderCategories();
    renderDashboard();
    await Promise.all([refreshProducts(), refreshMovements()]);
  } catch (error) {
    showError(error.message);
  }
}

function openProduct(id = null) {
  $('#productForm').reset();
  const product = id && state.products.find(p => p.id === Number(id));
  $('#productId').value = product ? product.id : '';
  $('#productModalTitle').textContent = product ? 'Editar producto' : 'Nuevo producto';
  $('#productSubmit').textContent = product ? 'Guardar cambios' : 'Guardar producto';
  $('#initialStockGroup').classList.toggle('d-none', Boolean(product));
  $('#productCategory').innerHTML = categoryOptions(product?.categoria_id);
  if (product) {
    $('#productSku').value = product.sku;
    $('#productName').value = product.nombre;
    $('#productDescription').value = product.descripcion;
    $('#productPrice').value = product.precio;
    $('#productMin').value = product.stock_minimo;
  }
  bootstrap.Modal.getOrCreateInstance($('#productModal')).show();
}

function openCategory(id = null) {
  $('#categoryForm').reset();
  const category = id && state.categories.find(c => c.id === Number(id));
  $('#categoryId').value = category ? category.id : '';
  $('#categoryModalTitle').textContent = category ? 'Editar categoría' : 'Nueva categoría';
  $('#categorySubmit').textContent = category ? 'Guardar cambios' : 'Guardar categoría';
  if (category) {
    $('#categoryName').value = category.nombre;
    $('#categoryDescription').value = category.descripcion;
  }
  bootstrap.Modal.getOrCreateInstance($('#categoryModal')).show();
}

function updateStockHint() {
  const product = state.allProducts.find(p => p.id === Number($('#movementProduct').value));
  const hint = $('#movementStockHint');
  hint.textContent = product ? `Existencia actual: ${number(product.existencia)} unidades. ${$('#movementType').value === 'SALIDA' ? 'No puedes retirar más unidades de las disponibles.' : 'La entrada sumará unidades.'}` : 'Selecciona un producto para consultar su existencia.';
}

function openMovement(type = 'ENTRADA', id = null) {
  $('#movementForm').reset();
  $('#movementType').value = type;
  $('#movementProduct').innerHTML = productOptions(id);
  $('#movementProduct').value = id ? String(id) : '';
  $('#movementModalTitle').textContent = type === 'SALIDA' ? 'Registrar salida' : 'Registrar entrada';
  updateStockHint();
  bootstrap.Modal.getOrCreateInstance($('#movementModal')).show();
}

async function submitForm(event, resource, formId, modalId) {
  event.preventDefault();
  const form = $(formId);
  const payload = Object.fromEntries(new FormData(form).entries());
  const id = payload.id;
  delete payload.id;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api(`/${resource}${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    bootstrap.Modal.getOrCreateInstance($(modalId)).hide();
    toast(id ? 'Cambios guardados correctamente.' : 'Registro creado correctamente.');
    await refreshAll();
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
}

async function submitMovement(event) {
  event.preventDefault();
  const form = $('#movementForm');
  const button = $('#movementSubmit');
  button.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const result = await api('/movimientos', { method: 'POST', body: JSON.stringify(payload) });
    bootstrap.Modal.getOrCreateInstance($('#movementModal')).hide();
    toast(`Movimiento registrado. Existencia actual: ${number(result.existencia_actual)}.`);
    await refreshAll();
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
}

async function deleteRecord(resource, id, label) {
  if (!confirm(`¿Seguro que deseas ${resource === 'productos' ? 'archivar' : 'eliminar'} ${label}?`)) return;
  try {
    const result = await api(`/${resource}/${id}`, { method: 'DELETE' });
    toast(result.mensaje);
    await refreshAll();
  } catch (error) { toast(error.message, true); }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.page) selectPage(button.dataset.page);
  const id = button.dataset.id;
  try {
    switch (button.dataset.action) {
      case 'new-product': openProduct(); break;
      case 'edit-product': openProduct(id); break;
      case 'delete-product': {
        const p = state.products.find(item => item.id === Number(id));
        if (p) await deleteRecord('productos', id, `el producto «${p.nombre}»`);
        break;
      }
      case 'new-category': openCategory(); break;
      case 'edit-category': openCategory(id); break;
      case 'delete-category': {
        const c = state.categories.find(item => item.id === Number(id));
        if (c) await deleteRecord('categorias', id, `la categoría «${c.nombre}»`);
        break;
      }
      case 'movement-entry': await openMovement('ENTRADA'); break;
      case 'movement-exit': await openMovement('SALIDA'); break;
      case 'movement': await openMovement('ENTRADA', id); break;
    }
  } catch (error) { toast(error.message, true); }
});

$('#newProductButton').addEventListener('click', () => openProduct());
$('#productForm').addEventListener('submit', event => submitForm(event, 'productos', '#productForm', '#productModal'));
$('#categoryForm').addEventListener('submit', event => submitForm(event, 'categorias', '#categoryForm', '#categoryModal'));
$('#movementForm').addEventListener('submit', submitMovement);
$('#movementProduct').addEventListener('change', updateStockHint);
$('#movementType').addEventListener('change', updateStockHint);
let searchTimer;
$('#productSearch').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => refreshProducts().catch(error => toast(error.message, true)), 220);
});
$('#productCategoryFilter').addEventListener('change', () => refreshProducts().catch(error => toast(error.message, true)));
$('#productLowFilter').addEventListener('change', () => refreshProducts().catch(error => toast(error.message, true)));
$('#movementProductFilter').addEventListener('change', () => refreshMovements().catch(error => toast(error.message, true)));
$('#movementTypeFilter').addEventListener('change', () => refreshMovements().catch(error => toast(error.message, true)));

selectPage('dashboard');
refreshAll();

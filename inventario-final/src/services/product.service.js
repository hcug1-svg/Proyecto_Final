const { HttpError, productPayload, productFilters } = require('../validation');

class ProductService {
  constructor({ products, categories, movements, unitOfWork }) {
    this.products = products;
    this.categories = categories;
    this.movements = movements;
    this.unitOfWork = unitOfWork;
  }

  list(filters) { return this.products.list(productFilters(filters)); }

  async find(id) {
    const product = await this.products.find(id);
    if (!product) throw new HttpError(404, 'Producto no encontrado.');
    return product;
  }

  async create(body) {
    const data = productPayload(body, true);
    return this.unitOfWork.execute(async connection => {
      if (!await this.categories.exists(data.categoria_id, connection))
        throw new HttpError(400, 'La categoría seleccionada no existe.');
      const id = await this.products.create(data, connection);
      if (data.stock_inicial > 0) {
        await this.movements.create({
          producto_id: id, tipo: 'ENTRADA', cantidad: data.stock_inicial,
          observacion: 'Inventario inicial'
        }, connection);
      }
      return { id, ...data };
    });
  }

  async update(id, body) {
    const data = productPayload(body);
    if (!await this.categories.exists(data.categoria_id))
      throw new HttpError(400, 'La categoría seleccionada no existe.');
    if (!await this.products.update(id, data)) throw new HttpError(404, 'Producto no encontrado.');
    return { id, ...data };
  }

  async archive(id) {
    if (!await this.products.archive(id)) throw new HttpError(404, 'Producto no encontrado.');
    return { mensaje: 'Producto archivado. El historial se conserva.' };
  }
}

module.exports = { ProductService };

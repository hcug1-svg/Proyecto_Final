const { HttpError, movementPayload, movementFilters } = require('../validation');
const { nextStock } = require('../domain/stock-policy');

class MovementService {
  constructor({ products, movements, unitOfWork }) {
    this.products = products;
    this.movements = movements;
    this.unitOfWork = unitOfWork;
  }

  list(filters) { return this.movements.list(movementFilters(filters)); }

  async create(body) {
    const data = movementPayload(body);
    return this.unitOfWork.execute(async connection => {
      // InnoDB bloquea el producto para serializar salidas concurrentes.
      const product = await this.products.findActiveForUpdate(data.producto_id, connection);
      if (!product) throw new HttpError(404, 'El producto no existe o está archivado.');
      const existencia = nextStock(product.existencia, data.tipo, data.cantidad);
      await this.products.setStock(data.producto_id, existencia, connection);
      const id = await this.movements.create(data, connection);
      return { id, ...data, existencia_actual: existencia };
    });
  }
}

module.exports = { MovementService };

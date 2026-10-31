const { HttpError, categoryPayload } = require('../validation');

class CategoryService {
  constructor(categories) { this.categories = categories; }

  list() { return this.categories.list(); }

  async create(body) {
    const data = categoryPayload(body);
    const id = await this.categories.create(data);
    return { id, ...data };
  }

  async update(id, body) {
    const data = categoryPayload(body);
    if (!await this.categories.update(id, data)) throw new HttpError(404, 'Categoría no encontrada.');
    return { id, ...data };
  }

  async remove(id) {
    if (await this.categories.countReferences(id) > 0)
      throw new HttpError(409, 'No se puede eliminar una categoría con productos asociados, incluso archivados.');
    if (!await this.categories.delete(id)) throw new HttpError(404, 'Categoría no encontrada.');
    return { mensaje: 'Categoría eliminada.' };
  }
}

module.exports = { CategoryService };

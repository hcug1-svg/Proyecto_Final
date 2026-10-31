const productSelect = `
  SELECT p.id, p.sku, p.nombre, p.descripcion, p.categoria_id,
         c.nombre AS categoria, p.precio, p.existencia, p.stock_minimo,
         (p.existencia <= p.stock_minimo) AS stock_bajo, p.creado_en, p.actualizado_en
  FROM productos p JOIN categorias c ON c.id = p.categoria_id`;

class MysqlProductRepository {
  constructor(pool) { this.pool = pool; }

  async list(filters) {
    const conditions = ['p.activo=1'];
    const params = [];
    if (filters.q) {
      // Los comodines introducidos por usuarios se interpretan literalmente.
      const value = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push('(p.nombre LIKE ? OR p.sku LIKE ?)');
      params.push(value, value);
    }
    if (filters.categoria_id) {
      conditions.push('p.categoria_id=?');
      params.push(filters.categoria_id);
    }
    if (filters.stock_bajo) conditions.push('p.existencia <= p.stock_minimo');
    const [rows] = await this.pool.query(`${productSelect} WHERE ${conditions.join(' AND ')} ORDER BY p.id DESC`, params);
    return rows;
  }

  async find(id) {
    const [rows] = await this.pool.query(`${productSelect} WHERE p.id=? AND p.activo=1`, [id]);
    return rows[0] || null;
  }

  async findActiveForUpdate(id, connection) {
    const [rows] = await connection.query('SELECT existencia FROM productos WHERE id=? AND activo=1 FOR UPDATE', [id]);
    return rows[0] || null;
  }

  async create(data, connection) {
    const [result] = await connection.query(`
      INSERT INTO productos (sku, nombre, descripcion, categoria_id, precio, stock_minimo, existencia)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.sku, data.nombre, data.descripcion, data.categoria_id, data.precio, data.stock_minimo, data.stock_inicial]);
    return result.insertId;
  }

  async update(id, data) {
    const [result] = await this.pool.query(`
      UPDATE productos SET sku=?, nombre=?, descripcion=?, categoria_id=?, precio=?, stock_minimo=?
      WHERE id=? AND activo=1`,
      [data.sku, data.nombre, data.descripcion, data.categoria_id, data.precio, data.stock_minimo, id]);
    return result.affectedRows > 0;
  }

  async archive(id) {
    const [result] = await this.pool.query('UPDATE productos SET activo=0 WHERE id=? AND activo=1', [id]);
    return result.affectedRows > 0;
  }

  async setStock(id, existence, connection) {
    await connection.query('UPDATE productos SET existencia=? WHERE id=?', [existence, id]);
  }
}

module.exports = { MysqlProductRepository };

class MysqlCategoryRepository {
  constructor(pool) { this.pool = pool; }

  async list() {
    const [rows] = await this.pool.query(`
      SELECT c.id, c.nombre, c.descripcion, c.creado_en,
             COUNT(p.id) AS total_productos
      FROM categorias c LEFT JOIN productos p ON p.categoria_id=c.id AND p.activo=1
      GROUP BY c.id ORDER BY c.nombre`);
    return rows;
  }

  async exists(id, db = this.pool) {
    const [rows] = await db.query('SELECT id FROM categorias WHERE id=?', [id]);
    return rows.length > 0;
  }

  async create(data) {
    const [result] = await this.pool.query('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)', [data.nombre, data.descripcion]);
    return result.insertId;
  }

  async update(id, data) {
    const [result] = await this.pool.query('UPDATE categorias SET nombre=?, descripcion=? WHERE id=?', [data.nombre, data.descripcion, id]);
    return result.affectedRows > 0;
  }

  async countReferences(id) {
    const [[row]] = await this.pool.query('SELECT COUNT(*) AS total FROM productos WHERE categoria_id=?', [id]);
    return row.total;
  }

  async delete(id) {
    const [result] = await this.pool.query('DELETE FROM categorias WHERE id=?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = { MysqlCategoryRepository };

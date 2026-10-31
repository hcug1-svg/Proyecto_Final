class MysqlMovementRepository {
  constructor(pool) { this.pool = pool; }

  async list(filters) {
    const conditions = [];
    const params = [];
    if (filters.producto_id) {
      conditions.push('m.producto_id=?');
      params.push(filters.producto_id);
    }
    if (filters.tipo) {
      conditions.push('m.tipo=?');
      params.push(filters.tipo);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await this.pool.query(`
      SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.observacion, m.creado_en,
             p.nombre AS producto, p.sku
      FROM movimientos m JOIN productos p ON p.id=m.producto_id
      ${where} ORDER BY m.id DESC LIMIT ?`, [...params, filters.limite]);
    return rows;
  }

  async recent(limit) { return this.list({ limite: limit }); }

  async create(data, connection) {
    const [result] = await connection.query(`
      INSERT INTO movimientos (producto_id, tipo, cantidad, observacion) VALUES (?, ?, ?, ?)`,
      [data.producto_id, data.tipo, data.cantidad, data.observacion]);
    return result.insertId;
  }
}

module.exports = { MysqlMovementRepository };

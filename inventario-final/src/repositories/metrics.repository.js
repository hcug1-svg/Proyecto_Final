class MysqlMetricsRepository {
  constructor(pool) { this.pool = pool; }

  async summary() {
    const [[row]] = await this.pool.query(`
      SELECT (SELECT COUNT(*) FROM categorias) AS categorias,
             COUNT(*) AS productos,
             COALESCE(SUM(existencia), 0) AS unidades,
             COALESCE(SUM(existencia <= stock_minimo), 0) AS stock_bajo,
             COALESCE(SUM(existencia * precio), 0) AS valor_inventario
      FROM productos WHERE activo=1`);
    return row;
  }
}

module.exports = { MysqlMetricsRepository };

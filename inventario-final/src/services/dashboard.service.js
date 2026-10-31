class DashboardService {
  constructor(metrics, movements) {
    this.metrics = metrics;
    this.movements = movements;
  }

  async get() {
    const [resumen, recientes] = await Promise.all([
      this.metrics.summary(), this.movements.recent(6)
    ]);
    return { resumen, recientes };
  }
}

module.exports = { DashboardService };

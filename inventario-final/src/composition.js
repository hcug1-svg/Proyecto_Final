const { createDatabase } = require('./infra/database');
const { MysqlCategoryRepository } = require('./repositories/category.repository');
const { MysqlProductRepository } = require('./repositories/product.repository');
const { MysqlMovementRepository } = require('./repositories/movement.repository');
const { MysqlMetricsRepository } = require('./repositories/metrics.repository');
const { CategoryService } = require('./services/category.service');
const { ProductService } = require('./services/product.service');
const { MovementService } = require('./services/movement.service');
const { DashboardService } = require('./services/dashboard.service');

// Composition root: las clases de negocio no importan MySQL ni Express.
function createComposition() {
  const { pool, unitOfWork } = createDatabase();
  const categories = new MysqlCategoryRepository(pool);
  const products = new MysqlProductRepository(pool);
  const movements = new MysqlMovementRepository(pool);
  const metrics = new MysqlMetricsRepository(pool);
  return {
    pool,
    services: {
      categories: new CategoryService(categories),
      products: new ProductService({ products, categories, movements, unitOfWork }),
      movements: new MovementService({ products, movements, unitOfWork }),
      dashboard: new DashboardService(metrics, movements)
    }
  };
}

module.exports = { createComposition };

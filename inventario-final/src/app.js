const express = require('express');
const path = require('node:path');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { categoryRoutes } = require('./http/categories.routes');
const { productRoutes } = require('./http/products.routes');
const { movementRoutes } = require('./http/movements.routes');
const { errorHandler } = require('./http/error-handler');

/** Crea la app sin inicializar MySQL ni abrir puertos: facilita pruebas por DI. */
function createApp({ services, healthCheck = async () => {}, rateLimitMax = 300 }) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag'); // Las respuestas de inventario no deben quedar obsoletas por caché.
  // Mitiga DNS rebinding: para otro dominio, configúralo explícitamente.
  const allowedHosts = new Set((process.env.ALLOWED_HOSTS || 'localhost,127.0.0.1,::1')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  app.use((req, res, next) => {
    if (!allowedHosts.has((req.hostname || '').toLowerCase()))
      return res.status(403).json({ error: 'Host no autorizado.' });
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null // Permite localhost HTTP durante desarrollo.
      }
    }
  }));
  app.use(compression());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }
  });
  app.use('/api', limiter);
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json'))
      return res.status(415).json({ error: 'Se requiere Content-Type: application/json.' });
    next();
  });
  app.use('/api', express.json({ limit: '32kb', strict: true }));
  app.get('/api/health', async (req, res) => {
    await healthCheck();
    res.json({ ok: true, mensaje: 'API y MySQL funcionando' });
  });
  app.get('/api/dashboard', async (req, res) => res.json(await services.dashboard.get()));
  app.use('/api/categorias', categoryRoutes(services.categories));
  app.use('/api/productos', productRoutes(services.products));
  app.use('/api/movimientos', movementRoutes(services.movements));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));

  app.use('/vendor/bootstrap', express.static(path.join(__dirname, '../node_modules/bootstrap/dist'), { maxAge: '1d' }));
  app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1h' }));
  app.use((req, res) => res.status(404).send('Página no encontrada.'));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

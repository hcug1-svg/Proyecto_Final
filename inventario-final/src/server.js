const { createApp } = require('./app');
const { createComposition } = require('./composition');

const { pool, services } = createComposition();
const app = createApp({ services, healthCheck: () => pool.query('SELECT 1') });
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';

async function start() {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await pool.query('SELECT 1');
      const server = app.listen(port, host, () => console.log(`StockFlow listo: http://localhost:${port}`));
      const shutdown = async () => {
        server.close(async () => { await pool.end(); process.exit(0); });
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      return;
    } catch (error) {
      if (attempt === 30) throw error;
      console.log(`Esperando MySQL (${attempt}/30)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

start().catch(error => {
  console.error('No se pudo iniciar el sistema:', error.message);
  process.exit(1);
});

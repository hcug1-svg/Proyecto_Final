const { Router } = require('express');

function movementRoutes(service) {
  const router = Router();
  router.get('/', async (req, res) => res.json(await service.list(req.query)));
  router.post('/', async (req, res) => res.status(201).json(await service.create(req.body)));
  return router;
}

module.exports = { movementRoutes };

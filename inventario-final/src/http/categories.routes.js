const { Router } = require('express');
const { integer } = require('../validation');

function categoryRoutes(service) {
  const router = Router();
  router.get('/', async (req, res) => res.json(await service.list()));
  router.post('/', async (req, res) => res.status(201).json(await service.create(req.body)));
  router.put('/:id', async (req, res) => res.json(await service.update(integer(req.params.id, 'El identificador', 1), req.body)));
  router.delete('/:id', async (req, res) => res.json(await service.remove(integer(req.params.id, 'El identificador', 1))));
  return router;
}

module.exports = { categoryRoutes };

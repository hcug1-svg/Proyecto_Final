const { HttpError } = require('../errors');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'El cuerpo de la solicitud es demasiado grande.' });
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error)
    return res.status(400).json({ error: 'JSON inválido.' });
  if (error.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ error: 'Ya existe un registro con ese nombre o SKU.' });
  if (error.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ error: 'El registro está en uso y no se puede eliminar.' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2')
    return res.status(400).json({ error: 'La categoría o el producto no existe.' });
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error('Error interno:', error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

module.exports = { errorHandler };

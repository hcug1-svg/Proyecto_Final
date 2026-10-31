const { HttpError } = require('../errors');

// Regla de dominio: ninguna operación puede producir existencias negativas.
function nextStock(current, type, quantity) {
  if (!Number.isSafeInteger(current) || current < 0 ||
      !Number.isSafeInteger(quantity) || quantity <= 0 ||
      !['ENTRADA', 'SALIDA'].includes(type)) {
    throw new HttpError(400, 'Datos de movimiento inválidos.');
  }
  const result = type === 'ENTRADA' ? current + quantity : current - quantity;
  if (result < 0) throw new HttpError(409, `Existencias insuficientes. Disponibles: ${current}.`);
  if (result > 4294967295) throw new HttpError(409, 'La existencia excede el máximo permitido.');
  return result;
}

module.exports = { nextStock };

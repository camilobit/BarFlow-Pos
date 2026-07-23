import { AppError } from '../utils/AppError.js';

/**
 * Valida req.body contra un schema de Zod.
 * Uso: router.post('/x', validate(crearPedidoSchema), controller)
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new AppError('Datos inválidos.', 422, details));
    }
    req.body = result.data;
    next();
  };
}

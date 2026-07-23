import { AppError } from '../utils/AppError.js';
import { response } from '../utils/response.utils.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  if (!isAppError) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  return response.error(
    res,
    isAppError ? err.message : 'Error interno del servidor.',
    statusCode,
    isAppError ? err.details : undefined
  );
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

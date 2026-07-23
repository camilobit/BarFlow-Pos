/**
 * Envoltura de respuesta consistente para toda la API: siempre
 * { success, message, data }. Facilita que el frontend tenga un único
 * punto de "desempaquetado" y que los errores nunca vengan en un
 * formato distinto al de los datos.
 */
export const response = {
  success: (res, data = null, message = 'OK', statusCode = 200) =>
    res.status(statusCode).json({ success: true, message, data }),

  created: (res, data = null, message = 'Creado exitosamente') =>
    res.status(201).json({ success: true, message, data }),

  noContent: (res) => res.status(204).send(),

  error: (res, message = 'Error interno', statusCode = 500, errors = null) =>
    res.status(statusCode).json({ success: false, message, ...(errors && { errors }) }),
};

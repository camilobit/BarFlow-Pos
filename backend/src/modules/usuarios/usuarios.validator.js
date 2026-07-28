import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  rol: z.enum(['admin_negocio', 'barra', 'mesero']),
  negocio_id: z.string().uuid().optional(),
  barra_id: z.string().uuid().nullable().optional(),
  // Acepta '' como "sin PIN" (un <input> vacío en el frontend manda '',
  // no undefined) y lo convierte a undefined antes de validar el largo.
  pin: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || v.length === 4, { message: 'El PIN debe tener 4 dígitos' }),
});

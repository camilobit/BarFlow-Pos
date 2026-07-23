import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  rol: z.enum(['admin_negocio', 'barra', 'mesero']),
  negocio_id: z.string().uuid().optional(),
  pin: z.string().length(4).optional(),
});

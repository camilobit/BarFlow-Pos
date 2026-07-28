import { z } from 'zod';

export const crearNegocioSchema = z.object({
  nombre: z.string().min(1),
  slug: z.string().min(1),
  ciudad: z.string().optional(),
  pais: z.string().default('CO'),
  // Opcional: crea el primer admin_negocio en la misma operación
  admin_nombre: z.string().optional(),
  admin_apellido: z.string().optional(),
  admin_email: z.string().email().optional().or(z.literal('')),
  admin_password: z.string().min(6).optional().or(z.literal('')),
});

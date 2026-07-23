import { z } from 'zod';

export const crearNegocioSchema = z.object({
  nombre: z.string().min(1),
  slug: z.string().min(1),
  ciudad: z.string().optional(),
  pais: z.string().default('CO'),
});

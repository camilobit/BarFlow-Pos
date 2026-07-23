import { z } from 'zod';

export const crearClienteSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  celular: z.string().optional(),
  correo: z.string().email().optional().or(z.literal('')),
  fecha_cumpleanos: z.string().optional(),
  genero: z.string().optional(),
  preferencias: z.string().optional(),
  observaciones: z.string().optional(),
});

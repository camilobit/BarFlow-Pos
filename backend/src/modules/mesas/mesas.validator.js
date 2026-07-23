import { z } from 'zod';

export const crearMesaSchema = z.object({
  nombre: z.string().min(1),
  capacidad: z.number().int().positive().default(4),
  zona: z.string().default('Salón'),
  pos_x: z.number().default(0),
  pos_y: z.number().default(0),
});

export const actualizarMesaSchema = z.object({
  nombre: z.string().min(1).optional(),
  capacidad: z.number().int().positive().optional(),
  estado: z.enum(['libre', 'ocupada', 'reservada', 'limpieza']).optional(),
  zona: z.string().optional(),
  pos_x: z.number().optional(),
  pos_y: z.number().optional(),
});

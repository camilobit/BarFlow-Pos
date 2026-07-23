import { z } from 'zod';

export const crearProductoSchema = z.object({
  categoria_id: z.string().uuid().nullable().optional(),
  barra_id: z.string().uuid().nullable().optional(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().nonnegative(),
  costo: z.number().nonnegative().default(0),
  imagen_url: z.string().url().optional().or(z.literal('')),
  stock: z.number().nonnegative().nullable().optional(),
  stock_minimo: z.number().nonnegative().nullable().optional(),
  ingredientes: z
    .array(z.object({ insumo_id: z.string().uuid(), cantidad: z.number().positive() }))
    .optional(),
});

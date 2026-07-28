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
  controla_inventario_unidad: z.boolean().optional(),
  ingredientes: z
    .array(z.object({ insumo_id: z.string().uuid(), cantidad: z.number().positive() }))
    .optional(),
});

export const importarProductosSchema = z.object({
  filas: z
    .array(
      z.object({
        nombre: z.string().min(1),
        precio: z.number().nonnegative(),
        costo: z.number().nonnegative().optional(),
        categoria_nombre: z.string().optional(),
        barra_nombre: z.string().optional(),
      })
    )
    .min(1, 'El archivo no tiene productos válidos'),
});

export const asignarStockSchema = z.object({
  barra_id: z.string().uuid(),
  cantidad: z.number(),
  stock_minimo: z.number().nonnegative().optional(),
});

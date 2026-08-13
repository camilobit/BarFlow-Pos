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

export const importarRecetasSchema = z.object({
  filas: z
    .array(
      z.object({
        producto: z.string().min(1),
        insumo: z.string().min(1),
        cantidad: z.number().positive(),
      })
    )
    .min(1, 'El archivo no tiene líneas de receta válidas'),
});

export const asignarStockSchema = z.object({
  barra_id: z.string().uuid(),
  cantidad: z.number(),
  stock_minimo: z.number().nonnegative().optional(),
});

export const establecerStockSchema = z.object({
  barra_id: z.string().uuid(),
  cantidad: z.number().nonnegative(),
  stock_minimo: z.number().nonnegative().optional(),
});

export const crearMovimientoSchema = z.object({
  insumo_id: z.string().uuid(),
  barra_origen_id: z.string().uuid(),
  barra_destino_id: z.string().uuid(),
  cantidad: z.number().positive(),
  nota: z.string().max(300).optional(),
});

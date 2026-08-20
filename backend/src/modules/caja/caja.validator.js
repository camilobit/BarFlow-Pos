import { z } from 'zod';

export const abrirCajaSchema = z.object({
  barra_id: z.string().uuid().nullable().optional(),
  monto_inicial: z.number().nonnegative(),
});

export const cerrarCajaSchema = z.object({
  barra_id: z.string().uuid().nullable().optional(),
  monto_final_real: z.number().nonnegative(),
  conteo_fisico: z
    .array(
      z.object({
        insumo_id: z.string().uuid(),
        cantidad_fisica: z.number().nonnegative(),
      })
    )
    .optional(),
});

export const movimientoCajaSchema = z.object({
  barra_id: z.string().uuid().nullable().optional(),
  tipo: z.enum(['ingreso', 'egreso']),
  monto: z.number().positive(),
  descripcion: z.string().min(1),
});

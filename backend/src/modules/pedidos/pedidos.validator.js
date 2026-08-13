import { z } from 'zod';

export const crearPedidoSchema = z.object({
  mesa_id: z.string().uuid().nullable().optional(),
  referencia_mesa: z.string().max(80).nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  observaciones: z.string().max(500).optional(),
  barra_destino_id: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().positive().default(1),
        observaciones: z.string().max(300).optional(),
      })
    )
    .min(1, 'El pedido debe tener al menos un producto'),
});

export const agregarItemsSchema = z.object({
  barra_destino_id: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().positive().default(1),
        observaciones: z.string().max(300).optional(),
      })
    )
    .min(1),
});

export const actualizarEstadoItemSchema = z.object({
  estado: z.enum(['pendiente', 'preparando', 'listo', 'entregado', 'cancelado']),
});

export const cerrarCuentaSchema = z.object({
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'mixto']),
  propina: z.number().min(0).default(0),
  descuento: z.number().min(0).default(0),
  barra_id: z.string().uuid().nullable().optional(),
});

export const dividirCuentaSchema = z.object({
  grupos: z.array(z.array(z.string().uuid())).min(2),
});

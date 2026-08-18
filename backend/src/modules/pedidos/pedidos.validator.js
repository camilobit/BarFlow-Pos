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
  pagos: z
    .array(
      z.object({
        metodo: z.enum(['efectivo', 'tarjeta', 'transferencia']),
        monto: z.number().positive(),
      })
    )
    .min(1, 'Indica al menos un método de pago'),
  propina: z.number().min(0).default(0),
  descuento: z.number().min(0).default(0),
  barra_id: z.string().uuid().nullable().optional(),
  nota: z.string().max(500).optional(),
});

export const devolucionSchema = z.object({
  barra_id: z.string().uuid(),
  motivo: z.string().min(3, 'Escribe el motivo de la devolución').max(500),
});

export const dividirCuentaSchema = z.object({
  grupos: z.array(z.array(z.string().uuid())).min(2),
});

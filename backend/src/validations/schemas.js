import { z } from 'zod';

export const crearPedidoSchema = z.object({
  mesa_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  observaciones: z.string().max(500).optional(),
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
});

export const dividirCuentaSchema = z.object({
  grupos: z.array(z.array(z.string().uuid())).min(2),
});

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

export const abrirCajaSchema = z.object({
  monto_inicial: z.number().nonnegative(),
});

export const cerrarCajaSchema = z.object({
  monto_final_real: z.number().nonnegative(),
});

export const movimientoCajaSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  monto: z.number().positive(),
  descripcion: z.string().min(1),
});

export const crearNegocioSchema = z.object({
  nombre: z.string().min(1),
  slug: z.string().min(1),
  ciudad: z.string().optional(),
  pais: z.string().default('CO'),
});

export const crearUsuarioSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1),
  apellido: z.string().optional(),
  rol: z.enum(['admin_negocio', 'barra', 'mesero']),
  negocio_id: z.string().uuid().optional(),
  pin: z.string().length(4).optional(),
});

-- =====================================================================
-- BarFlow POS · Migración 001: Esquema principal
-- PostgreSQL 15+ (Supabase)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type rol_usuario as enum ('super_admin', 'admin_negocio', 'barra', 'mesero');
create type estado_negocio as enum ('activo', 'suspendido', 'prueba');
create type estado_mesa as enum ('libre', 'ocupada', 'reservada', 'limpieza');
create type estado_pedido as enum ('pendiente', 'preparando', 'listo', 'entregado', 'pagado', 'cancelado');
create type estado_item_pedido as enum ('pendiente', 'preparando', 'listo', 'entregado', 'cancelado');
create type tipo_movimiento_caja as enum ('ingreso', 'egreso', 'venta', 'propina', 'ajuste');
create type metodo_pago as enum ('efectivo', 'tarjeta', 'transferencia', 'mixto');
create type unidad_insumo as enum ('ml', 'l', 'g', 'kg', 'unidad');

-- ---------------------------------------------------------------------
-- NEGOCIOS (multi-tenant)
-- ---------------------------------------------------------------------
create table negocios (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug text unique not null,
  logo_url text,
  telefono text,
  direccion text,
  ciudad text,
  pais text default 'CO',
  plan text default 'basico',
  estado estado_negocio not null default 'prueba',
  moneda text default 'COP',
  zona_horaria text default 'America/Bogota',
  configuracion jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USUARIOS (perfil, extiende auth.users de Supabase)
-- ---------------------------------------------------------------------
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete cascade,
  rol rol_usuario not null,
  nombre text not null,
  apellido text,
  email text not null,
  telefono text,
  avatar_url text,
  activo boolean not null default true,
  pin text, -- pin corto para acceso rápido en tablet (barra/mesero)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_usuarios_negocio on usuarios(negocio_id);
create index idx_usuarios_rol on usuarios(rol);

-- super_admin no requiere negocio_id
alter table usuarios add constraint chk_negocio_requerido
  check (rol = 'super_admin' or negocio_id is not null);

-- ---------------------------------------------------------------------
-- BARRAS (puntos de despacho dentro de un negocio)
-- ---------------------------------------------------------------------
create table barras (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  descripcion text,
  activa boolean not null default true,
  orden int default 0,
  created_at timestamptz not null default now()
);
create index idx_barras_negocio on barras(negocio_id);

-- ---------------------------------------------------------------------
-- MESAS
-- ---------------------------------------------------------------------
create table mesas (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  capacidad int default 4,
  estado estado_mesa not null default 'libre',
  pos_x numeric default 0,
  pos_y numeric default 0,
  zona text default 'Salón',
  mesa_combinada_con uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_mesas_negocio on mesas(negocio_id);

-- ---------------------------------------------------------------------
-- CATEGORÍAS DE PRODUCTO
-- ---------------------------------------------------------------------
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  orden int default 0,
  activa boolean not null default true
);
create index idx_categorias_negocio on categorias(negocio_id);

-- ---------------------------------------------------------------------
-- INSUMOS (inventario base)
-- ---------------------------------------------------------------------
create table insumos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  unidad unidad_insumo not null default 'unidad',
  stock numeric not null default 0,
  stock_minimo numeric not null default 0,
  costo_unitario numeric not null default 0,
  proveedor_id uuid,
  activo boolean not null default true,
  updated_at timestamptz not null default now()
);
create index idx_insumos_negocio on insumos(negocio_id);

-- ---------------------------------------------------------------------
-- PRODUCTOS
-- ---------------------------------------------------------------------
create table productos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  categoria_id uuid references categorias(id) on delete set null,
  barra_id uuid references barras(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric not null default 0,
  costo numeric not null default 0,
  imagen_url text,
  activo boolean not null default true,
  stock numeric default null, -- si es producto directo (no receta), controla stock propio
  stock_minimo numeric default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_productos_negocio on productos(negocio_id);
create index idx_productos_barra on productos(barra_id);
create index idx_productos_categoria on productos(categoria_id);

-- Receta: qué insumos consume cada producto
create table producto_insumos (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid not null references productos(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  cantidad numeric not null,
  unique (producto_id, insumo_id)
);

-- ---------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  apellido text,
  celular text,
  correo text,
  fecha_cumpleanos date,
  genero text,
  preferencias text,
  observaciones text,
  visitas int not null default 0,
  consumo_total numeric not null default 0,
  ultima_visita timestamptz,
  puntos int not null default 0,
  nivel_fidelizacion text not null default 'Bronce',
  created_at timestamptz not null default now()
);
create index idx_clientes_negocio on clientes(negocio_id);
create index idx_clientes_celular on clientes(celular);

create table cupones (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete cascade,
  codigo text not null,
  descripcion text,
  descuento_porcentaje numeric,
  descuento_monto numeric,
  usado boolean not null default false,
  expira_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
create table pedidos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  mesa_id uuid references mesas(id) on delete set null,
  mesero_id uuid not null references usuarios(id),
  cliente_id uuid references clientes(id) on delete set null,
  estado estado_pedido not null default 'pendiente',
  observaciones text,
  subtotal numeric not null default 0,
  descuento numeric not null default 0,
  propina numeric not null default 0,
  total numeric not null default 0,
  metodo_pago metodo_pago,
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pedidos_negocio on pedidos(negocio_id);
create index idx_pedidos_mesa on pedidos(mesa_id);
create index idx_pedidos_estado on pedidos(estado);
create index idx_pedidos_mesero on pedidos(mesero_id);
create index idx_pedidos_created on pedidos(created_at);

create table pedido_items (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid not null references productos(id),
  barra_id uuid references barras(id),
  cantidad int not null default 1,
  precio_unitario numeric not null,
  observaciones text,
  estado estado_item_pedido not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_items_pedido on pedido_items(pedido_id);
create index idx_items_barra on pedido_items(barra_id);
create index idx_items_estado on pedido_items(estado);

-- ---------------------------------------------------------------------
-- CAJA
-- ---------------------------------------------------------------------
create table cajas (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  abierta_por uuid not null references usuarios(id),
  cerrada_por uuid references usuarios(id),
  monto_inicial numeric not null default 0,
  monto_final_calculado numeric,
  monto_final_real numeric,
  diferencia numeric,
  abierta_at timestamptz not null default now(),
  cerrada_at timestamptz
);
create index idx_cajas_negocio on cajas(negocio_id);

create table movimientos_caja (
  id uuid primary key default uuid_generate_v4(),
  caja_id uuid not null references cajas(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  tipo tipo_movimiento_caja not null,
  monto numeric not null,
  descripcion text,
  pedido_id uuid references pedidos(id),
  usuario_id uuid references usuarios(id),
  created_at timestamptz not null default now()
);
create index idx_mov_caja_caja on movimientos_caja(caja_id);

-- ---------------------------------------------------------------------
-- PROVEEDORES Y COMPRAS
-- ---------------------------------------------------------------------
create table proveedores (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  telefono text,
  correo text,
  activo boolean default true
);

alter table insumos add constraint fk_insumo_proveedor
  foreign key (proveedor_id) references proveedores(id) on delete set null;

create table compras (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  proveedor_id uuid references proveedores(id),
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table compra_items (
  id uuid primary key default uuid_generate_v4(),
  compra_id uuid not null references compras(id) on delete cascade,
  insumo_id uuid not null references insumos(id),
  cantidad numeric not null,
  costo_unitario numeric not null
);

-- ---------------------------------------------------------------------
-- NOTIFICACIONES Y AUDITORÍA
-- ---------------------------------------------------------------------
create table notificaciones (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  tipo text not null,
  titulo text not null,
  mensaje text,
  leida boolean not null default false,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_notif_negocio on notificaciones(negocio_id);
create index idx_notif_usuario on notificaciones(usuario_id);

create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid references negocios(id) on delete cascade,
  usuario_id uuid references usuarios(id),
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  detalle jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_auditoria_negocio on auditoria(negocio_id);

-- ---------------------------------------------------------------------
-- updated_at triggers genéricos
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_negocios_updated before update on negocios for each row execute function set_updated_at();
create trigger trg_usuarios_updated before update on usuarios for each row execute function set_updated_at();
create trigger trg_mesas_updated before update on mesas for each row execute function set_updated_at();
create trigger trg_productos_updated before update on productos for each row execute function set_updated_at();
create trigger trg_pedidos_updated before update on pedidos for each row execute function set_updated_at();
create trigger trg_items_updated before update on pedido_items for each row execute function set_updated_at();

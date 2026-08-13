-- =====================================================================
-- BarFlow POS · Migración 008: traslados de inventario entre barras
-- =====================================================================
-- Movimiento interno: mover stock de un insumo de una barra a otra (ej.
-- Barra 1 le presta 10 gaseosas a Barra 2 porque se le acabaron). No crea
-- ni destruye inventario — solo lo reubica. Tiene dos pasos: la barra
-- origen ENVÍA (se descuenta de su stock de inmediato) y la barra destino
-- ACEPTA (ahí es cuando aparece en su stock) o RECHAZA (se devuelve).

create type estado_movimiento_inventario as enum ('pendiente', 'aceptado', 'rechazado');

create table movimientos_inventario (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  barra_origen_id uuid not null references barras(id) on delete cascade,
  barra_destino_id uuid not null references barras(id) on delete cascade,
  cantidad numeric not null check (cantidad > 0),
  estado estado_movimiento_inventario not null default 'pendiente',
  solicitado_por uuid not null references usuarios(id),
  resuelto_por uuid references usuarios(id),
  nota text,
  created_at timestamptz not null default now(),
  resuelto_at timestamptz,
  check (barra_origen_id <> barra_destino_id)
);

create index idx_movimientos_negocio on movimientos_inventario(negocio_id);
create index idx_movimientos_destino_pendientes on movimientos_inventario(barra_destino_id, estado);
create index idx_movimientos_origen on movimientos_inventario(barra_origen_id);

alter table movimientos_inventario enable row level security;

create policy movimientos_inventario_select on movimientos_inventario
  for select using (fn_es_super_admin() or negocio_id = fn_negocio_actual());

create policy movimientos_inventario_write on movimientos_inventario
  for all using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
  with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());

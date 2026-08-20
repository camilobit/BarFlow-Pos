-- =====================================================================
-- BarFlow POS · Migración 010: cierre de turno con conteo físico y
-- detección de faltantes de inventario.
-- =====================================================================
-- Cada vez que se abre o se cierra una caja, se guarda una "foto" del
-- stock de cada insumo de esa barra. Al abrir, la foto es automática
-- (lo que el sistema ya calculaba). Al cerrar, además del cálculo del
-- sistema se guarda lo que el cajero contó físicamente — la diferencia
-- entre ambos es justo la señal de un faltante que las ventas no explican.

create type tipo_snapshot_inventario as enum ('apertura', 'cierre');

create table snapshots_inventario_caja (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  caja_id uuid not null references cajas(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  tipo tipo_snapshot_inventario not null,
  cantidad_sistema numeric not null,
  -- Solo se llena en el cierre, con lo que el cajero contó a simple
  -- vista — null significa "no se contó este insumo", no un faltante.
  cantidad_fisica numeric,
  created_at timestamptz not null default now(),
  unique (caja_id, insumo_id, tipo)
);
create index idx_snapshots_caja on snapshots_inventario_caja(caja_id);
create index idx_snapshots_negocio on snapshots_inventario_caja(negocio_id);

alter table snapshots_inventario_caja enable row level security;
create policy snapshots_inventario_caja_select on snapshots_inventario_caja
  for select using (fn_es_super_admin() or negocio_id = fn_negocio_actual());
create policy snapshots_inventario_caja_write on snapshots_inventario_caja
  for all using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
  with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());

-- Para la "bandeja de revisión" del admin: qué cierres tienen algo raro
-- y cuáles ya se revisaron, sin depender de que alguien esté conectado
-- justo cuando se cerró la caja.
alter table cajas add column if not exists tiene_alertas boolean not null default false;
alter table cajas add column if not exists revisado_por uuid references usuarios(id);
alter table cajas add column if not exists revisado_at timestamptz;

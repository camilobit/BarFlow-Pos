-- =====================================================================
-- BarFlow POS · Migración 007: origen del pedido (mesero vs. barra)
-- =====================================================================
-- Permite distinguir pedidos tomados por un mesero de pedidos que un
-- cliente hizo directamente en la barra (sin mesero de por medio).
-- No se toca `mesero_id`: sigue siendo "quién creó el pedido" en ambos
-- casos (un mesero, o el propio personal de barra) — así no se rompe
-- ninguna consulta ni integración existente.

alter table pedidos add column if not exists origen text not null default 'mesero'
  check (origen in ('mesero', 'barra'));

create index if not exists idx_pedidos_origen on pedidos(origen);

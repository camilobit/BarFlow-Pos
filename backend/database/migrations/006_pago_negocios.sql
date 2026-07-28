-- =====================================================================
-- BarFlow POS · Migración 006: control de pago por negocio
-- =====================================================================
-- Simple casilla que el super_admin marca manualmente: "¿este negocio
-- pagó su suscripción del período actual?". No es facturación automática
-- (eso vendría después con una pasarela de pagos) — por ahora es control
-- manual para saber a quién suspender si no ha pagado.

alter table negocios add column if not exists pagado boolean not null default false;
alter table negocios add column if not exists pagado_hasta date;

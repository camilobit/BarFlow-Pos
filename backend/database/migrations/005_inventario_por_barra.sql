-- =====================================================================
-- BarFlow POS · Migración 005: inventario por barra, usuarios de barra
-- fija, y referencia de mesa libre (sin plano de mesas fijo)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) El mesero ya no depende de un plano de mesas fijo: puede escribir
--    una referencia libre ("Mesa 5", "Terraza", "Para llevar Juan").
--    mesa_id sigue existiendo por si algún negocio sí quiere usar el
--    plano de mesas — ahora es 100% opcional en ambos sentidos.
-- ---------------------------------------------------------------------
alter table pedidos add column if not exists referencia_mesa text;

-- ---------------------------------------------------------------------
-- 2) Un usuario con rol 'barra' puede quedar fijo a UNA barra (su propio
--    correo/caja), en vez de tener que elegir cada vez que entra.
-- ---------------------------------------------------------------------
alter table usuarios add column if not exists barra_id uuid references barras(id) on delete set null;
create index if not exists idx_usuarios_barra on usuarios(barra_id);

-- ---------------------------------------------------------------------
-- 3) Inventario POR BARRA: cada insumo (ron, limón, hielo...) tiene un
--    nivel de stock independiente en cada barra. `insumos` sigue siendo
--    el catálogo maestro (nombre, unidad, costo); el stock real vive acá.
-- ---------------------------------------------------------------------
create table if not exists insumo_stock_barra (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  barra_id uuid not null references barras(id) on delete cascade,
  stock numeric not null default 0,
  stock_minimo numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (insumo_id, barra_id)
);
create index if not exists idx_isb_negocio on insumo_stock_barra(negocio_id);
create index if not exists idx_isb_barra on insumo_stock_barra(barra_id);

create trigger trg_isb_updated before update on insumo_stock_barra
  for each row execute function set_updated_at();

alter table insumo_stock_barra enable row level security;

create policy insumo_stock_barra_select on insumo_stock_barra for select
  using (fn_es_super_admin() or negocio_id = fn_negocio_actual());

create policy insumo_stock_barra_write on insumo_stock_barra for all
  using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
  with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());

-- ---------------------------------------------------------------------
-- 4) El descuento automático de inventario ahora resta del stock DE LA
--    BARRA donde se preparó el producto, no de un stock único del negocio.
-- ---------------------------------------------------------------------
create or replace function fn_descontar_inventario()
returns trigger language plpgsql as $$
begin
  if new.estado = 'preparando' and (old.estado is distinct from 'preparando') then

    -- Insumos vía receta, descontados del stock de la barra que preparó el ítem
    update insumo_stock_barra isb
       set stock = isb.stock - (pi.cantidad * new.cantidad)
      from producto_insumos pi
     where pi.producto_id = new.producto_id
       and pi.insumo_id = isb.insumo_id
       and isb.barra_id = new.barra_id;

    -- Producto con stock directo (sin receta) — sigue siendo a nivel de negocio
    update productos
       set stock = stock - new.cantidad
     where id = new.producto_id
       and stock is not null;

  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Notificación de stock bajo ahora se dispara por barra
-- ---------------------------------------------------------------------
drop trigger if exists trg_stock_bajo_insumo on insumos;

create or replace function fn_notificar_stock_bajo_barra()
returns trigger language plpgsql as $$
declare
  v_nombre_insumo text;
  v_nombre_barra text;
begin
  if new.stock <= new.stock_minimo then
    select nombre into v_nombre_insumo from insumos where id = new.insumo_id;
    select nombre into v_nombre_barra from barras where id = new.barra_id;

    insert into notificaciones (negocio_id, tipo, titulo, mensaje, data)
    values (
      new.negocio_id,
      'stock_bajo',
      'Stock bajo en ' || v_nombre_barra || ': ' || v_nombre_insumo,
      'Quedan ' || new.stock || ' unidades (mínimo ' || new.stock_minimo || ')',
      jsonb_build_object('insumo_id', new.insumo_id, 'barra_id', new.barra_id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_stock_bajo_isb
after update of stock on insumo_stock_barra
for each row execute function fn_notificar_stock_bajo_barra();

-- ---------------------------------------------------------------------
-- 6) Migra el stock existente (si lo había) a la primera barra del
--    negocio, para no perder los datos que ya cargaste.
-- ---------------------------------------------------------------------
insert into insumo_stock_barra (negocio_id, insumo_id, barra_id, stock, stock_minimo)
select i.negocio_id, i.id, b.id, i.stock, i.stock_minimo
from insumos i
join lateral (
  select id from barras where negocio_id = i.negocio_id order by orden limit 1
) b on true
on conflict (insumo_id, barra_id) do nothing;

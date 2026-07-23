-- =====================================================================
-- BarFlow POS · Migración 003: Row Level Security (multi-tenant)
-- =====================================================================
-- Estrategia: cada fila queda aislada por negocio_id. Un usuario solo
-- ve datos de su propio negocio; super_admin ve todo.
-- El backend usa la service_role key (bypassa RLS) para operaciones
-- administrativas ya validadas por middlewares/permisos de Express.
-- Estas policies protegen además cualquier acceso directo desde el
-- frontend con la anon/authenticated key (p.ej. Supabase Realtime).
-- ---------------------------------------------------------------------

create or replace function fn_negocio_actual()
returns uuid language sql stable as $$
  select negocio_id from usuarios where id = auth.uid();
$$;

create or replace function fn_es_super_admin()
returns boolean language sql stable as $$
  select coalesce((select rol = 'super_admin' from usuarios where id = auth.uid()), false);
$$;

-- Helper que aplica el mismo patrón de policy a cada tabla con negocio_id
do $$
declare
  t text;
  tablas text[] := array[
    'mesas','categorias','insumos','productos','clientes','cupones',
    'pedidos','cajas','movimientos_caja','proveedores','compras',
    'notificaciones','auditoria','barras'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table %I enable row level security;', t);

    execute format($p$
      create policy %I_select on %I for select
      using (fn_es_super_admin() or negocio_id = fn_negocio_actual());
    $p$, t, t);

    execute format($p$
      create policy %I_write on %I for all
      using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
      with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());
    $p$, t, t);
  end loop;
end $$;

-- negocios: solo super_admin administra; admin_negocio puede ver/editar el suyo
alter table negocios enable row level security;

create policy negocios_select on negocios for select
  using (fn_es_super_admin() or id = fn_negocio_actual());

create policy negocios_update on negocios for update
  using (fn_es_super_admin() or id = fn_negocio_actual());

create policy negocios_insert on negocios for insert
  with check (fn_es_super_admin());

-- usuarios: cada quien ve su propio negocio; super_admin ve todos
alter table usuarios enable row level security;

create policy usuarios_select on usuarios for select
  using (fn_es_super_admin() or negocio_id = fn_negocio_actual());

create policy usuarios_write on usuarios for all
  using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
  with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());

-- pedido_items y compra_items no tienen negocio_id directo: se validan vía join
alter table pedido_items enable row level security;

create policy pedido_items_select on pedido_items for select
  using (
    fn_es_super_admin() or
    exists (select 1 from pedidos p where p.id = pedido_items.pedido_id and p.negocio_id = fn_negocio_actual())
  );

create policy pedido_items_write on pedido_items for all
  using (
    fn_es_super_admin() or
    exists (select 1 from pedidos p where p.id = pedido_items.pedido_id and p.negocio_id = fn_negocio_actual())
  )
  with check (
    fn_es_super_admin() or
    exists (select 1 from pedidos p where p.id = pedido_items.pedido_id and p.negocio_id = fn_negocio_actual())
  );

alter table producto_insumos enable row level security;

create policy producto_insumos_select on producto_insumos for select
  using (
    fn_es_super_admin() or
    exists (select 1 from productos pr where pr.id = producto_insumos.producto_id and pr.negocio_id = fn_negocio_actual())
  );

create policy producto_insumos_write on producto_insumos for all
  using (
    fn_es_super_admin() or
    exists (select 1 from productos pr where pr.id = producto_insumos.producto_id and pr.negocio_id = fn_negocio_actual())
  )
  with check (
    fn_es_super_admin() or
    exists (select 1 from productos pr where pr.id = producto_insumos.producto_id and pr.negocio_id = fn_negocio_actual())
  );

alter table compra_items enable row level security;

create policy compra_items_select on compra_items for select
  using (
    fn_es_super_admin() or
    exists (select 1 from compras c where c.id = compra_items.compra_id and c.negocio_id = fn_negocio_actual())
  );

create policy compra_items_write on compra_items for all
  using (
    fn_es_super_admin() or
    exists (select 1 from compras c where c.id = compra_items.compra_id and c.negocio_id = fn_negocio_actual())
  )
  with check (
    fn_es_super_admin() or
    exists (select 1 from compras c where c.id = compra_items.compra_id and c.negocio_id = fn_negocio_actual())
  );

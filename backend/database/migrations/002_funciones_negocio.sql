-- =====================================================================
-- BarFlow POS · Migración 002: Funciones y triggers de negocio
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Al insertar un pedido_item, copiar barra_id del producto y
--    asignar precio_unitario si no viene informado.
-- ---------------------------------------------------------------------
create or replace function fn_item_defaults()
returns trigger language plpgsql as $$
declare
  v_barra uuid;
  v_precio numeric;
begin
  select barra_id, precio into v_barra, v_precio from productos where id = new.producto_id;
  if new.barra_id is null then
    new.barra_id := v_barra;
  end if;
  if new.precio_unitario is null then
    new.precio_unitario := v_precio;
  end if;
  return new;
end;
$$;

create trigger trg_item_defaults
before insert on pedido_items
for each row execute function fn_item_defaults();

-- ---------------------------------------------------------------------
-- 2) Recalcular subtotal/total del pedido cuando cambian sus items.
-- ---------------------------------------------------------------------
create or replace function fn_recalcular_pedido(p_pedido_id uuid)
returns void language plpgsql as $$
declare
  v_subtotal numeric;
begin
  select coalesce(sum(cantidad * precio_unitario), 0)
    into v_subtotal
    from pedido_items
   where pedido_id = p_pedido_id
     and estado <> 'cancelado';

  update pedidos
     set subtotal = v_subtotal,
         total = v_subtotal - descuento + propina
   where id = p_pedido_id;
end;
$$;

create or replace function fn_item_after_change()
returns trigger language plpgsql as $$
begin
  perform fn_recalcular_pedido(coalesce(new.pedido_id, old.pedido_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_item_after_insert
after insert on pedido_items
for each row execute function fn_item_after_change();

create trigger trg_item_after_update
after update of cantidad, precio_unitario, estado on pedido_items
for each row execute function fn_item_after_change();

create trigger trg_item_after_delete
after delete on pedido_items
for each row execute function fn_item_after_change();

-- ---------------------------------------------------------------------
-- 3) Descontar inventario automáticamente al confirmar un item
--    (cuando pasa a 'preparando' por primera vez).
-- ---------------------------------------------------------------------
create or replace function fn_descontar_inventario()
returns trigger language plpgsql as $$
begin
  -- Solo descuenta la primera vez que el item entra a preparación
  if new.estado = 'preparando' and (old.estado is distinct from 'preparando') then

    -- Insumos vía receta (producto compuesto)
    update insumos i
       set stock = i.stock - (pi.cantidad * new.cantidad),
           updated_at = now()
      from producto_insumos pi
     where pi.producto_id = new.producto_id
       and pi.insumo_id = i.id;

    -- Producto con stock directo (sin receta)
    update productos
       set stock = stock - new.cantidad
     where id = new.producto_id
       and stock is not null;

  end if;
  return new;
end;
$$;

create trigger trg_descontar_inventario
after update of estado on pedido_items
for each row execute function fn_descontar_inventario();

-- ---------------------------------------------------------------------
-- 4) Notificación automática de stock bajo tras cualquier ajuste.
-- ---------------------------------------------------------------------
create or replace function fn_notificar_stock_bajo()
returns trigger language plpgsql as $$
declare
  v_negocio uuid;
begin
  if new.stock <= new.stock_minimo then
    select negocio_id into v_negocio from insumos where id = new.id;
    insert into notificaciones (negocio_id, tipo, titulo, mensaje, data)
    values (
      coalesce(v_negocio, new.negocio_id),
      'stock_bajo',
      'Stock bajo: ' || new.nombre,
      'Quedan ' || new.stock || ' unidades (mínimo ' || new.stock_minimo || ')',
      jsonb_build_object('insumo_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger trg_stock_bajo_insumo
after update of stock on insumos
for each row execute function fn_notificar_stock_bajo();

-- ---------------------------------------------------------------------
-- 5) Al pagar un pedido: actualizar cliente (visitas, consumo, puntos,
--    nivel de fidelización) y liberar la mesa.
-- ---------------------------------------------------------------------
create or replace function fn_pedido_pagado()
returns trigger language plpgsql as $$
declare
  v_puntos_ganados int;
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then

    new.cerrado_at := now();

    if new.cliente_id is not null then
      v_puntos_ganados := floor(new.total / 1000); -- 1 punto por cada 1.000 COP

      update clientes
         set visitas = visitas + 1,
             consumo_total = consumo_total + new.total,
             ultima_visita = now(),
             puntos = puntos + v_puntos_ganados,
             nivel_fidelizacion = case
               when puntos + v_puntos_ganados >= 500 then 'Platino'
               when puntos + v_puntos_ganados >= 200 then 'Oro'
               when puntos + v_puntos_ganados >= 50  then 'Plata'
               else 'Bronce'
             end
       where id = new.cliente_id;
    end if;

    if new.mesa_id is not null then
      update mesas set estado = 'limpieza' where id = new.mesa_id;
    end if;

    insert into movimientos_caja (caja_id, negocio_id, tipo, monto, descripcion, pedido_id, usuario_id)
    select c.id, new.negocio_id, 'venta', new.total, 'Pago pedido', new.id, new.mesero_id
      from cajas c
     where c.negocio_id = new.negocio_id and c.cerrada_at is null
     order by c.abierta_at desc
     limit 1;

  end if;
  return new;
end;
$$;

create trigger trg_pedido_pagado
before update of estado on pedidos
for each row execute function fn_pedido_pagado();

-- ---------------------------------------------------------------------
-- 6) Vista de ventas diarias (usada por el dashboard)
-- ---------------------------------------------------------------------
create or replace view vw_ventas_diarias as
select
  negocio_id,
  date_trunc('day', cerrado_at) as dia,
  count(*) as num_pedidos,
  sum(total) as total_ventas,
  avg(total) as ticket_promedio
from pedidos
where estado = 'pagado'
group by negocio_id, date_trunc('day', cerrado_at);

create or replace view vw_productos_mas_vendidos as
select
  pi.producto_id,
  p.negocio_id,
  pr.nombre as producto_nombre,
  sum(pi.cantidad) as unidades_vendidas,
  sum(pi.cantidad * pi.precio_unitario) as ingresos
from pedido_items pi
join pedidos p on p.id = pi.pedido_id
join productos pr on pr.id = pi.producto_id
where p.estado = 'pagado'
group by pi.producto_id, p.negocio_id, pr.nombre;

-- =====================================================================
-- BarFlow POS · Migración 004: caja por barra + verificación de pago
-- =====================================================================
-- Ajusta el modelo al flujo real: cada barra abre su propia caja con su
-- propio efectivo, y el cajero de la barra confirma cuando recibe el
-- dinero/comprobante que le lleva el mesero.

-- 1) Cada caja pertenece a una barra específica (null = negocio de una sola barra/caja)
alter table cajas add column if not exists barra_id uuid references barras(id) on delete set null;
create index if not exists idx_cajas_barra on cajas(barra_id);

-- Solo puede haber UNA caja abierta a la vez por barra (o por negocio, si no usa barra_id)
drop index if exists uq_caja_abierta_por_barra;
create unique index uq_caja_abierta_por_barra on cajas(negocio_id, coalesce(barra_id, '00000000-0000-0000-0000-000000000000')) where cerrada_at is null;

-- 2) El pedido registra a qué barra le corresponde el cobro, y si el cajero ya verificó el pago
alter table pedidos add column if not exists barra_id uuid references barras(id) on delete set null;
alter table pedidos add column if not exists pago_verificado boolean not null default false;
alter table pedidos add column if not exists verificado_por uuid references usuarios(id);
alter table pedidos add column if not exists verificado_at timestamptz;

create index if not exists idx_pedidos_barra on pedidos(barra_id);
create index if not exists idx_pedidos_pago_verificado on pedidos(pago_verificado) where estado = 'pagado';

-- 3) El trigger de pago ahora busca la caja de la barra correcta, no "la última caja abierta del negocio"
create or replace function fn_pedido_pagado()
returns trigger language plpgsql as $$
declare
  v_puntos_ganados int;
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then

    new.cerrado_at := now();

    if new.cliente_id is not null then
      v_puntos_ganados := floor(new.total / 1000);

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
     where c.negocio_id = new.negocio_id
       and c.cerrada_at is null
       and coalesce(c.barra_id, '00000000-0000-0000-0000-000000000000') = coalesce(new.barra_id, '00000000-0000-0000-0000-000000000000')
     order by c.abierta_at desc
     limit 1;

  end if;
  return new;
end;
$$;

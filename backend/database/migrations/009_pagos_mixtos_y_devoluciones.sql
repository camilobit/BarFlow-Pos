-- =====================================================================
-- BarFlow POS · Migración 009: pagos mixtos, recargo por tarjeta,
-- cierre de caja en efectivo real, y devoluciones.
-- =====================================================================

-- Un pedido puede pagarse con varios métodos a la vez (parte en efectivo,
-- parte en tarjeta, parte en transferencia). Cada línea guarda cuánto
-- cubrió de la cuenta y, si aplica, el recargo adicional cobrado por
-- ese método (ej. recargo por tarjeta).
create table pedido_pagos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  metodo text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  monto_base numeric not null check (monto_base > 0),
  recargo numeric not null default 0,
  created_at timestamptz not null default now()
);
create index idx_pedido_pagos_pedido on pedido_pagos(pedido_id);
create index idx_pedido_pagos_negocio on pedido_pagos(negocio_id);

alter table pedido_pagos enable row level security;
create policy pedido_pagos_select on pedido_pagos
  for select using (fn_es_super_admin() or negocio_id = fn_negocio_actual());
create policy pedido_pagos_write on pedido_pagos
  for all using (fn_es_super_admin() or negocio_id = fn_negocio_actual())
  with check (fn_es_super_admin() or negocio_id = fn_negocio_actual());

-- Cada movimiento de caja ahora sabe con qué método se pagó — así el
-- cierre de caja puede diferenciar el efectivo real de lo que llegó por
-- tarjeta o transferencia (que nunca fue billete físico en el cajón).
alter table movimientos_caja add column if not exists metodo_pago text;

-- El trigger de "pedido pagado" ya NO inserta el movimiento de caja acá
-- (antes insertaba una sola fila con el total completo, sin distinguir
-- método, y además buscaba la caja abierta más reciente de TODO el
-- negocio en vez de la de la barra que efectivamente cobró — un segundo
-- bug de paso). Esa inserción ahora la hace el backend en JavaScript,
-- una fila por cada método de pago usado, ya sabiendo a qué barra
-- pertenece cada una.
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

  end if;
  return new;
end;
$$;

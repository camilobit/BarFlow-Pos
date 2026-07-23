import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient.js';

/**
 * Se suscribe a cambios en tiempo real de una tabla de Supabase, filtrando
 * opcionalmente por negocio_id (o cualquier columna). Llama a `onChange`
 * con el payload cada vez que hay un INSERT/UPDATE/DELETE.
 *
 * Uso:
 *  useRealtimeTable({
 *    table: 'pedido_items',
 *    filter: `barra_id=eq.${barraId}`,
 *    onChange: () => recargarPedidos(),
 *  });
 */
export function useRealtimeTable({ table, filter, onChange, enabled = true }) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled || !table) return undefined;

    const channel = supabase
      .channel(`realtime:${table}:${filter || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => callbackRef.current?.(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}

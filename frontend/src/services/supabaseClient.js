import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Una URL/clave ausente o inválida hace que createClient() lance una
// excepción de inmediato. Si eso pasa durante el import de este archivo,
// TODA la aplicación se cae en blanco sin ningún mensaje visible para el
// usuario (solo queda un error en la consola del navegador). Por eso acá
// se detecta el problema explícitamente y se expone `supabaseConfigError`
// para que main.jsx pueda mostrar una pantalla de configuración en vez de
// dejar la página en blanco.
export let supabaseConfigError = null;

function urlValida(valor) {
  try {
    // eslint-disable-next-line no-new
    new URL(valor);
    return true;
  } catch {
    return false;
  }
}

if (!url || !anonKey) {
  supabaseConfigError = 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en frontend/.env';
} else if (!urlValida(url)) {
  supabaseConfigError = `VITE_SUPABASE_URL no es una URL válida: "${url}"`;
}

export const supabase = supabaseConfigError
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

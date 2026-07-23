import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Cliente con privilegios de servicio: usado por controladores/servicios
// del backend después de que los middlewares ya validaron auth + rol.
// Bypassa RLS a propósito porque la autorización ya ocurrió en Express.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cliente "anon" usado únicamente para verificar tokens de usuario
// (auth.getUser) sin necesitar la service role key para eso.
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

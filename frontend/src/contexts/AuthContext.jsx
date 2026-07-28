import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigError } from '../services/supabaseClient.js';
import { usuariosApi, negociosApi } from '../services/endpoints.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [negocioConfig, setNegocioConfig] = useState(null);
  const [cargando, setCargando] = useState(!supabaseConfigError);

  // Si Supabase no está configurado, no intentamos tocar `supabase` (es null).
  // main.jsx ya se encarga de mostrar la pantalla de configuración en ese caso.
  if (supabaseConfigError) {
    return (
      <AuthContext.Provider
        value={{
          session: null,
          perfil: null,
          negocioConfig: null,
          cargando: false,
          iniciarSesion: async () => {},
          cerrarSesion: async () => {},
          recargarPerfil: async () => {},
          recargarNegocioConfig: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  const cargarNegocioConfig = useCallback(async () => {
    try {
      const config = await negociosApi.miConfiguracion();
      setNegocioConfig(config);
    } catch {
      // Si falla (ej. super_admin sin negocio), no bloqueamos el login por esto.
      setNegocioConfig({ modo_mesas: 'libre' });
    }
  }, []);

  const cargarPerfil = useCallback(async () => {
    try {
      const data = await usuariosApi.perfil();
      setPerfil(data);
      await cargarNegocioConfig();
    } catch {
      setPerfil(null);
      setNegocioConfig(null);
    }
  }, [cargarNegocioConfig]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await cargarPerfil();
      setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nuevaSesion) => {
      setSession(nuevaSesion);
      if (nuevaSesion) {
        await cargarPerfil();
      } else {
        setPerfil(null);
        setNegocioConfig(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [cargarPerfil]);

  async function iniciarSesion(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traducirErrorAuth(error.message));
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setPerfil(null);
    setNegocioConfig(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        negocioConfig,
        cargando,
        iniciarSesion,
        cerrarSesion,
        recargarPerfil: cargarPerfil,
        recargarNegocioConfig: cargarNegocioConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function traducirErrorAuth(mensaje) {
  if (mensaje.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (mensaje.includes('Email not confirmed')) return 'El correo aún no ha sido confirmado.';
  return mensaje;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.jsx';

const RUTA_POR_ROL = {
  super_admin: '/admin',
  admin_negocio: '/admin',
  barra: '/barra',
  mesero: '/mesero',
};

export default function LoginPage() {
  const { session, perfil, iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (session && perfil) navigate(RUTA_POR_ROL[perfil.rol] || '/login', { replace: true });
  }, [session, perfil, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    try {
      await iniciarSesion(email, password);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-petrol-500 to-petrol-700 text-xl font-bold text-white shadow-lift">
            B
          </div>
          <h1 className="font-display text-2xl font-bold text-white">BarFlow POS</h1>
          <p className="mt-1 text-sm text-mist-400">Administra tu bar en tiempo real</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Correo electrónico</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="tucorreo@negocio.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={cargando} className="btn-primary w-full">
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-mist-500">
          ¿Problemas para ingresar? Contacta al administrador de tu negocio.
        </p>
      </div>
    </div>
  );
}

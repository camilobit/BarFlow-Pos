import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Grid3x3, Package, Boxes, Wallet, Users, UserCog, Building2, LogOut, Martini, KeyRound, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import CambiarPasswordModal from '../common/CambiarPasswordModal.jsx';

// El admin de un negocio necesita todo el menú operativo. El super_admin
// no opera un negocio día a día — solo administra la plataforma — así
// que su menú se reduce a lo que de verdad usa.
const NAV_ADMIN_NEGOCIO = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/mesas', label: 'Mesas', icon: Grid3x3 },
  { to: '/admin/barras', label: 'Barras', icon: Martini },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/caja', label: 'Caja', icon: Wallet },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/equipo', label: 'Equipo', icon: UserCog },
];

const NAV_SUPER_ADMIN = [{ to: '/admin/negocios', label: 'Negocios', icon: Building2, end: true }];

export default function AdminLayout() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [modalPassword, setModalPassword] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  const esSuperAdmin = perfil?.rol === 'super_admin';
  const nav = esSuperAdmin ? NAV_SUPER_ADMIN : NAV_ADMIN_NEGOCIO;

  async function salir() {
    await cerrarSesion();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-mist-50">
      {/* Sidebar de escritorio */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-mist-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 text-sm font-bold text-white">B</div>
          <span className="font-display text-base font-bold text-ink-900">BarFlow</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-petrol-50 text-petrol-700' : 'text-mist-500 hover:bg-mist-100 hover:text-ink-800'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-mist-200 p-3">
          <div className="mb-2 px-2">
            <p className="text-sm font-semibold text-ink-900">{perfil?.nombre} {perfil?.apellido}</p>
            <p className="text-xs capitalize text-mist-500">{perfil?.rol?.replace('_', ' ')}</p>
          </div>
          <button onClick={() => setModalPassword(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-mist-500 hover:bg-mist-100">
            <KeyRound size={16} /> Cambiar contraseña
          </button>
          <button onClick={salir} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-mist-500 hover:bg-mist-100">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {modalPassword && <CambiarPasswordModal onClose={() => setModalPassword(false)} />}

      <div className="flex-1 lg:ml-60">
        {/* Barra superior móvil */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-mist-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-petrol-500 to-petrol-700 text-xs font-bold text-white">B</div>
            <span className="font-display text-base font-bold text-ink-900">BarFlow</span>
          </div>
          <button onClick={() => setMenuMovilAbierto(true)} className="rounded-xl p-2 text-mist-500 hover:bg-mist-100">
            <Menu size={22} />
          </button>
        </div>

        {/* Accesos rápidos horizontales (solo si hay más de un ítem) */}
        {nav.length > 1 && (
          <div className="sticky top-[57px] z-10 flex gap-1.5 overflow-x-auto border-b border-mist-200 bg-white px-3 py-2 lg:hidden">
            {nav.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Menú móvil deslizable (perfil, cambiar contraseña, cerrar sesión) */}
        {menuMovilAbierto && (
          <div className="fixed inset-0 z-30 flex justify-end bg-ink-950/40 lg:hidden" onClick={() => setMenuMovilAbierto(false)}>
            <div className="h-full w-72 bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-base font-bold text-ink-900">Menú</span>
                <button onClick={() => setMenuMovilAbierto(false)} className="rounded-lg p-1.5 hover:bg-mist-100"><X size={20} /></button>
              </div>

              <nav className="mb-6 space-y-1">
                {nav.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMenuMovilAbierto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive ? 'bg-petrol-50 text-petrol-700' : 'text-mist-600 hover:bg-mist-100'
                      }`
                    }
                  >
                    <Icon size={18} /> {label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-mist-200 pt-4">
                <p className="mb-2 px-1 text-sm font-semibold text-ink-900">{perfil?.nombre} {perfil?.apellido}</p>
                <p className="mb-3 px-1 text-xs capitalize text-mist-500">{perfil?.rol?.replace('_', ' ')}</p>
                <button
                  onClick={() => { setMenuMovilAbierto(false); setModalPassword(true); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist-600 hover:bg-mist-100"
                >
                  <KeyRound size={16} /> Cambiar contraseña
                </button>
                <button onClick={salir} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist-600 hover:bg-mist-100">
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Grid3x3, Package, Boxes, Wallet, Users, UserCog, Building2,
  LogOut, Martini, KeyRound, X, MoreHorizontal, User,
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

// En celular, la navegación no es "el sidebar de escritorio metido en un
// cajón" — son las 4 acciones que de verdad se usan todos los días,
// abajo, a un pulgar de distancia (igual que Gmail, YouTube, Maps). Todo
// lo demás vive detrás de "Más".
const DESTINOS_PRINCIPALES = ['/admin', '/admin/inventario', '/admin/productos', '/admin/caja'];

export default function AdminLayout() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [modalPassword, setModalPassword] = useState(false);
  const [menuMasAbierto, setMenuMasAbierto] = useState(false);
  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false);

  const esSuperAdmin = perfil?.rol === 'super_admin';
  const nav = esSuperAdmin ? NAV_SUPER_ADMIN : NAV_ADMIN_NEGOCIO;
  const navPrincipal = nav.filter((item) => DESTINOS_PRINCIPALES.includes(item.to));
  const navSecundaria = nav.filter((item) => !DESTINOS_PRINCIPALES.includes(item.to));
  const hayNavInferior = !esSuperAdmin; // el super_admin solo tiene un destino, no necesita barra inferior

  async function salir() {
    await cerrarSesion();
    navigate('/login');
  }

  function estaActivo(item) {
    return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
  }

  return (
    <div className="flex min-h-screen bg-mist-50">
      {/* Sidebar de escritorio (>1024px) — la vista "sentado, mouse y teclado" */}
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
        {/* Barra superior móvil/tablet: solo marca + acceso a la cuenta.
            La navegación entre secciones vive abajo, no aquí. */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-mist-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-petrol-500 to-petrol-700 text-xs font-bold text-white">B</div>
            <span className="font-display text-base font-bold text-ink-900">BarFlow</span>
          </div>
          <button
            onClick={() => setMenuCuentaAbierto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-mist-600"
            aria-label="Mi cuenta"
          >
            <User size={17} />
          </button>
        </div>

        {/* Navegación inferior (< 1024px) — las 4 acciones del día a día,
            a un pulgar de distancia, más "Más" para el resto. */}
        {hayNavInferior && (
          <nav
            className="fixed inset-x-0 bottom-0 z-20 flex border-t border-mist-200 bg-white/95 backdrop-blur lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            aria-label="Navegación principal"
          >
            {navPrincipal.map(({ to, label, icon: Icon, end }) => {
              const activo = estaActivo({ to, end });
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className="flex flex-1 flex-col items-center gap-0.5 py-2.5"
                  aria-current={activo ? 'page' : undefined}
                >
                  <Icon size={20} strokeWidth={activo ? 2.5 : 2} className={activo ? 'text-petrol-600' : 'text-mist-400'} />
                  <span className={`text-[10px] font-semibold ${activo ? 'text-petrol-600' : 'text-mist-400'}`}>{label}</span>
                </NavLink>
              );
            })}
            <button onClick={() => setMenuMasAbierto(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5">
              <MoreHorizontal size={20} className={navSecundaria.some(estaActivo) ? 'text-petrol-600' : 'text-mist-400'} />
              <span className={`text-[10px] font-semibold ${navSecundaria.some(estaActivo) ? 'text-petrol-600' : 'text-mist-400'}`}>Más</span>
            </button>
          </nav>
        )}

        {/* Hoja "Más": el resto de las secciones, un toque más lejos */}
        {menuMasAbierto && (
          <div className="fixed inset-0 z-30 flex items-end bg-ink-950/40 lg:hidden" onClick={() => setMenuMasAbierto(false)}>
            <div className="w-full rounded-t-3xl bg-white p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-base font-bold text-ink-900">Más</span>
                <button onClick={() => setMenuMasAbierto(false)} className="btn-icon" aria-label="Cerrar"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {navSecundaria.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMenuMasAbierto(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition ${
                        isActive ? 'bg-petrol-50 text-petrol-700' : 'text-mist-600 hover:bg-mist-100'
                      }`
                    }
                  >
                    <Icon size={20} />
                    <span className="text-[11px] font-semibold leading-tight">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hoja de cuenta: perfil, cambiar contraseña, cerrar sesión */}
        {menuCuentaAbierto && (
          <div className="fixed inset-0 z-30 flex items-end bg-ink-950/40 lg:hidden" onClick={() => setMenuCuentaAbierto(false)}>
            <div className="w-full rounded-t-3xl bg-white p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-petrol-100 text-sm font-bold text-petrol-700">
                  {(perfil?.nombre || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{perfil?.nombre} {perfil?.apellido}</p>
                  <p className="text-xs capitalize text-mist-500">{perfil?.rol?.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={() => { setMenuCuentaAbierto(false); setModalPassword(true); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-mist-600 hover:bg-mist-100"
              >
                <KeyRound size={17} /> Cambiar contraseña
              </button>
              <button onClick={salir} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-mist-600 hover:bg-mist-100">
                <LogOut size={17} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}

        <main className={`p-4 sm:p-5 lg:p-8 ${hayNavInferior ? 'pb-24' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

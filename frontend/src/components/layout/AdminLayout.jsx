import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Grid3x3, Package, Boxes, Wallet, Users, UserCog, Building2, LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

const NAV = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/mesas', label: 'Mesas', icon: Grid3x3 },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/caja', label: 'Caja', icon: Wallet },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/equipo', label: 'Equipo', icon: UserCog },
];

export default function AdminLayout() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  async function salir() {
    await cerrarSesion();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-mist-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-mist-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-petrol-500 to-petrol-700 text-sm font-bold text-white">B</div>
          <span className="font-display text-base font-bold text-ink-900">BarFlow</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
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
          {perfil?.rol === 'super_admin' && (
            <NavLink
              to="/admin/negocios"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-petrol-50 text-petrol-700' : 'text-mist-500 hover:bg-mist-100 hover:text-ink-800'
                }`
              }
            >
              <Building2 size={18} /> Negocios
            </NavLink>
          )}
        </nav>

        <div className="border-t border-mist-200 p-3">
          <div className="mb-2 px-2">
            <p className="text-sm font-semibold text-ink-900">{perfil?.nombre} {perfil?.apellido}</p>
            <p className="text-xs capitalize text-mist-500">{perfil?.rol?.replace('_', ' ')}</p>
          </div>
          <button onClick={salir} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-mist-500 hover:bg-mist-100">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-60">
        {/* Nav móvil simple */}
        <div className="flex items-center justify-between border-b border-mist-200 bg-white px-4 py-3 lg:hidden">
          <span className="font-display text-base font-bold text-ink-900">BarFlow</span>
          <button onClick={salir} className="rounded-xl p-2 text-mist-500 hover:bg-mist-100"><LogOut size={18} /></button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-mist-200 bg-white px-3 py-2 lg:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${isActive ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'}`}>
              {label}
            </NavLink>
          ))}
        </div>

        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

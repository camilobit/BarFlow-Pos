import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import { useAuth } from './contexts/AuthContext.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import BarraPage from './pages/barra/BarraPage.jsx';
import MeseroPage from './pages/mesero/MeseroPage.jsx';
import MeseroMesaDetalle from './pages/mesero/MeseroMesaDetalle.jsx';
import MeseroPedidoDetalle from './pages/mesero/MeseroPedidoDetalle.jsx';

import AdminLayout from './components/layout/AdminLayout.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminMesasPage from './pages/admin/AdminMesasPage.jsx';
import AdminBarrasPage from './pages/admin/AdminBarrasPage.jsx';
import AdminProductosPage from './pages/admin/AdminProductosPage.jsx';
import AdminInventarioPage from './pages/admin/AdminInventarioPage.jsx';
import AdminCajaPage from './pages/admin/AdminCajaPage.jsx';
import AdminClientesPage from './pages/admin/AdminClientesPage.jsx';
import AdminEquipoPage from './pages/admin/AdminEquipoPage.jsx';
import AdminNegociosPage from './pages/admin/AdminNegociosPage.jsx';

// El super_admin no opera un negocio específico día a día — solo
// administra la plataforma. Si intenta entrar a una pantalla operativa
// (Mesas, Productos, Caja...) por URL directa, lo mandamos a Negocios.
function SoloAdminNegocio({ children }) {
  const { perfil } = useAuth();
  if (perfil?.rol === 'super_admin') return <Navigate to="/admin/negocios" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/barra"
        element={
          <ProtectedRoute roles={['barra', 'admin_negocio', 'super_admin']}>
            <BarraPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mesero"
        element={
          <ProtectedRoute roles={['mesero', 'admin_negocio', 'super_admin']}>
            <MeseroPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mesero/mesa/:mesaId"
        element={
          <ProtectedRoute roles={['mesero', 'admin_negocio', 'super_admin']}>
            <MeseroMesaDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mesero/pedido/:pedidoId"
        element={
          <ProtectedRoute roles={['mesero', 'barra', 'admin_negocio', 'super_admin']}>
            <MeseroPedidoDetalle />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin_negocio', 'super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SoloAdminNegocio><AdminDashboardPage /></SoloAdminNegocio>} />
        <Route path="mesas" element={<SoloAdminNegocio><AdminMesasPage /></SoloAdminNegocio>} />
        <Route path="barras" element={<SoloAdminNegocio><AdminBarrasPage /></SoloAdminNegocio>} />
        <Route path="productos" element={<SoloAdminNegocio><AdminProductosPage /></SoloAdminNegocio>} />
        <Route path="inventario" element={<SoloAdminNegocio><AdminInventarioPage /></SoloAdminNegocio>} />
        <Route path="caja" element={<SoloAdminNegocio><AdminCajaPage /></SoloAdminNegocio>} />
        <Route path="clientes" element={<SoloAdminNegocio><AdminClientesPage /></SoloAdminNegocio>} />
        <Route path="equipo" element={<SoloAdminNegocio><AdminEquipoPage /></SoloAdminNegocio>} />
        <Route path="negocios" element={<AdminNegociosPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

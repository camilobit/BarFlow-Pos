import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LoadingScreen from './LoadingScreen.jsx';

const RUTA_POR_ROL = {
  super_admin: '/admin',
  admin_negocio: '/admin',
  barra: '/barra',
  mesero: '/mesero',
};

export default function ProtectedRoute({ roles, children }) {
  const { session, perfil, cargando } = useAuth();

  if (cargando) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!perfil) return <LoadingScreen />;

  if (roles && !roles.includes(perfil.rol)) {
    return <Navigate to={RUTA_POR_ROL[perfil.rol] || '/login'} replace />;
  }

  return children;
}

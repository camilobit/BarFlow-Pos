import { useAuth } from '../../contexts/AuthContext.jsx';
import MeseroMesasGrid from '../../components/mesero/MeseroMesasGrid.jsx';
import MeseroListaPedidos from '../../components/mesero/MeseroListaPedidos.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

// Cada negocio elige, desde Admin → Mesas, si trabaja con un plano de
// mesas fijo o con pedidos libres (sin plano). Esta pantalla no decide
// nada por su cuenta — solo muestra la variante que el negocio configuró.
export default function MeseroPage() {
  const { negocioConfig } = useAuth();

  if (!negocioConfig) return <LoadingScreen />;

  return negocioConfig.modo_mesas === 'fijo' ? <MeseroMesasGrid /> : <MeseroListaPedidos />;
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Calendar, CheckCircle2, Clock3, KeyRound, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { pedidosApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import { SkeletonLista } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import CambiarPasswordModal from '../common/CambiarPasswordModal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const FILTROS_ESTADO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'incompletos', etiqueta: 'Incompletos' },
  { valor: 'completos', etiqueta: 'Completos' },
];

const ESTADO_COMPLETO = ['pagado'];
const ESTADO_CANCELADO = ['cancelado'];

export default function MeseroListaPedidos() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [modalPassword, setModalPassword] = useState(false);

  const cargar = useCallback(async () => {
    const params = { mesero_id: perfil.id };
    if (filtroFecha) {
      params.desde = `${filtroFecha}T00:00:00`;
      params.hasta = `${filtroFecha}T23:59:59`;
    }
    const data = await pedidosApi.listar(params);
    setPedidos(data);
  }, [perfil.id, filtroFecha]);

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeTable({ table: 'pedidos', onChange: cargar });

  const visibles = (pedidos || []).filter((p) => {
    if (ESTADO_CANCELADO.includes(p.estado)) return filtroEstado === 'todos';
    if (filtroEstado === 'completos') return ESTADO_COMPLETO.includes(p.estado);
    if (filtroEstado === 'incompletos') return !ESTADO_COMPLETO.includes(p.estado);
    return true;
  });

  return (
    <div className="min-h-screen bg-mist-50 pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mist-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div>
          <h1 className="font-display text-lg font-bold text-ink-900">Mis pedidos</h1>
          <p className="text-xs text-mist-500">Hola, {perfil?.nombre}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setModalPassword(true)} className="btn-icon" aria-label="Cambiar contraseña">
            <KeyRound size={20} />
          </button>
          <button onClick={cerrarSesion} className="btn-icon" aria-label="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {modalPassword && <CambiarPasswordModal onClose={() => setModalPassword(false)} />}

      <div className="space-y-3 border-b border-mist-200 bg-white px-4 py-3">
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Filtrar por estado">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              role="tab"
              aria-selected={filtroEstado === f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filtroEstado === f.valor ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <div className="relative">
          <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
          <label htmlFor="filtro-fecha-mesero" className="sr-only-focusable">Filtrar por fecha</label>
          <input
            id="filtro-fecha-mesero"
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="input pl-9 pr-10"
          />
          {filtroFecha && (
            <button
              onClick={() => setFiltroFecha('')}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-mist-400 hover:bg-mist-100 hover:text-ink-800"
              aria-label="Quitar filtro de fecha"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <main className="px-4 py-4">
        {!pedidos ? (
          <SkeletonLista filas={4} />
        ) : visibles.length === 0 ? (
          <EmptyState
            icono={Clock3}
            titulo="No tienes pedidos con este filtro"
            descripcion="Prueba cambiar el filtro de estado o de fecha, o crea un pedido nuevo con el botón de abajo."
          />
        ) : (
          <div className="space-y-3">
            {visibles.map((pedido) => (
              <button
                key={pedido.id}
                onClick={() => navigate(`/mesero/pedido/${pedido.id}`)}
                className="card-tap flex w-full items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {pedido.referencia_mesa || pedido.mesa?.nombre || 'Sin referencia'}
                  </p>
                  <p className="text-xs text-mist-500">
                    {new Date(pedido.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(pedido.total)}</p>
                  <span className={`badge ${pedido.estado === 'pagado' ? 'bg-petrol-100 text-petrol-700' : pedido.estado === 'cancelado' ? 'bg-mist-100 text-mist-500' : 'bg-gold-200 text-gold-600'}`}>
                    {pedido.estado === 'pagado' && <CheckCircle2 size={11} />}
                    {pedido.estado}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => navigate('/mesero/pedido/nuevo')}
        className="btn-lg fixed inset-x-4 bg-gold-500 text-ink-950 hover:bg-gold-600 shadow-lift"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Plus size={20} /> Crear pedido
      </button>
    </div>
  );
}

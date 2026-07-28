import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Calendar, CheckCircle2, Clock3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { pedidosApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

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

  if (!pedidos) return <LoadingScreen />;

  const visibles = pedidos.filter((p) => {
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
        <button onClick={cerrarSesion} className="rounded-xl p-2 text-mist-500 hover:bg-mist-100">
          <LogOut size={20} />
        </button>
      </header>

      <div className="space-y-3 border-b border-mist-200 bg-white px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
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
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="input pl-9"
          />
          {filtroFecha && (
            <button onClick={() => setFiltroFecha('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-petrol-600">
              Limpiar
            </button>
          )}
        </div>
      </div>

      <main className="px-4 py-4">
        {visibles.length === 0 ? (
          <div className="flex h-[40vh] flex-col items-center justify-center text-center text-mist-500">
            <Clock3 size={36} className="mb-3 opacity-40" />
            <p className="text-sm">No tienes pedidos con este filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibles.map((pedido) => (
              <button
                key={pedido.id}
                onClick={() => navigate(`/mesero/pedido/${pedido.id}`)}
                className="card flex w-full items-center justify-between p-4 text-left active:scale-[0.98]"
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
        className="fixed inset-x-4 bottom-6 flex items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 text-sm font-bold text-ink-950 shadow-lift active:scale-[0.98]"
      >
        <Plus size={20} /> Crear pedido
      </button>
    </div>
  );
}

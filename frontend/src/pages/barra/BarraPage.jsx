import { useEffect, useState, useCallback } from 'react';
import { LogOut, Clock, CheckCircle2, Flame, UtensilsCrossed, Wallet, BadgeCheck, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { pedidosApi, barrasApi, cajaApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import Modal from '../../components/common/Modal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const SIGUIENTE_ESTADO = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' };
const ETIQUETA_ACCION = { pendiente: 'Empezar', preparando: 'Marcar listo', listo: 'Entregar' };
const COLOR_ESTADO = {
  pendiente: 'bg-mist-100 text-mist-500 border-mist-200',
  preparando: 'bg-gold-200 text-gold-600 border-gold-400',
  listo: 'bg-petrol-100 text-petrol-600 border-petrol-300',
};

export default function BarraPage() {
  const { perfil, cerrarSesion } = useAuth();
  const [barras, setBarras] = useState([]);
  const [barraId, setBarraId] = useState(null);
  const [items, setItems] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [caja, setCaja] = useState(undefined);
  const [tab, setTab] = useState('pedidos'); // pedidos | pagos | caja
  const [cargando, setCargando] = useState(true);
  const [modalAbrirCaja, setModalAbrirCaja] = useState(false);
  const [modalCerrarCaja, setModalCerrarCaja] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinal, setMontoFinal] = useState('');

  const cargarBarras = useCallback(async () => {
    const data = await barrasApi.listar();
    setBarras(data);
    if (data.length && !barraId) setBarraId(data[0].id);
  }, [barraId]);

  const cargarItems = useCallback(async () => {
    if (!barraId) return;
    try {
      setItems(await pedidosApi.porBarra(barraId));
    } finally {
      setCargando(false);
    }
  }, [barraId]);

  const cargarPagosPendientes = useCallback(async () => {
    if (!barraId) return;
    setPagosPendientes(await pedidosApi.pagosPorVerificar(barraId));
  }, [barraId]);

  const cargarCaja = useCallback(async () => {
    if (!barraId) return;
    setCaja(await cajaApi.actual(barraId));
  }, [barraId]);

  useEffect(() => { cargarBarras(); }, [cargarBarras]);
  useEffect(() => { cargarItems(); cargarPagosPendientes(); cargarCaja(); }, [cargarItems, cargarPagosPendientes, cargarCaja]);

  useRealtimeTable({ table: 'pedido_items', filter: barraId ? `barra_id=eq.${barraId}` : undefined, onChange: cargarItems, enabled: !!barraId });
  useRealtimeTable({ table: 'pedidos', onChange: cargarPagosPendientes, enabled: !!barraId });

  async function avanzarEstado(item) {
    const siguiente = SIGUIENTE_ESTADO[item.estado];
    if (!siguiente) return;
    try {
      await pedidosApi.actualizarEstadoItem(item.id, siguiente);
      cargarItems();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmarPago(pedido) {
    try {
      await pedidosApi.verificarPago(pedido.id);
      toast.success('Pago confirmado');
      cargarPagosPendientes();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function abrirCaja(e) {
    e.preventDefault();
    try {
      await cajaApi.abrir(barraId, Number(montoInicial) || 0);
      toast.success('Caja abierta');
      setModalAbrirCaja(false);
      setMontoInicial('');
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function cerrarCaja(e) {
    e.preventDefault();
    try {
      await cajaApi.cerrar(barraId, Number(montoFinal) || 0);
      toast.success('Caja cerrada');
      setModalCerrarCaja(false);
      setMontoFinal('');
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const visibles = items.filter((i) => i.estado !== 'entregado');
  const nombreBarra = barras.find((b) => b.id === barraId)?.nombre;

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 bg-ink-950/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-petrol-600 text-white">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Pantalla de Barra</h1>
            <p className="text-xs text-mist-400">{perfil?.nombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {barras.map((b) => (
            <button
              key={b.id}
              onClick={() => setBarraId(b.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                barraId === b.id ? 'bg-petrol-600 text-white' : 'bg-ink-800 text-mist-300 hover:bg-ink-800/70'
              }`}
            >
              {b.nombre}
            </button>
          ))}
          <button onClick={cerrarSesion} className="ml-2 rounded-xl p-2 text-mist-400 hover:bg-ink-800 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-800 bg-ink-950 px-5 py-2.5">
        <button onClick={() => setTab('pedidos')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'pedidos' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Pedidos
        </button>
        <button onClick={() => setTab('pagos')} className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'pagos' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Pagos por verificar
          {pagosPendientes.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
              {pagosPendientes.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('caja')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'caja' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Caja
        </button>
      </div>

      <main className="p-5">
        {tab === 'pedidos' && (
          cargando ? (
            <LoadingScreen label="Cargando pedidos…" />
          ) : visibles.length === 0 ? (
            <div className="flex h-[50vh] flex-col items-center justify-center text-mist-500">
              <CheckCircle2 size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No hay pedidos pendientes por ahora.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibles.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border-2 bg-ink-900 p-4 shadow-lift transition ${
                    item.estado === 'pendiente' ? 'border-ink-800' : item.estado === 'preparando' ? 'border-gold-500' : 'border-petrol-500'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
                        {item.pedido?.mesa?.nombre || 'Para llevar'}
                      </p>
                      <p className="text-xs text-mist-500">{item.pedido?.mesero?.nombre}</p>
                    </div>
                    <span className={`badge border ${COLOR_ESTADO[item.estado]}`}>
                      {item.estado === 'preparando' && <Flame size={12} />}
                      {item.estado}
                    </span>
                  </div>

                  <h3 className="mb-1 font-display text-lg font-bold text-white">
                    {item.cantidad}× {item.producto?.nombre}
                  </h3>
                  {item.observaciones && (
                    <p className="mb-3 rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs text-gold-400">{item.observaciones}</p>
                  )}

                  <div className="mb-3 flex items-center gap-1.5 text-xs text-mist-500">
                    <Clock size={13} />
                    {new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <button onClick={() => avanzarEstado(item)} className="btn-primary w-full">
                    {ETIQUETA_ACCION[item.estado]}
                  </button>
                </article>
              ))}
            </div>
          )
        )}

        {tab === 'pagos' && (
          pagosPendientes.length === 0 ? (
            <div className="flex h-[50vh] flex-col items-center justify-center text-mist-500">
              <BadgeCheck size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No hay pagos pendientes por confirmar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagosPendientes.map((pedido) => (
                <article key={pedido.id} className="rounded-2xl border-2 border-gold-500 bg-ink-900 p-4 shadow-lift">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
                    {pedido.mesa?.nombre || 'Para llevar'}
                  </p>
                  <p className="mb-2 text-xs text-mist-500">Mesero: {pedido.mesero?.nombre}</p>
                  <p className="mb-1 font-display text-xl font-bold text-white">{formatoCOP.format(pedido.total)}</p>
                  <p className="mb-3 text-xs capitalize text-gold-400">{pedido.metodo_pago}</p>
                  <button onClick={() => confirmarPago(pedido)} className="btn-gold w-full">
                    <BadgeCheck size={16} /> Confirmar recibido
                  </button>
                </article>
              ))}
            </div>
          )
        )}

        {tab === 'caja' && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Wallet size={18} />
                  <span className="font-display font-bold">Caja de {nombreBarra}</span>
                </div>
                {!caja ? (
                  <button onClick={() => setModalAbrirCaja(true)} className="btn-primary"><Unlock size={16} /> Abrir</button>
                ) : (
                  <button onClick={() => setModalCerrarCaja(true)} className="btn-danger"><Lock size={16} /> Cerrar</button>
                )}
              </div>
              <p className="text-sm text-mist-400">
                {caja ? `Abierta con ${formatoCOP.format(caja.monto_inicial)} de base.` : 'No hay caja abierta en esta barra todavía.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {modalAbrirCaja && (
        <Modal title={`Abrir caja de ${nombreBarra}`} onClose={() => setModalAbrirCaja(false)}>
          <form onSubmit={abrirCaja} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Monto inicial en efectivo</label>
              <input required type="number" min="0" className="input" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">Abrir caja</button>
          </form>
        </Modal>
      )}

      {modalCerrarCaja && (
        <Modal title={`Cerrar caja de ${nombreBarra}`} onClose={() => setModalCerrarCaja(false)}>
          <form onSubmit={cerrarCaja} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Monto final contado en efectivo</label>
              <input required type="number" min="0" className="input" value={montoFinal} onChange={(e) => setMontoFinal(e.target.value)} />
            </div>
            <button type="submit" className="btn-danger w-full">Cerrar caja</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

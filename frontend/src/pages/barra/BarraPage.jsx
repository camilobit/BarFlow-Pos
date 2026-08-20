import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Clock, CheckCircle2, Flame, UtensilsCrossed, Wallet, BadgeCheck, Lock, Unlock, KeyRound,
  Plus, BarChart3, ClipboardList, Timer, TrendingUp, Trash2, Receipt, Ban, ArrowLeftRight, Check, X, History, Undo2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { pedidosApi, barrasApi, cajaApi, productosApi, movimientosApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import CambiarPasswordModal from '../../components/common/CambiarPasswordModal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const SIGUIENTE_ESTADO = { pendiente: 'preparando', preparando: 'listo', listo: 'entregado' };
const ETIQUETA_ACCION = { pendiente: 'Empezar', preparando: 'Marcar listo', listo: 'Entregar' };
const ORDEN_ESTADO = { pendiente: 0, preparando: 1, listo: 2, entregado: 3 };
const COLOR_ESTADO = {
  pendiente: 'bg-mist-100 text-mist-500 border-mist-200',
  preparando: 'bg-gold-200 text-gold-600 border-gold-400',
  listo: 'bg-petrol-100 text-petrol-600 border-petrol-300',
  entregado: 'bg-petrol-500/20 text-petrol-300 border-petrol-500',
};

export default function BarraPage() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [barras, setBarras] = useState([]);
  const [todasLasBarras, setTodasLasBarras] = useState([]);
  const [barraId, setBarraId] = useState(null);
  const [items, setItems] = useState([]);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [porCobrar, setPorCobrar] = useState([]);
  const [caja, setCaja] = useState(undefined);
  const [resumenCaja, setResumenCaja] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargandoEstadisticas, setCargandoEstadisticas] = useState(false);
  const [tab, setTab] = useState('pedidos'); // pedidos | cobros | traslados | historial | caja | estadisticas
  const [cargando, setCargando] = useState(true);
  const { confirmar, estaAbierto, opciones, onConfirmar, onCancelar } = useConfirm();
  const [modalAbrirCaja, setModalAbrirCaja] = useState(false);
  const [modalCerrarCaja, setModalCerrarCaja] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalNuevoTraslado, setModalNuevoTraslado] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinal, setMontoFinal] = useState('');
  const [insumos, setInsumos] = useState([]);
  const [movPendientes, setMovPendientes] = useState([]);
  const [movEnviados, setMovEnviados] = useState([]);
  const [formTraslado, setFormTraslado] = useState({ insumo_id: '', barra_destino_id: '', cantidad: '', nota: '' });
  const [historial, setHistorial] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [enviandoTraslado, setEnviandoTraslado] = useState(false);

  const cargarBarras = useCallback(async () => {
    const data = await barrasApi.listar();
    // Si este usuario tiene una barra fija asignada (ej. barravortex@negocio.com),
    // solo ve esa barra — no puede cambiar a otra desde la interfaz.
    const disponibles = perfil.barra_id ? data.filter((b) => b.id === perfil.barra_id) : data;
    setBarras(disponibles);
    setTodasLasBarras(data); // sin filtrar — para elegir destino de un traslado
    if (disponibles.length && !barraId) setBarraId(perfil.barra_id || disponibles[0].id);
  }, [barraId, perfil.barra_id]);

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

  // Pedidos que ESTE cajero creó directo en la barra (cliente en el
  // mostrador, sin mesero) y que ya se sirvieron pero todavía no se han
  // cobrado — para poder encontrarlos y cerrarlos aunque haya pasado un
  // rato desde que se crearon.
  const cargarPorCobrar = useCallback(async () => {
    if (!barraId || !perfil?.id) return;
    const data = await pedidosApi.listar({ origen: 'barra', mesero_id: perfil.id, estado: 'entregado' });
    setPorCobrar(data);
  }, [barraId, perfil?.id]);

  const cargarCaja = useCallback(async () => {
    if (!barraId) return;
    const actual = await cajaApi.actual(barraId);
    setCaja(actual);
    setResumenCaja(actual ? await cajaApi.resumen(barraId) : null);
  }, [barraId]);

  const cargarEstadisticas = useCallback(async () => {
    if (!barraId) return;
    setCargandoEstadisticas(true);
    try {
      setEstadisticas(await barrasApi.estadisticas(barraId));
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las estadísticas.');
      setEstadisticas({
        pedidosDesdeMesero: 0,
        pedidosDesdeBarra: 0,
        totalPedidos: 0,
        ventasTotales: 0,
        ventasHoy: 0,
        ticketPromedio: 0,
        pedidosPendientes: 0,
        pedidosEntregados: 0,
        tiempoPromedioDespachoMinutos: 0,
        productosMasVendidos: [],
      });
    } finally {
      setCargandoEstadisticas(false);
    }
  }, [barraId]);

  const cargarInsumos = useCallback(async () => {
    setInsumos(await productosApi.insumos());
  }, []);

  // Pedidos ya cobrados en esta barra, filtrados por fecha — para que el
  // cajero pueda revisar rápido qué se vendió en su turno sin tener que
  // interpretar las estadísticas agregadas.
  const cargarHistorial = useCallback(async () => {
    if (!barraId) return;
    const desde = `${filtroFecha}T00:00:00`;
    const hasta = `${filtroFecha}T23:59:59`;
    setHistorial(await pedidosApi.listar({ estado: 'pagado', barra_id: barraId, desde, hasta }));
  }, [barraId, filtroFecha]);

  const cargarMovimientos = useCallback(async () => {
    if (!barraId) return;
    const [pendientes, enviados] = await Promise.all([
      movimientosApi.pendientes(barraId),
      movimientosApi.enviados(barraId),
    ]);
    setMovPendientes(pendientes);
    setMovEnviados(enviados);
  }, [barraId]);

  useEffect(() => { cargarBarras(); }, [cargarBarras]);
  useEffect(() => { cargarItems(); cargarPagosPendientes(); cargarCaja(); cargarPorCobrar(); cargarMovimientos(); }, [cargarItems, cargarPagosPendientes, cargarCaja, cargarPorCobrar, cargarMovimientos]);
  useEffect(() => { if (tab === 'estadisticas') cargarEstadisticas(); }, [tab, cargarEstadisticas]);
  useEffect(() => { if (tab === 'traslados' && insumos.length === 0) cargarInsumos(); }, [tab, insumos.length, cargarInsumos]);
  useEffect(() => { if (tab === 'historial') cargarHistorial(); }, [tab, cargarHistorial]);

  useRealtimeTable({ table: 'pedido_items', filter: barraId ? `barra_id=eq.${barraId}` : undefined, onChange: cargarItems, enabled: !!barraId });
  useRealtimeTable({
    table: 'pedidos',
    onChange: () => { cargarItems(); cargarPagosPendientes(); cargarPorCobrar(); if (tab === 'estadisticas') cargarEstadisticas(); },
    enabled: !!barraId,
  });
  useRealtimeTable({ table: 'movimientos_inventario', onChange: cargarMovimientos, enabled: !!barraId });

  // Un solo botón mueve TODOS los productos de tu barra en este pedido al
  // siguiente paso — ya no hay que darle a cada producto por separado.
  async function avanzarGrupo(pedidoId) {
    try {
      await pedidosApi.avanzarPorBarra(pedidoId, barraId);
      cargarItems();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Quitar SOLO este producto — nada más funciona antes de entregarse
  // (el backend también lo protege).
  async function cancelarItem(item) {
    const ok = await confirmar({
      titulo: 'Cancelar producto',
      mensaje: `¿Eliminar "${item.cantidad}× ${item.producto?.nombre}" de este pedido? No se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await pedidosApi.quitarItem(item.pedido.id, item.id);
      toast.success('Producto eliminado del pedido');
      cargarItems();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Anula SOLO los productos de TU barra en este pedido, y SOLO los que
  // aún no se han entregado (lo ya servido es una venta real, nunca se
  // toca). Cualquier barra resuelve su propia parte sin depender del
  // admin — si el pedido tiene otra barra involucrada, esa barra anula
  // la suya por separado. Devuelve al inventario lo que ya se hubiera
  // descontado.
  async function anularPedido(pedidoId) {
    const ok = await confirmar({
      titulo: 'Anular mis productos de este pedido',
      mensaje: 'Esto anula los productos de TU barra en este pedido que aún no se han entregado, y devuelve al inventario lo que ya se hubiera descontado. Lo ya entregado no se toca. No se puede deshacer.',
      textoConfirmar: 'Anular',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await pedidosApi.anular(pedidoId, barraId);
      toast.success('Productos anulados');
      cargarItems();
      cargarPorCobrar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Distinto de "Anular": esto es para cuando el producto YA se entregó,
  // pero el cliente se fue sin pagar y lo devolvió físicamente (ej. se
  // fue a otro negocio). Exige escribir un motivo — queda en un reporte
  // aparte para que el admin pueda revisarlo.
  const [modalDevolucion, setModalDevolucion] = useState(null); // pedido, o null
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [enviandoDevolucion, setEnviandoDevolucion] = useState(false);

  async function confirmarDevolucion(e) {
    e.preventDefault();
    setEnviandoDevolucion(true);
    try {
      const resultado = await pedidosApi.devolucion(modalDevolucion.id, barraId, motivoDevolucion);
      toast.success(`${resultado.productosDevueltos} producto(s) devuelto(s) al inventario`);
      setModalDevolucion(null);
      setMotivoDevolucion('');
      cargarItems();
      cargarPorCobrar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviandoDevolucion(false);
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

  async function enviarTraslado(e) {
    e.preventDefault();
    setEnviandoTraslado(true);
    try {
      await movimientosApi.crear({
        insumo_id: formTraslado.insumo_id,
        barra_origen_id: barraId,
        barra_destino_id: formTraslado.barra_destino_id,
        cantidad: Number(formTraslado.cantidad),
        nota: formTraslado.nota || undefined,
      });
      toast.success('Traslado enviado — falta que la otra barra lo acepte');
      setModalNuevoTraslado(false);
      setFormTraslado({ insumo_id: '', barra_destino_id: '', cantidad: '', nota: '' });
      cargarMovimientos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviandoTraslado(false);
    }
  }

  async function aceptarTraslado(mov) {
    try {
      await movimientosApi.aceptar(mov.id);
      toast.success(`${mov.cantidad} ${mov.insumo?.unidad} de ${mov.insumo?.nombre} sumadas a tu inventario`);
      cargarMovimientos();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function rechazarTraslado(mov) {
    const ok = await confirmar({
      titulo: 'Rechazar traslado',
      mensaje: `¿Rechazar este envío de ${mov.cantidad} ${mov.insumo?.unidad} de ${mov.insumo?.nombre}? Se le devuelve a ${mov.barra_origen?.nombre}.`,
      textoConfirmar: 'Rechazar',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await movimientosApi.rechazar(mov.id);
      toast.success('Traslado rechazado');
      cargarMovimientos();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const insumoSeleccionado = insumos.find((i) => i.id === formTraslado.insumo_id);
  const stockDisponibleEnviar = insumoSeleccionado?.stock_por_barra?.find((s) => s.barra_id === barraId)?.stock ?? 0;

  // "Cobros" unifica dos cosas que antes eran pestañas separadas y se
  // sentían redundantes: pedidos de mesero pagados y sin verificar, y
  // pedidos nativos de barra ya servidos pero aún no cobrados.
  // Una tarjeta por PEDIDO, no por producto — un pedido de 10 productos se
  // ve como una sola tarjeta con 10 líneas, no como 10 tarjetas sueltas.
  const pedidosAgrupados = useMemo(() => {
    const grupos = new Map();
    for (const item of items) {
      const id = item.pedido?.id;
      if (!id) continue;
      if (!grupos.has(id)) grupos.set(id, { pedido: item.pedido, items: [] });
      grupos.get(id).items.push(item);
    }
    return [...grupos.values()].sort((a, b) => new Date(a.items[0].created_at) - new Date(b.items[0].created_at));
  }, [items]);

  const cobros = useMemo(() => {
    const deVerificar = pagosPendientes.map((p) => ({ ...p, _tipo: 'verificar' }));
    const deCobrar = porCobrar.map((p) => ({ ...p, _tipo: 'cobrar' }));
    return [...deVerificar, ...deCobrar].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [pagosPendientes, porCobrar]);

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
          {barras.length > 1 ? (
            barras.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarraId(b.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  barraId === b.id ? 'bg-petrol-600 text-white' : 'bg-ink-800 text-mist-300 hover:bg-ink-800/70'
                }`}
              >
                {b.nombre}
              </button>
            ))
          ) : (
            barras[0] && <span className="rounded-xl bg-ink-800 px-3.5 py-2 text-xs font-semibold text-white">{barras[0].nombre}</span>
          )}
          <button onClick={() => setModalPassword(true)} className="ml-2 rounded-xl p-2 text-mist-400 hover:bg-ink-800 hover:text-white" aria-label="Cambiar contraseña">
            <KeyRound size={18} />
          </button>
          <button onClick={cerrarSesion} className="rounded-xl p-2 text-mist-400 hover:bg-ink-800 hover:text-white" aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ink-800 bg-ink-950 px-5 py-2.5" role="tablist" aria-label="Secciones de la barra">
        <button onClick={() => setTab('pedidos')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'pedidos' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Pedidos
        </button>
        <button onClick={() => setTab('cobros')} className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'cobros' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Cobros
          {cobros.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
              {cobros.length}
            </span>
          )}
        </button>
        {todasLasBarras.length > 1 && (
          <button onClick={() => setTab('traslados')} className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'traslados' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
            Traslados
            {movPendientes.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-ink-950">
                {movPendientes.length}
              </span>
            )}
          </button>
        )}
        <button onClick={() => setTab('caja')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'caja' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          Caja
        </button>
        <button onClick={() => setTab('historial')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'historial' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          <History size={13} /> Historial
        </button>
        <button onClick={() => setTab('estadisticas')} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'estadisticas' ? 'bg-petrol-600 text-white' : 'text-mist-400 hover:bg-ink-800'}`}>
          <BarChart3 size={13} /> Estadísticas
        </button>

        {/* Un cliente llega directo a la barra, sin mesero de por medio */}
        <button
          onClick={() => navigate('/mesero/pedido/nuevo', { state: { barraId } })}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-ink-950"
        >
          <Plus size={14} /> Crear pedido
        </button>
      </div>

      <main className="p-5">
        {tab === 'pedidos' && (
          cargando ? (
            <LoadingScreen label="Cargando pedidos…" />
          ) : pedidosAgrupados.length === 0 ? (
            <EmptyState icono={CheckCircle2} titulo="No hay pedidos pendientes por ahora" oscuro />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {pedidosAgrupados.map(({ pedido, items: itemsPedido }) => {
                const todoEntregado = itemsPedido.every((i) => i.estado === 'entregado');
                return (
                  <article
                    key={pedido.id}
                    className={`rounded-2xl border-2 bg-ink-900 p-4 shadow-lift transition ${
                      todoEntregado ? 'border-petrol-500/60 opacity-80' : 'border-ink-800'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
                          {pedido.mesa?.nombre || pedido.referencia_mesa || 'Para llevar'}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-mist-500">
                          {pedido.origen === 'barra' ? (
                            <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-400">Barra</span>
                          ) : (
                            <span className="rounded bg-petrol-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-petrol-300">Mesero</span>
                          )}
                          {pedido.mesero?.nombre}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-mist-500">
                        <Clock size={13} />
                        {new Date(itemsPedido[0].created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {pedido.observaciones && (
                      <p className="mb-3 rounded-xl bg-ink-800 px-2.5 py-1.5 text-xs text-gold-400">📝 {pedido.observaciones}</p>
                    )}

                    <div className="mb-3 space-y-2">
                      {itemsPedido.map((item) => {
                        const entregado = item.estado === 'entregado';
                        return (
                          <div key={item.id} className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${COLOR_ESTADO[item.estado]} bg-opacity-10`}>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white">{item.cantidad}× {item.producto?.nombre}</p>
                              {item.observaciones && <p className="mt-0.5 text-xs text-gold-400">{item.observaciones}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span className={`badge border ${COLOR_ESTADO[item.estado]}`}>
                                {item.estado === 'preparando' && <Flame size={11} />}
                                {entregado && <CheckCircle2 size={11} />}
                                {item.estado}
                              </span>
                              {!entregado && (
                                <button onClick={() => cancelarItem(item)} className="rounded-lg p-1 text-mist-400 hover:text-red-400" aria-label={`Cancelar ${item.producto?.nombre}`}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {todoEntregado ? (
                      <div className="space-y-2">
                        <p className="rounded-xl bg-ink-800 px-3 py-2.5 text-center text-xs text-mist-400">
                          Ya entregado — esperando que se cobre
                        </p>
                        <button
                          onClick={() => setModalDevolucion(pedido)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-800 py-2 text-xs font-semibold text-mist-400 hover:border-gold-500 hover:text-gold-400"
                        >
                          <Undo2 size={14} /> Registrar devolución (cliente se fue sin pagar)
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => avanzarGrupo(pedido.id)} className="btn-primary flex-1">
                          {ETIQUETA_ACCION[itemsPedido.reduce((min, i) => (ORDEN_ESTADO[i.estado] < ORDEN_ESTADO[min] ? i.estado : min), itemsPedido[0].estado)]}
                        </button>
                        <button
                          onClick={() => anularPedido(pedido.id)}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-800 p-2.5 text-mist-400 hover:border-red-500 hover:text-red-400"
                          aria-label="Anular mis productos de este pedido"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )
        )}

        {tab === 'cobros' && (
          cobros.length === 0 ? (
            <EmptyState icono={Receipt} titulo="No hay pedidos pendientes de cobro" oscuro />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cobros.map((pedido) => (
                <article key={pedido.id} className={`rounded-2xl border-2 bg-ink-900 p-4 shadow-lift ${pedido._tipo === 'verificar' ? 'border-gold-500' : 'border-ink-800'}`}>
                  <span className={`badge mb-2 ${pedido._tipo === 'verificar' ? 'bg-gold-500/20 text-gold-400' : 'bg-petrol-500/20 text-petrol-300'}`}>
                    {pedido._tipo === 'verificar' ? 'Verificar pago de mesero' : 'Cobrar directo'}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
                    {pedido.mesa?.nombre || pedido.referencia_mesa || 'Para llevar'}
                  </p>
                  {pedido._tipo === 'verificar' && <p className="mb-1 text-xs text-mist-500">{pedido.mesero?.nombre}</p>}
                  <p className="mb-1 mt-1 font-display text-xl font-bold text-white">
                    {formatoCOP.format(pedido._tipo === 'verificar' ? pedido.total : pedido.subtotal)}
                  </p>
                  {pedido._tipo === 'verificar' && <p className="mb-1 text-xs capitalize text-gold-400">{pedido.metodo_pago}</p>}
                  {pedido.observaciones && (
                    <p className="mb-3 rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs text-gold-400">📝 {pedido.observaciones}</p>
                  )}

                  {pedido._tipo === 'verificar' ? (
                    <button onClick={() => confirmarPago(pedido)} className="btn-gold mt-2 w-full">
                      <BadgeCheck size={16} /> Confirmar recibido
                    </button>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => navigate(`/mesero/pedido/${pedido.id}`)} className="btn-gold flex-1">
                        <Receipt size={16} /> Cobrar ahora
                      </button>
                      <button onClick={() => anularPedido(pedido.id)} className="rounded-xl border border-ink-800 p-2.5 text-mist-400 hover:border-red-500 hover:text-red-400" aria-label="Anular mis productos de este pedido">
                        <Ban size={16} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )
        )}

        {tab === 'traslados' && (
          <div className="space-y-6">
            <button
              onClick={() => setModalNuevoTraslado(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950"
            >
              <ArrowLeftRight size={14} /> Enviar inventario a otra barra
            </button>

            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white">
                Por aceptar
                {movPendientes.length > 0 && <span className="badge bg-gold-500/20 text-gold-400">{movPendientes.length}</span>}
              </h2>
              {movPendientes.length === 0 ? (
                <p className="text-sm text-mist-500">No tienes traslados esperando tu confirmación.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {movPendientes.map((mov) => (
                    <article key={mov.id} className="rounded-2xl border-2 border-gold-500 bg-ink-900 p-4 shadow-lift">
                      <p className="text-xs text-mist-500">De <span className="font-semibold text-white">{mov.barra_origen?.nombre}</span></p>
                      <p className="my-1 font-display text-lg font-bold text-white">{mov.cantidad} {mov.insumo?.unidad} de {mov.insumo?.nombre}</p>
                      {mov.nota && <p className="mb-2 text-xs text-mist-400">"{mov.nota}"</p>}
                      <p className="mb-3 text-xs text-mist-500">Enviado por {mov.solicitante?.nombre}</p>
                      <div className="flex gap-2">
                        <button onClick={() => aceptarTraslado(mov)} className="btn-gold flex-1 !py-2 text-sm"><Check size={15} /> Aceptar</button>
                        <button onClick={() => rechazarTraslado(mov)} className="rounded-xl border border-ink-800 p-2 text-mist-400 hover:border-red-500 hover:text-red-400" aria-label="Rechazar traslado">
                          <X size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 font-display text-sm font-bold text-white">Enviados, esperando confirmación</h2>
              {movEnviados.length === 0 ? (
                <p className="text-sm text-mist-500">No tienes traslados propios esperando que la otra barra los acepte.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {movEnviados.map((mov) => (
                    <article key={mov.id} className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
                      <p className="text-xs text-mist-500">Para <span className="font-semibold text-white">{mov.barra_destino?.nombre}</span></p>
                      <p className="my-1 font-display text-base font-bold text-white">{mov.cantidad} {mov.insumo?.unidad} de {mov.insumo?.nombre}</p>
                      <span className="badge bg-mist-500/20 text-mist-300">Esperando que lo acepten</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'caja' && (
          <div className="max-w-2xl space-y-4">
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

            {caja && resumenCaja && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <TarjetaStat icono={TrendingUp} etiqueta="Ventas totales" valor={formatoCOP.format(resumenCaja.totales.ingresos)} />
                  <TarjetaStat icono={Wallet} etiqueta="Efectivo (esperado)" valor={formatoCOP.format(resumenCaja.totales.ingresosEfectivo)} acento="gold" />
                  <TarjetaStat icono={ArrowLeftRight} etiqueta="Transferencia" valor={formatoCOP.format(resumenCaja.totales.porMetodo?.transferencia || 0)} />
                  <TarjetaStat icono={Receipt} etiqueta="Tarjeta" valor={formatoCOP.format(resumenCaja.totales.porMetodo?.tarjeta || 0)} />
                </div>

                <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
                  <h2 className="mb-3 font-display text-sm font-bold text-white">Ventas de este turno</h2>
                  {resumenCaja.movimientos.filter((m) => m.tipo === 'venta').length === 0 ? (
                    <p className="text-sm text-mist-500">Todavía no hay ventas registradas en esta caja.</p>
                  ) : (
                    <div className="space-y-2">
                      {resumenCaja.movimientos.filter((m) => m.tipo === 'venta').map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-xl bg-ink-800 px-3 py-2.5">
                          <div>
                            <p className="text-sm text-white">{m.descripcion || 'Venta'}</p>
                            <p className="text-xs capitalize text-mist-500">{m.metodo_pago || 'sin método'} · {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className="font-semibold text-petrol-300">{formatoCOP.format(m.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {resumenCaja.movimientos.some((m) => m.tipo === 'ingreso' || m.tipo === 'egreso') && (
                  <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
                    <h2 className="mb-3 font-display text-sm font-bold text-white">Otros movimientos</h2>
                    <div className="space-y-2">
                      {resumenCaja.movimientos.filter((m) => m.tipo === 'ingreso' || m.tipo === 'egreso').map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-xl bg-ink-800 px-3 py-2.5">
                          <div>
                            <p className="text-sm capitalize text-white">{m.tipo}: {m.descripcion || '—'}</p>
                            <p className="text-xs text-mist-500">{new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className={`font-semibold ${m.tipo === 'egreso' ? 'text-red-400' : 'text-petrol-300'}`}>{formatoCOP.format(m.monto)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'historial' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label htmlFor="historial-fecha" className="text-xs font-semibold text-mist-400">Fecha</label>
              <input
                id="historial-fecha"
                type="date"
                className="input !w-auto bg-ink-900 !text-white [color-scheme:dark]"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
              {historial && (
                <span className="text-xs text-mist-500">
                  {historial.length} pedido(s) · {formatoCOP.format(historial.reduce((sum, p) => sum + Number(p.total), 0))}
                </span>
              )}
            </div>

            {!historial ? (
              <LoadingScreen label="Cargando historial…" />
            ) : historial.length === 0 ? (
              <EmptyState icono={History} titulo="No hay pedidos cobrados en esta fecha" oscuro />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {historial.map((pedido) => (
                  <article key={pedido.id} className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
                        {pedido.mesa?.nombre || pedido.referencia_mesa || 'Para llevar'}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-mist-500">
                        {pedido.origen === 'barra' ? (
                          <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-400">Barra</span>
                        ) : (
                          <span className="rounded bg-petrol-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-petrol-300">Mesero</span>
                        )}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-mist-500">{pedido.mesero?.nombre}</p>
                    <p className="mb-2 font-display text-lg font-bold text-white">{formatoCOP.format(pedido.total)}</p>
                    <div className="mb-2 space-y-0.5">
                      {(pedido.items || []).filter((it) => it.barra_id === barraId).map((it) => (
                        <p key={it.id} className="text-xs text-mist-400">{it.cantidad}× {it.producto?.nombre}</p>
                      ))}
                    </div>
                    {pedido.observaciones && (
                      <p className="mb-2 rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs text-gold-400">📝 {pedido.observaciones}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-mist-500">
                      <span className="capitalize">{pedido.metodo_pago}</span>
                      <span>{new Date(pedido.cerrado_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'estadisticas' && (
          cargandoEstadisticas && !estadisticas ? (
            <LoadingScreen label="Cargando estadísticas…" />
          ) : !estadisticas ? (
            <EmptyState icono={ClipboardList} titulo="No hay pedidos en este momento" oscuro />
          ) : (
            <div className="space-y-5">
              {estadisticas.totalPedidos === 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-ink-800 bg-ink-900 px-4 py-3 text-sm text-mist-400">
                  <ClipboardList size={16} />
                  No hay pedidos en este momento. Las estadísticas se irán llenando a medida que lleguen ventas.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <TarjetaStat icono={ClipboardList} etiqueta="Desde meseros" valor={estadisticas.pedidosDesdeMesero} />
                <TarjetaStat icono={UtensilsCrossed} etiqueta="Creados en barra" valor={estadisticas.pedidosDesdeBarra} acento="gold" />
                <TarjetaStat icono={TrendingUp} etiqueta="Ventas totales" valor={formatoCOP.format(estadisticas.ventasTotales)} />
                <TarjetaStat icono={TrendingUp} etiqueta="Ventas de hoy" valor={formatoCOP.format(estadisticas.ventasHoy)} acento="gold" />
                <TarjetaStat icono={BarChart3} etiqueta="Ticket promedio" valor={formatoCOP.format(estadisticas.ticketPromedio)} />
                <TarjetaStat icono={Timer} etiqueta="Despacho promedio" valor={`${estadisticas.tiempoPromedioDespachoMinutos} min`} />
                <TarjetaStat icono={Clock} etiqueta="Pendientes" valor={estadisticas.pedidosPendientes} />
                <TarjetaStat icono={CheckCircle2} etiqueta="Entregados" valor={estadisticas.pedidosEntregados} acento="gold" />
              </div>

              <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
                <h2 className="mb-4 font-display text-sm font-bold text-white">Productos más vendidos en esta barra</h2>
                <div className="space-y-2.5">
                  {estadisticas.productosMasVendidos.length === 0 ? (
                    <p className="text-sm text-mist-500">Aún no hay ventas registradas.</p>
                  ) : (
                    estadisticas.productosMasVendidos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-mist-300">{p.nombre}</span>
                        <span className="font-semibold text-petrol-300">{p.unidades} uds · {formatoCOP.format(p.ingresos)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )
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

      {modalNuevoTraslado && (
        <Modal title="Enviar inventario a otra barra" onClose={() => setModalNuevoTraslado(false)}>
          <form onSubmit={enviarTraslado} className="space-y-3">
            <div>
              <label className="label" htmlFor="traslado-insumo">Insumo</label>
              <select
                id="traslado-insumo"
                required
                className="select"
                value={formTraslado.insumo_id}
                onChange={(e) => setFormTraslado({ ...formTraslado, insumo_id: e.target.value })}
              >
                <option value="">Selecciona un insumo</option>
                {insumos.filter((i) => i.activo).map((i) => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
              {insumoSeleccionado && (
                <p className="mt-1 text-xs text-mist-500">Tienes {stockDisponibleEnviar} {insumoSeleccionado.unidad} en tu barra.</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="traslado-destino">Enviar a</label>
              <select
                id="traslado-destino"
                required
                className="select"
                value={formTraslado.barra_destino_id}
                onChange={(e) => setFormTraslado({ ...formTraslado, barra_destino_id: e.target.value })}
              >
                <option value="">Selecciona la barra destino</option>
                {todasLasBarras.filter((b) => b.id !== barraId).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="traslado-cantidad">Cantidad a enviar</label>
              <input
                id="traslado-cantidad"
                required
                type="number"
                min="0"
                max={stockDisponibleEnviar || undefined}
                step="any"
                className="input"
                value={formTraslado.cantidad}
                onChange={(e) => setFormTraslado({ ...formTraslado, cantidad: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="traslado-nota">Nota (opcional)</label>
              <input id="traslado-nota" className="input" placeholder="Ej. se acabó en Cantina" value={formTraslado.nota} onChange={(e) => setFormTraslado({ ...formTraslado, nota: e.target.value })} />
            </div>
            <p className="rounded-xl bg-mist-50 px-3 py-2.5 text-xs text-mist-600">
              Se descuenta de tu inventario apenas envías. La otra barra tiene que aceptarlo para que aparezca en el suyo.
            </p>
            <button type="submit" disabled={enviandoTraslado} className="btn-primary w-full">
              {enviandoTraslado ? 'Enviando…' : 'Enviar traslado'}
            </button>
          </form>
        </Modal>
      )}

      {modalDevolucion && (
        <Modal title="Registrar devolución" onClose={() => setModalDevolucion(null)}>
          <p className="mb-4 text-sm text-mist-600">
            Los productos de tu barra en este pedido volverán al inventario, y el pedido queda cancelado (nunca se cobró, así que no pasa por caja).
          </p>
          <form onSubmit={confirmarDevolucion} className="space-y-3">
            <div>
              <label className="label" htmlFor="motivo-devolucion">Motivo (obligatorio)</label>
              <textarea
                id="motivo-devolucion"
                required
                minLength={3}
                rows={3}
                className="input"
                placeholder="Ej. el cliente se fue a otro negocio antes de pagar"
                value={motivoDevolucion}
                onChange={(e) => setMotivoDevolucion(e.target.value)}
              />
            </div>
            <button type="submit" disabled={enviandoDevolucion} className="btn-danger w-full">
              {enviandoDevolucion ? 'Registrando…' : 'Registrar devolución'}
            </button>
          </form>
        </Modal>
      )}

      {modalPassword && <CambiarPasswordModal onClose={() => setModalPassword(false)} />}
      {estaAbierto && <ConfirmDialog {...opciones} onConfirmar={onConfirmar} onCancelar={onCancelar} />}
    </div>
  );
}

function TarjetaStat({ icono: Icono, etiqueta, valor, acento = 'petrol' }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-mist-400">{etiqueta}</span>
        <Icono size={15} className={acento === 'gold' ? 'text-gold-400' : 'text-petrol-400'} />
      </div>
      <p className="font-display text-lg font-bold text-white">{valor}</p>
    </div>
  );
}

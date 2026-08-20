import { useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, Plus, Minus, TriangleAlert, Settings, History as HistoryIcon, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { cajaApi, barrasApi, negociosApi } from '../../services/endpoints.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { rangoDeTurno } from '../../utils/turno.js';
import Modal from '../../components/common/Modal.jsx';
import EscribirParaConfirmar from '../../components/common/EscribirParaConfirmar.jsx';
import { SkeletonKpis } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminCajaPage() {
  const { negocioConfig, recargarNegocioConfig } = useAuth();
  const [barras, setBarras] = useState(null);
  const [barraActiva, setBarraActiva] = useState(null);
  const [caja, setCaja] = useState(undefined);
  const [resumen, setResumen] = useState(null);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(null);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinal, setMontoFinal] = useState('');
  const [movMonto, setMovMonto] = useState('');
  const [movDescripcion, setMovDescripcion] = useState('');
  const [modalLimpiar, setModalLimpiar] = useState(false);
  const [modalConfirmarLimpieza, setModalConfirmarLimpieza] = useState(false);
  const [reiniciarClientes, setReiniciarClientes] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const [modalRecargo, setModalRecargo] = useState(false);
  const [recargoActivo, setRecargoActivo] = useState(false);
  const [recargoTipo, setRecargoTipo] = useState('porcentaje');
  const [recargoValor, setRecargoValor] = useState('');
  const [guardandoRecargo, setGuardandoRecargo] = useState(false);

  const [modalTurno, setModalTurno] = useState(false);
  const [turnoInicio, setTurnoInicio] = useState('18:00');
  const [turnoFin, setTurnoFin] = useState('08:00');
  const [guardandoTurno, setGuardandoTurno] = useState(false);

  const [historial, setHistorial] = useState(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [filtroHistorial, setFiltroHistorial] = useState({ desde: hoyISO(), hasta: hoyISO(), barra_id: '' });

  useEffect(() => {
    barrasApi.listar().then((lista) => {
      setBarras(lista);
      if (lista.length) setBarraActiva((prev) => prev || lista[0].id);
    });
  }, []);

  useEffect(() => {
    if (negocioConfig?.recargo_tarjeta) {
      setRecargoActivo(!!negocioConfig.recargo_tarjeta.activo);
      setRecargoTipo(negocioConfig.recargo_tarjeta.tipo || 'porcentaje');
      setRecargoValor(negocioConfig.recargo_tarjeta.valor || '');
    }
    if (negocioConfig?.turno_inicio) setTurnoInicio(negocioConfig.turno_inicio);
    if (negocioConfig?.turno_fin) setTurnoFin(negocioConfig.turno_fin);
  }, [negocioConfig]);

  const cargarCaja = useCallback(async () => {
    if (!barraActiva) return;
    const actual = await cajaApi.actual(barraActiva);
    setCaja(actual);
    setResumen(actual ? await cajaApi.resumen(barraActiva) : null);
  }, [barraActiva]);

  useEffect(() => { cargarCaja(); }, [cargarCaja]);

  const cargarHistorial = useCallback(async () => {
    setHistorial(null);
    const params = {
      desde: rangoDeTurno(filtroHistorial.desde, negocioConfig).desde,
      hasta: rangoDeTurno(filtroHistorial.hasta, negocioConfig).hasta,
    };
    if (filtroHistorial.barra_id) params.barra_id = filtroHistorial.barra_id;
    setHistorial(await cajaApi.historial(params));
  }, [filtroHistorial, negocioConfig]);

  useEffect(() => { if (historialAbierto) cargarHistorial(); }, [historialAbierto, cargarHistorial]);

  async function abrir(e) {
    e.preventDefault();
    try {
      await cajaApi.abrir(barraActiva, Number(montoInicial) || 0);
      toast.success('Caja abierta');
      setModalAbrir(false);
      setMontoInicial('');
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function registrarMovimiento(e) {
    e.preventDefault();
    try {
      await cajaApi.movimiento(barraActiva, { tipo: modalMovimiento, monto: Number(movMonto), descripcion: movDescripcion });
      toast.success('Movimiento registrado');
      setModalMovimiento(null);
      setMovMonto('');
      setMovDescripcion('');
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function cerrar(e) {
    e.preventDefault();
    try {
      await cajaApi.cerrar(barraActiva, Number(montoFinal) || 0);
      toast.success('Caja cerrada');
      setModalCerrar(false);
      setMontoFinal('');
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function guardarRecargo(e) {
    e.preventDefault();
    setGuardandoRecargo(true);
    try {
      await negociosApi.actualizarMiConfiguracion({
        recargo_tarjeta: { activo: recargoActivo, tipo: recargoTipo, valor: Number(recargoValor) || 0 },
      });
      toast.success('Configuración guardada');
      setModalRecargo(false);
      recargarNegocioConfig?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardandoRecargo(false);
    }
  }

  async function guardarTurno(e) {
    e.preventDefault();
    setGuardandoTurno(true);
    try {
      await negociosApi.actualizarMiConfiguracion({ turno_inicio: turnoInicio, turno_fin: turnoFin });
      toast.success('Horario de operación guardado');
      setModalTurno(false);
      recargarNegocioConfig?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardandoTurno(false);
    }
  }

  async function confirmarLimpieza() {
    setLimpiando(true);
    try {
      const resultado = await negociosApi.limpiarPedidos(reiniciarClientes);
      toast.success(
        `Listo: ${resultado.pedidosBorrados} pedidos, ${resultado.cajasBorradas} cajas y ${resultado.movimientosBorrados} movimientos eliminados.`,
        { duration: 6000 }
      );
      setModalConfirmarLimpieza(false);
      setReiniciarClientes(false);
      cargarCaja();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLimpiando(false);
    }
  }

  if (barras === null || caja === undefined) return <SkeletonKpis cantidad={3} />;

  const nombreBarraActiva = barras.find((b) => b.id === barraActiva)?.nombre;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Caja</h1>
          <p className="text-sm text-mist-500">Cada barra maneja su propio efectivo y su propio cierre</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModalTurno(true)} className="btn-secondary">
            <Clock size={16} /> Horario de operación
          </button>
          <button onClick={() => setModalRecargo(true)} className="btn-secondary">
            <Settings size={16} /> Recargo por tarjeta
          </button>
        </div>
      </div>

      {barras.length === 0 ? (
        <div className="card p-6 text-center text-sm text-mist-500">
          Todavía no has creado ninguna barra. Ve a <strong>Mesas</strong> o crea una barra primero para poder abrir su caja.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {barras.map((b) => (
              <button
                key={b.id}
                onClick={() => setBarraActiva(b.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  barraActiva === b.id ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
                }`}
              >
                {b.nombre}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-mist-500">
              {caja ? `Caja de ${nombreBarraActiva} — abierta` : `${nombreBarraActiva} no tiene caja abierta`}
            </p>
            {!caja ? (
              <button onClick={() => setModalAbrir(true)} className="btn-primary"><Unlock size={16} /> Abrir caja</button>
            ) : (
              <button onClick={() => setModalCerrar(true)} className="btn-danger"><Lock size={16} /> Cerrar caja</button>
            )}
          </div>

          {caja && resumen && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase text-mist-400">Ingresos totales</p>
                  <p className="font-display text-xl font-bold text-petrol-600">{formatoCOP.format(resumen.totales.ingresos)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase text-mist-400">Solo efectivo</p>
                  <p className="font-display text-xl font-bold text-ink-900">{formatoCOP.format(resumen.totales.ingresosEfectivo)}</p>
                  <p className="mt-0.5 text-xs text-mist-500">Lo que debería haber en el cajón</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase text-mist-400">Egresos</p>
                  <p className="font-display text-xl font-bold text-red-500">{formatoCOP.format(resumen.totales.egresos)}</p>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase text-mist-400">Propinas</p>
                  <p className="font-display text-xl font-bold text-gold-600">{formatoCOP.format(resumen.totales.propinas)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setModalMovimiento('ingreso')} className="btn-secondary"><Plus size={16} /> Registrar ingreso</button>
                <button onClick={() => setModalMovimiento('egreso')} className="btn-secondary"><Minus size={16} /> Registrar egreso</button>
              </div>

              <div className="card hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-mist-100 last:border-0">
                        <td className="px-4 py-3 capitalize text-ink-800">{m.tipo}</td>
                        <td className="px-4 py-3 capitalize text-mist-500">{m.metodo_pago || '—'}</td>
                        <td className="px-4 py-3 text-mist-500">{m.descripcion || '—'}</td>
                        <td className="px-4 py-3 font-semibold">{formatoCOP.format(m.monto)}</td>
                        <td className="px-4 py-3 text-mist-500">{new Date(m.created_at).toLocaleTimeString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {resumen.movimientos.map((m) => (
                  <div key={m.id} className="card flex items-center justify-between p-3.5">
                    <div>
                      <p className="text-sm font-medium capitalize text-ink-900">{m.tipo} {m.metodo_pago && `· ${m.metodo_pago}`}</p>
                      <p className="text-xs text-mist-500">{m.descripcion || '—'} · {new Date(m.created_at).toLocaleTimeString('es-CO')}</p>
                    </div>
                    <span className="shrink-0 font-semibold text-ink-900">{formatoCOP.format(m.monto)}</span>
                  </div>
                ))}
                {resumen.movimientos.length === 0 && <p className="py-6 text-center text-sm text-mist-500">Sin movimientos todavía.</p>}
              </div>
            </>
          )}
        </>
      )}

      {/* Historial de sesiones de caja — por barra, con efectivo vs. total */}
      <div className="card p-5">
        <button onClick={() => setHistorialAbierto((v) => !v)} className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
            <HistoryIcon size={17} /> Historial de sesiones de caja
          </span>
          {historialAbierto ? <ChevronUp size={18} className="text-mist-400" /> : <ChevronDown size={18} className="text-mist-400" />}
        </button>

        {historialAbierto && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label" htmlFor="hist-desde">Desde</label>
                <input id="hist-desde" type="date" className="input !py-2" value={filtroHistorial.desde} onChange={(e) => setFiltroHistorial({ ...filtroHistorial, desde: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="hist-hasta">Hasta</label>
                <input id="hist-hasta" type="date" className="input !py-2" value={filtroHistorial.hasta} onChange={(e) => setFiltroHistorial({ ...filtroHistorial, hasta: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="hist-barra">Barra</label>
                <select id="hist-barra" className="select !py-2" value={filtroHistorial.barra_id} onChange={(e) => setFiltroHistorial({ ...filtroHistorial, barra_id: e.target.value })}>
                  <option value="">Todas</option>
                  {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
            </div>

            {!historial ? (
              <p className="py-6 text-center text-sm text-mist-500">Cargando…</p>
            ) : historial.length === 0 ? (
              <p className="py-6 text-center text-sm text-mist-500">No hay sesiones de caja en este rango.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Barra</th>
                      <th className="px-3 py-2">Ingresos totales</th>
                      <th className="px-3 py-2">Solo efectivo</th>
                      <th className="px-3 py-2">Apertura</th>
                      <th className="px-3 py-2">Cierre contado</th>
                      <th className="px-3 py-2">Diferencia</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((s) => (
                      <tr key={s.id} className="border-b border-mist-100 last:border-0">
                        <td className="px-3 py-2 text-mist-600">{new Date(s.abierta_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-3 py-2 font-medium text-ink-900">{s.barra?.nombre || 'General'}</td>
                        <td className="px-3 py-2">{formatoCOP.format(s.ingresosTotales)}</td>
                        <td className="px-3 py-2 font-semibold text-ink-900">{formatoCOP.format(s.ingresosEfectivo)}</td>
                        <td className="px-3 py-2 text-mist-500">{formatoCOP.format(s.monto_inicial)}</td>
                        <td className="px-3 py-2 text-mist-500">{s.monto_final_real !== null ? formatoCOP.format(s.monto_final_real) : '—'}</td>
                        <td className={`px-3 py-2 font-medium ${s.diferencia > 0 ? 'text-petrol-600' : s.diferencia < 0 ? 'text-red-500' : 'text-mist-500'}`}>
                          {s.diferencia !== null ? formatoCOP.format(s.diferencia) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge ${s.cerrada_at ? 'bg-mist-100 text-mist-500' : 'bg-petrol-100 text-petrol-700'}`}>
                            {s.cerrada_at ? 'Cerrada' : 'Abierta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <div className="mb-1 flex items-center gap-2">
          <TriangleAlert size={18} className="text-red-500" />
          <h2 className="font-display text-sm font-bold text-red-700">Zona de peligro</h2>
        </div>
        <p className="mb-4 text-xs text-red-600">
          Para cuando terminaste de probar la plataforma y quieres empezar a operar en limpio. Esto borra todos los pedidos, cajas y movimientos de dinero registrados hasta ahora — <strong>no</strong> toca tus productos, inventario, categorías, barras ni personal.
        </p>
        <button onClick={() => setModalLimpiar(true)} className="btn-danger">
          <TriangleAlert size={16} /> Limpiar pedidos y caja de prueba
        </button>
      </div>

      {modalTurno && (
        <Modal title="Horario de operación" onClose={() => setModalTurno(false)}>
          <p className="mb-4 text-sm text-mist-600">
            El "día" de tu negocio no tiene que cortarse a medianoche. Si abres a las 6pm y cierras a las 8am del día siguiente, todo lo que vendas en esa ventana cuenta como el mismo turno — así los filtros de fecha (Historial, Caja) no te parten un sábado en la noche por la mitad.
          </p>
          <form onSubmit={guardarTurno} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="turno-inicio">Apertura de turno</label>
                <input id="turno-inicio" required type="time" className="input" value={turnoInicio} onChange={(e) => setTurnoInicio(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="turno-fin">Cierre de turno</label>
                <input id="turno-fin" required type="time" className="input" value={turnoFin} onChange={(e) => setTurnoFin(e.target.value)} />
              </div>
            </div>
            <p className="help-text">
              Ej: apertura {turnoInicio || '18:00'}, cierre {turnoFin || '08:00'} → las ventas del "sábado" van desde las {turnoInicio || '18:00'} del sábado hasta las {turnoFin || '08:00'} del domingo.
            </p>
            <button type="submit" disabled={guardandoTurno} className="btn-primary w-full">
              {guardandoTurno ? 'Guardando…' : 'Guardar horario'}
            </button>
          </form>
        </Modal>
      )}

      {modalRecargo && (
        <Modal title="Recargo por pago con tarjeta" onClose={() => setModalRecargo(false)}>
          <form onSubmit={guardarRecargo} className="space-y-4">
            <label className="flex items-start gap-2.5 rounded-xl bg-mist-50 p-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-mist-300" checked={recargoActivo} onChange={(e) => setRecargoActivo(e.target.checked)} />
              <span className="text-xs text-ink-800">
                <span className="font-semibold text-ink-900">Cobrar recargo cuando el cliente paga con tarjeta</span>
                <br />
                Se suma automáticamente al total cuando el mesero registra un pago por tarjeta al cerrar cuenta.
              </span>
            </label>

            {recargoActivo && (
              <>
                <div>
                  <label className="label">Tipo de recargo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRecargoTipo('porcentaje')} className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold ${recargoTipo === 'porcentaje' ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'}`}>
                      Porcentaje (%)
                    </button>
                    <button type="button" onClick={() => setRecargoTipo('fijo')} className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold ${recargoTipo === 'fijo' ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'}`}>
                      Monto fijo ($)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="recargo-valor">{recargoTipo === 'porcentaje' ? 'Porcentaje sobre el monto pagado con tarjeta' : 'Monto fijo por cada pago con tarjeta'}</label>
                  <input
                    id="recargo-valor"
                    required
                    type="number"
                    min="0"
                    step={recargoTipo === 'porcentaje' ? '0.1' : '1'}
                    className="input"
                    value={recargoValor}
                    onChange={(e) => setRecargoValor(e.target.value)}
                  />
                  <p className="help-text">
                    {recargoTipo === 'porcentaje'
                      ? `Ej: 4% sobre $50.000 = $2.000 de recargo.`
                      : `Ej: $5.000 fijos cada vez que se use tarjeta, sin importar el monto.`}
                  </p>
                </div>
              </>
            )}

            <button type="submit" disabled={guardandoRecargo} className="btn-primary w-full">
              {guardandoRecargo ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </form>
        </Modal>
      )}

      {modalAbrir && (
        <Modal title={`Abrir caja de ${nombreBarraActiva}`} onClose={() => setModalAbrir(false)}>
          <form onSubmit={abrir} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Monto inicial en efectivo</label>
              <input required type="number" min="0" className="input" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">Abrir caja</button>
          </form>
        </Modal>
      )}

      {modalMovimiento && (
        <Modal title={modalMovimiento === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'} onClose={() => setModalMovimiento(null)}>
          <form onSubmit={registrarMovimiento} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Monto</label>
              <input required type="number" min="0" className="input" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Descripción</label>
              <input required className="input" value={movDescripcion} onChange={(e) => setMovDescripcion(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">Guardar</button>
          </form>
        </Modal>
      )}

      {modalCerrar && (
        <Modal title={`Cerrar caja de ${nombreBarraActiva}`} onClose={() => setModalCerrar(false)}>
          <form onSubmit={cerrar} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Monto final contado en efectivo</label>
              <input required type="number" min="0" className="input" value={montoFinal} onChange={(e) => setMontoFinal(e.target.value)} />
            </div>
            <button type="submit" className="btn-danger w-full">Cerrar caja</button>
          </form>
        </Modal>
      )}

      {modalLimpiar && (
        <Modal title="Limpiar pedidos y caja de prueba" onClose={() => setModalLimpiar(false)}>
          <p className="mb-4 text-sm text-mist-600">
            Esto borra <strong>todos</strong> los pedidos, cajas y movimientos de dinero de tu negocio, y libera cualquier mesa que haya quedado ocupada. No se puede deshacer.
          </p>
          <label className="mb-5 flex items-start gap-2.5 rounded-xl bg-mist-50 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-mist-300"
              checked={reiniciarClientes}
              onChange={(e) => setReiniciarClientes(e.target.checked)}
            />
            <span className="text-xs text-ink-800">
              <span className="font-semibold text-ink-900">También reiniciar mis clientes</span>
              <br />
              Pone en cero las visitas, puntos y consumo acumulado — actívalo solo si esos clientes también fueron de prueba.
            </span>
          </label>
          <button
            onClick={() => { setModalLimpiar(false); setModalConfirmarLimpieza(true); }}
            className="btn-danger w-full"
          >
            Continuar
          </button>
        </Modal>
      )}

      {modalConfirmarLimpieza && (
        <EscribirParaConfirmar
          titulo="Última confirmación"
          mensaje="Estás a punto de borrar todos los pedidos y la caja de tu negocio. Tus productos, inventario y personal quedan intactos."
          etiquetaCampo="Escribe LIMPIAR PEDIDOS para confirmar"
          valorEsperado="LIMPIAR PEDIDOS"
          textoConfirmar={limpiando ? 'Limpiando…' : 'Limpiar ahora'}
          onConfirmar={confirmarLimpieza}
          onCancelar={() => setModalConfirmarLimpieza(false)}
        />
      )}
    </div>
  );
}

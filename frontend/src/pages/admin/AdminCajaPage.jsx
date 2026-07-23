import { useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cajaApi, barrasApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function AdminCajaPage() {
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

  useEffect(() => {
    barrasApi.listar().then((lista) => {
      setBarras(lista);
      if (lista.length) setBarraActiva((prev) => prev || lista[0].id);
    });
  }, []);

  const cargarCaja = useCallback(async () => {
    if (!barraActiva) return;
    const actual = await cajaApi.actual(barraActiva);
    setCaja(actual);
    setResumen(actual ? await cajaApi.resumen(barraActiva) : null);
  }, [barraActiva]);

  useEffect(() => { cargarCaja(); }, [cargarCaja]);

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

  if (barras === null || caja === undefined) return <LoadingScreen />;

  const nombreBarraActiva = barras.find((b) => b.id === barraActiva)?.nombre;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Caja</h1>
        <p className="text-sm text-mist-500">Cada barra maneja su propio efectivo y su propio cierre</p>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase text-mist-400">Ingresos</p>
                  <p className="font-display text-xl font-bold text-petrol-600">{formatoCOP.format(resumen.totales.ingresos)}</p>
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

              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-mist-100 last:border-0">
                        <td className="px-4 py-3 capitalize text-ink-800">{m.tipo}</td>
                        <td className="px-4 py-3 text-mist-500">{m.descripcion || '—'}</td>
                        <td className="px-4 py-3 font-semibold">{formatoCOP.format(m.monto)}</td>
                        <td className="px-4 py-3 text-mist-500">{new Date(m.created_at).toLocaleTimeString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
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
    </div>
  );
}

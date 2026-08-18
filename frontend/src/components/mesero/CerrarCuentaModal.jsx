import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi } from '../../services/endpoints.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Modal from '../common/Modal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const METODOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
];

function lineaVacia(metodo, monto = '') {
  return { metodo, monto };
}

// barras: lista de barras del negocio (para mostrar el nombre de la que
// va a recibir el pago). barraSugerida: la barra de la que salieron los
// productos de este pedido — el mesero ya NO puede elegir otra, el dinero
// siempre va a la caja que despachó el pedido.
export default function CerrarCuentaModal({ pedido, barras = [], barraSugerida, onClose, onSuccess }) {
  const { negocioConfig } = useAuth();
  const [propina, setPropina] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [nota, setNota] = useState('');
  const [pagos, setPagos] = useState([lineaVacia('efectivo')]);
  const [enviando, setEnviando] = useState(false);

  const barraId = barraSugerida || barras[0]?.id || '';
  const nombreBarra = barras.find((b) => b.id === barraId)?.nombre;

  const recargoConfig = negocioConfig?.recargo_tarjeta || { activo: false };
  const totalCuenta = pedido.subtotal - Number(descuento || 0) + Number(propina || 0);

  function calcularRecargo(monto) {
    if (!recargoConfig.activo || !monto) return 0;
    if (recargoConfig.tipo === 'porcentaje') return Math.round((Number(monto) * Number(recargoConfig.valor)) / 100);
    return Number(recargoConfig.valor) || 0;
  }

  const { sumaPagos, totalRecargos, restante } = useMemo(() => {
    const suma = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const recargos = pagos.reduce((s, p) => s + (p.metodo === 'tarjeta' ? calcularRecargo(p.monto) : 0), 0);
    return { sumaPagos: suma, totalRecargos: recargos, restante: totalCuenta - suma };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagos, totalCuenta]);

  const totalFinal = totalCuenta + totalRecargos;
  const cuadra = Math.abs(restante) < 1;

  function agregarLinea() {
    // Si falta plata por asignar, la nueva línea arranca con lo que
    // queda — así el mesero casi nunca tiene que calcular a mano.
    const metodoUsado = pagos.map((p) => p.metodo);
    const siguiente = METODOS.find((m) => !metodoUsado.includes(m.valor))?.valor || 'efectivo';
    setPagos([...pagos, lineaVacia(siguiente, restante > 0 ? restante : '')]);
  }

  function actualizarLinea(index, cambios) {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, ...cambios } : p)));
  }

  function quitarLinea(index) {
    setPagos((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmar() {
    if (!cuadra) {
      toast.error(`Los pagos suman ${formatoCOP.format(sumaPagos)}, pero la cuenta es ${formatoCOP.format(totalCuenta)}.`);
      return;
    }
    const pagosValidos = pagos.filter((p) => Number(p.monto) > 0);
    if (pagosValidos.length === 0) {
      toast.error('Registra al menos un método de pago con un monto.');
      return;
    }

    setEnviando(true);
    try {
      await pedidosApi.cerrarCuenta(pedido.id, {
        pagos: pagosValidos.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })),
        propina: Number(propina) || 0,
        descuento: Number(descuento) || 0,
        barra_id: barraId || null,
        nota: nota || undefined,
      });
      toast.success('Cuenta cerrada. ¡Buen trabajo!');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Cerrar cuenta" onClose={onClose}>
      <div className="mb-4 space-y-1 rounded-2xl bg-mist-50 p-4 text-sm">
        <div className="flex justify-between"><span className="text-mist-500">Subtotal</span><span>{formatoCOP.format(pedido.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-mist-500">Descuento</span><span>-{formatoCOP.format(descuento || 0)}</span></div>
        <div className="flex justify-between"><span className="text-mist-500">Propina</span><span>+{formatoCOP.format(propina || 0)}</span></div>
        {totalRecargos > 0 && (
          <div className="flex justify-between text-gold-600"><span>Recargo por tarjeta</span><span>+{formatoCOP.format(totalRecargos)}</span></div>
        )}
        <div className="mt-2 flex justify-between border-t border-mist-200 pt-2 font-display text-base font-bold text-ink-900">
          <span>Total a cobrar</span><span>{formatoCOP.format(totalFinal)}</span>
        </div>
      </div>

      {nombreBarra && (
        <p className="mb-4 text-xs text-mist-500">
          El pago se entrega en la caja de <span className="font-semibold text-ink-800">{nombreBarra}</span> (la barra que despachó este pedido).
        </p>
      )}

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label !mb-0">Métodos de pago</span>
          {pagos.length < METODOS.length && (
            <button type="button" onClick={agregarLinea} className="flex items-center gap-1 text-xs font-semibold text-petrol-600">
              <Plus size={13} /> Dividir pago
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {pagos.map((pago, idx) => {
            const recargoLinea = pago.metodo === 'tarjeta' ? calcularRecargo(pago.monto) : 0;
            return (
              <div key={idx} className="rounded-xl border border-mist-200 p-2.5">
                <div className="flex items-center gap-2">
                  <select
                    className="select flex-1 !py-2"
                    value={pago.metodo}
                    onChange={(e) => actualizarLinea(idx, { metodo: e.target.value })}
                  >
                    {METODOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    className="input flex-1 !py-2"
                    placeholder="Monto"
                    value={pago.monto}
                    onChange={(e) => actualizarLinea(idx, { monto: e.target.value })}
                  />
                  {pagos.length > 1 && (
                    <button type="button" onClick={() => quitarLinea(idx)} className="btn-icon-danger shrink-0" aria-label="Quitar método">
                      <X size={16} />
                    </button>
                  )}
                </div>
                {recargoLinea > 0 && (
                  <p className="mt-1.5 text-xs text-gold-600">
                    + {formatoCOP.format(recargoLinea)} de recargo → el cliente paga {formatoCOP.format(Number(pago.monto) + recargoLinea)} en total por tarjeta
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className={`mt-2 text-xs font-medium ${cuadra ? 'text-petrol-600' : 'text-red-500'}`}>
          {cuadra
            ? '✓ Los pagos cuadran con el total de la cuenta.'
            : restante > 0
              ? `Faltan ${formatoCOP.format(restante)} por asignar.`
              : `Sobran ${formatoCOP.format(Math.abs(restante))} — revisa los montos.`}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="cerrar-cuenta-descuento">Descuento</label>
          <input id="cerrar-cuenta-descuento" type="number" min="0" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cerrar-cuenta-propina">Propina</label>
          <input id="cerrar-cuenta-propina" type="number" min="0" value={propina} onChange={(e) => setPropina(e.target.value)} className="input" />
        </div>
      </div>

      <div className="mb-4">
        <label className="label" htmlFor="cerrar-cuenta-nota">Nota (opcional)</label>
        <input id="cerrar-cuenta-nota" className="input" placeholder="Ej. cliente frecuente, agua cortesía…" value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>

      {pagos.some((p) => p.metodo === 'transferencia') && (
        <p className="mb-4 rounded-xl bg-gold-50 px-3 py-2.5 text-xs text-gold-600">
          Recuerda llevarle al cajero el pantallazo del comprobante de Nequi junto con esta cuenta.
        </p>
      )}

      <button onClick={confirmar} disabled={enviando || !cuadra} className="btn-lg btn-gold w-full">
        {enviando ? 'Procesando…' : `Confirmar pago · ${formatoCOP.format(totalFinal)}`}
      </button>
    </Modal>
  );
}

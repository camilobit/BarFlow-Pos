import { useState } from 'react';
import toast from 'react-hot-toast';
import { pedidosApi } from '../../services/endpoints.js';
import Modal from '../common/Modal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const METODOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'mixto', etiqueta: 'Mixto' },
];

// barras: lista de barras del negocio (para mostrar el nombre de la que
// va a recibir el pago). barraSugerida: la barra de la que salieron los
// productos de este pedido — el mesero ya NO puede elegir otra, el dinero
// siempre va a la caja que despachó el pedido.
export default function CerrarCuentaModal({ pedido, barras = [], barraSugerida, onClose, onSuccess }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [propina, setPropina] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const barraId = barraSugerida || barras[0]?.id || '';
  const nombreBarra = barras.find((b) => b.id === barraId)?.nombre;

  const total = pedido.subtotal - descuento + Number(propina || 0);

  async function confirmar() {
    setEnviando(true);
    try {
      await pedidosApi.cerrarCuenta(pedido.id, {
        metodo_pago: metodo,
        propina: Number(propina) || 0,
        descuento: Number(descuento) || 0,
        barra_id: barraId || null,
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
        <div className="mt-2 flex justify-between border-t border-mist-200 pt-2 font-display text-base font-bold text-ink-900">
          <span>Total</span><span>{formatoCOP.format(total)}</span>
        </div>
      </div>

      {nombreBarra && (
        <p className="mb-4 text-xs text-mist-500">
          El pago se entrega en la caja de <span className="font-semibold text-ink-800">{nombreBarra}</span> (la barra que despachó este pedido).
        </p>
      )}

      <fieldset className="mb-4">
        <legend className="label">Método de pago</legend>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              aria-pressed={metodo === m.valor}
              onClick={() => setMetodo(m.valor)}
              className={`min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                metodo === m.valor ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>
      </fieldset>

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

      {(metodo === 'transferencia' || metodo === 'mixto') && (
        <p className="mb-4 rounded-xl bg-gold-50 px-3 py-2.5 text-xs text-gold-600">
          Recuerda llevarle al cajero el pantallazo del comprobante de Nequi junto con esta cuenta.
        </p>
      )}

      <button onClick={confirmar} disabled={enviando} className="btn-lg btn-gold w-full">
        {enviando ? 'Procesando…' : `Confirmar pago · ${formatoCOP.format(total)}`}
      </button>
    </Modal>
  );
}

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi } from '../../services/endpoints.js';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const METODOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'mixto', etiqueta: 'Mixto' },
];

// barras: lista de barras del negocio (para elegir a cuál caja se entrega
// el dinero). barraSugerida: la barra de la que más productos salieron en
// este pedido, para preseleccionarla y ahorrarle el clic al mesero.
export default function CerrarCuentaModal({ pedido, barras = [], barraSugerida, onClose, onSuccess }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [propina, setPropina] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [barraId, setBarraId] = useState(barraSugerida || barras[0]?.id || '');
  const [enviando, setEnviando] = useState(false);

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
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-950/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Cerrar cuenta</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-mist-100"><X size={20} /></button>
        </div>

        <div className="mb-4 space-y-1 rounded-2xl bg-mist-50 p-4 text-sm">
          <div className="flex justify-between"><span className="text-mist-500">Subtotal</span><span>{formatoCOP.format(pedido.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-mist-500">Descuento</span><span>-{formatoCOP.format(descuento || 0)}</span></div>
          <div className="flex justify-between"><span className="text-mist-500">Propina</span><span>+{formatoCOP.format(propina || 0)}</span></div>
          <div className="mt-2 flex justify-between border-t border-mist-200 pt-2 font-display text-base font-bold text-ink-900">
            <span>Total</span><span>{formatoCOP.format(total)}</span>
          </div>
        </div>

        {barras.length > 1 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">¿A qué caja entregas el dinero?</label>
            <select className="input" value={barraId} onChange={(e) => setBarraId(e.target.value)}>
              {barras.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <label className="mb-1.5 block text-xs font-semibold text-mist-500">Método de pago</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {METODOS.map((m) => (
            <button
              key={m.valor}
              onClick={() => setMetodo(m.valor)}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                metodo === m.valor ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Descuento</label>
            <input type="number" min="0" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Propina</label>
            <input type="number" min="0" value={propina} onChange={(e) => setPropina(e.target.value)} className="input" />
          </div>
        </div>

        {(metodo === 'transferencia' || metodo === 'mixto') && (
          <p className="mb-4 rounded-xl bg-gold-50 px-3 py-2.5 text-xs text-gold-600">
            Recuerda llevarle al cajero el pantallazo del comprobante de Nequi junto con esta cuenta.
          </p>
        )}

        <button onClick={confirmar} disabled={enviando} className="btn-gold w-full">
          {enviando ? 'Procesando…' : `Confirmar pago · ${formatoCOP.format(total)}`}
        </button>
      </div>
    </div>
  );
}

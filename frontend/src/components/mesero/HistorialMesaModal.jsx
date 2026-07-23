import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { pedidosApi } from '../../services/endpoints.js';
import LoadingScreen from '../common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function HistorialMesaModal({ mesaId, onClose }) {
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    pedidosApi.historialPorMesa(mesaId).then(setHistorial);
  }, [mesaId]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-950/50 sm:items-center">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Historial de la mesa</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-mist-100"><X size={20} /></button>
        </div>

        {!historial ? (
          <LoadingScreen label="Cargando historial…" />
        ) : historial.length === 0 ? (
          <p className="py-8 text-center text-sm text-mist-500">Sin pedidos previos en esta mesa.</p>
        ) : (
          <div className="space-y-3">
            {historial.map((p) => (
              <div key={p.id} className="card p-3.5">
                <div className="mb-1 flex items-center justify-between text-xs text-mist-500">
                  <span>{new Date(p.created_at).toLocaleString('es-CO')}</span>
                  <span className="badge bg-mist-100 text-ink-800 capitalize">{p.estado}</span>
                </div>
                <p className="mb-1 text-sm font-semibold text-ink-900">{p.mesero?.nombre}</p>
                <ul className="mb-2 space-y-0.5 text-sm text-mist-600">
                  {p.items?.map((it) => (
                    <li key={it.id}>{it.cantidad}× {it.producto?.nombre}</li>
                  ))}
                </ul>
                <p className="text-right font-semibold text-ink-900">{formatoCOP.format(p.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

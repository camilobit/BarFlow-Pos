import { useEffect, useState } from 'react';
import { ClipboardX } from 'lucide-react';
import { pedidosApi } from '../../services/endpoints.js';
import Modal from '../common/Modal.jsx';
import { SkeletonLista } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function HistorialMesaModal({ mesaId, onClose }) {
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    pedidosApi.historialPorMesa(mesaId).then(setHistorial);
  }, [mesaId]);

  return (
    <Modal title="Historial de la mesa" onClose={onClose}>
      {!historial ? (
        <SkeletonLista filas={3} />
      ) : historial.length === 0 ? (
        <EmptyState icono={ClipboardX} titulo="Sin pedidos previos en esta mesa" />
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
    </Modal>
  );
}

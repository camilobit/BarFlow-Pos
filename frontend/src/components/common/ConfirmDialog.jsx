import { TriangleAlert } from 'lucide-react';
import Modal from './Modal.jsx';

// Reemplaza el confirm() nativo del navegador (feo, no personalizable,
// distinto en cada dispositivo) por un diálogo consistente con el resto
// de la app. Se usa junto con el hook useConfirm.
export default function ConfirmDialog({
  titulo = '¿Estás seguro?',
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
  onConfirmar,
  onCancelar,
}) {
  return (
    <Modal title={titulo} onClose={onCancelar} maxWidth="max-w-sm">
      <div className="mb-5 flex gap-3">
        {peligroso && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
            <TriangleAlert size={18} />
          </div>
        )}
        <p className="text-sm text-mist-600">{mensaje}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancelar} className="btn-secondary flex-1">{textoCancelar}</button>
        <button onClick={onConfirmar} className={`flex-1 ${peligroso ? 'btn-danger' : 'btn-primary'}`}>
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import Modal from './Modal.jsx';

// Para la acción más peligrosa de toda la app: en vez de un simple
// "¿Estás seguro?", pide escribir el nombre exacto antes de habilitar el
// botón. Reemplaza el prompt() nativo del navegador con algo que se ve
// bien, explica las consecuencias, y no se puede confirmar por error.
export default function EscribirParaConfirmar({
  titulo = 'Esta acción es irreversible',
  mensaje,
  etiquetaCampo = 'Escribe el nombre exacto para confirmar',
  valorEsperado,
  textoConfirmar = 'Eliminar para siempre',
  onConfirmar,
  onCancelar,
}) {
  const [texto, setTexto] = useState('');
  const coincide = texto.trim() === valorEsperado;

  return (
    <Modal title={titulo} onClose={onCancelar} maxWidth="max-w-sm">
      <div className="mb-4 flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
          <TriangleAlert size={18} />
        </div>
        <p className="text-sm text-mist-600">{mensaje}</p>
      </div>

      <label className="label" htmlFor="escribir-confirmar-input">
        {etiquetaCampo}: <span className="font-bold text-ink-900">{valorEsperado}</span>
      </label>
      <input
        id="escribir-confirmar-input"
        className="input mb-4"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoFocus
        autoComplete="off"
      />

      <div className="flex gap-2">
        <button onClick={onCancelar} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={() => onConfirmar()} disabled={!coincide} className="btn-danger flex-1">
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}

import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

// Modal accesible: cierra con ESC, cierra al tocar el fondo, bloquea el
// scroll del body mientras está abierto, y anuncia su título a lectores
// de pantalla (role="dialog" + aria-labelledby).
export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  const tituloId = useId();
  const contenedorRef = useRef(null);

  useEffect(() => {
    function alPresionarTecla(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', alPresionarTecla);

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Enfoca el modal al abrir, para que el lector de pantalla anuncie el
    // título y el teclado (Tab) quede dentro del diálogo desde el inicio.
    contenedorRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.body.style.overflow = overflowOriginal;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-t-3xl bg-white p-5 outline-none sm:rounded-3xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={tituloId} className="font-display text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

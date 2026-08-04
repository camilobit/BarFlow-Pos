import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

// Modal accesible: cierra con ESC, cierra al tocar el fondo, bloquea el
// scroll del body mientras está abierto, y anuncia su título a lectores
// de pantalla (role="dialog" + aria-labelledby).
//
// IMPORTANTE: el foco solo se pone UNA VEZ, al abrir el modal (efecto con
// [] como dependencias). Antes dependía de `onClose`, que en la mayoría
// de las pantallas se pasa como una función nueva en cada render
// (`onClose={() => setModalX(false)}`) — como cada letra que el usuario
// escribe en un input del modal vuelve a dibujar la pantalla, el efecto
// se disparaba en cada tecla y le quitaba el foco al campo de texto para
// dárselo al contenedor del modal. En celular, un input que pierde el
// foco cierra el teclado de inmediato — de ahí el "escribo una letra y
// se cierra el teclado" en todos los formularios de la app.
export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  const tituloId = useId();
  const contenedorRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // siempre la versión más reciente, sin re-disparar efectos

  // Se ejecuta UNA sola vez al montar el modal: foco inicial + bloqueo de scroll.
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    contenedorRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowOriginal;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listener de ESC aparte: usa la ref, así nunca necesita re-poner el
  // foco ni depender de que `onClose` cambie de identidad entre renders.
  useEffect(() => {
    function alPresionarTecla(e) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, []);

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
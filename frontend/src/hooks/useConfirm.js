import { useState, useCallback } from 'react';

// Uso:
//   const { confirmar, ConfirmModal } = useConfirm();
//   async function eliminar() {
//     const ok = await confirmar({ mensaje: '¿Eliminar este producto?', peligroso: true });
//     if (!ok) return;
//     ...
//   }
//   return <>{ConfirmModal}...</>
//
// Es un reemplazo directo de `if (!confirm('...')) return;` pero con la
// misma identidad visual del resto de la app.
export function useConfirm() {
  const [opciones, setOpciones] = useState(null);
  const [resolver, setResolver] = useState(null);

  const confirmar = useCallback((opts) => {
    setOpciones(opts);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function responder(valor) {
    resolver?.(valor);
    setOpciones(null);
    setResolver(null);
  }

  return {
    confirmar,
    estaAbierto: !!opciones,
    opciones,
    onConfirmar: () => responder(true),
    onCancelar: () => responder(false),
  };
}

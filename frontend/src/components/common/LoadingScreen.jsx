// Se usa tanto para el arranque completo de la app (login/autenticación)
// como incrustado dentro de una página ya con su propio layout (sidebar,
// navbar, o incluso fondo oscuro como la pantalla de Barra). No trae
// fondo propio a propósito — hereda el del contenedor, para no verse
// como un parche claro sobre una pantalla oscura.
export default function LoadingScreen({ label = 'Cargando…' }) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-mist-200 border-t-petrol-600" />
      <p className="text-sm text-mist-500">{label}</p>
    </div>
  );
}

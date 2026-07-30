// Estado vacío consistente para listas/tablas sin datos — reemplaza los
// distintos "No hay X todavía" escritos a mano en cada pantalla.
// icono: componente de lucide-react. accion: { etiqueta, onClick } opcional.
export default function EmptyState({ icono: Icono, titulo, descripcion, accion, oscuro = false }) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-12 text-center ${oscuro ? 'text-mist-500' : 'text-mist-500'}`}>
      {Icono && <Icono size={36} className="mb-3 opacity-40" />}
      <p className={`text-sm font-medium ${oscuro ? 'text-mist-300' : 'text-ink-800'}`}>{titulo}</p>
      {descripcion && <p className="mt-1 max-w-xs text-xs text-mist-500">{descripcion}</p>}
      {accion && (
        <button onClick={accion.onClick} className="btn-primary mt-4">
          {accion.etiqueta}
        </button>
      )}
    </div>
  );
}

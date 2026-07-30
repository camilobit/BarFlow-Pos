// Placeholders de carga con efecto shimmer — se usan mientras llega la
// respuesta del servidor, en vez de dejar la pantalla en blanco o mostrar
// solo un spinner genérico. Mejora la percepción de velocidad.

export function SkeletonLinea({ ancho = 'w-full', alto = 'h-4' }) {
  return <div className={`skeleton ${ancho} ${alto}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-4">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
}

export function SkeletonLista({ filas = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: filas }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTabla({ filas = 5, columnas = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="space-y-0">
        {Array.from({ length: filas }).map((_, fila) => (
          <div key={fila} className="flex items-center gap-4 border-b border-mist-100 px-4 py-3.5 last:border-0">
            {Array.from({ length: columnas }).map((_, col) => (
              <div key={col} className={`skeleton h-3.5 ${col === 0 ? 'w-1/4' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonKpis({ cantidad = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cantidad }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-6 w-2/3" />
        </div>
      ))}
    </div>
  );
}

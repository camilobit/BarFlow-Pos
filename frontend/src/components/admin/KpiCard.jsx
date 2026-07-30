// destacado: variante "hero" con fondo de color sólido — se usa para la
// métrica más importante del momento (ej. ventas de hoy), para que
// resalte de un vistazo en el carrusel móvil o en la grilla de escritorio.
export default function KpiCard({ label, value, sub, icon: Icon, accent = 'petrol', destacado = false }) {
  const accentClasses = {
    petrol: 'bg-petrol-50 text-petrol-600',
    gold: 'bg-gold-200 text-gold-600',
    ink: 'bg-mist-100 text-ink-800',
  };

  if (destacado) {
    return (
      <div className="card h-full bg-gradient-to-br from-petrol-600 to-petrol-900 p-5 text-white shadow-lift border-0">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-petrol-100">{label}</span>
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Icon size={16} />
            </span>
          )}
        </div>
        <p className="font-display text-2xl font-bold sm:text-3xl">{value}</p>
        {sub && <p className="mt-1 text-xs text-petrol-100">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="card h-full p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-mist-400">{label}</span>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClasses[accent]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist-500">{sub}</p>}
    </div>
  );
}

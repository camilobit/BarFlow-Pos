export default function KpiCard({ label, value, sub, icon: Icon, accent = 'petrol' }) {
  const accentClasses = {
    petrol: 'bg-petrol-50 text-petrol-600',
    gold: 'bg-gold-200 text-gold-600',
    ink: 'bg-mist-100 text-ink-800',
  };

  return (
    <div className="card p-5">
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

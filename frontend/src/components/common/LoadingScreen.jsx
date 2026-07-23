export default function LoadingScreen({ label = 'Cargando…' }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-mist-50">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-mist-200 border-t-petrol-600" />
      <p className="text-sm text-mist-500">{label}</p>
    </div>
  );
}

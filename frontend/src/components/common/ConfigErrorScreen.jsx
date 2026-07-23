export default function ConfigErrorScreen({ mensaje }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-7 text-center shadow-lift">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-2xl">
          ⚠️
        </div>
        <h1 className="mb-2 font-display text-xl font-bold text-white">Falta configurar el frontend</h1>
        <p className="mb-4 text-sm text-mist-400">{mensaje}</p>

        <div className="rounded-2xl bg-ink-950 p-4 text-left text-xs text-mist-300">
          <p className="mb-2 font-semibold text-white">Para solucionarlo:</p>
          <ol className="list-decimal space-y-1.5 pl-4">
            <li>
              Copia <code className="rounded bg-ink-800 px-1 py-0.5">frontend/.env.example</code> a{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">frontend/.env</code>
            </li>
            <li>
              Completa <code className="rounded bg-ink-800 px-1 py-0.5">VITE_SUPABASE_URL</code>,{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> y{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">VITE_API_URL</code> con los valores reales de tu
              proyecto de Supabase y de tu backend.
            </li>
            <li>
              <strong className="text-white">Reinicia</strong> el servidor de desarrollo (
              <code className="rounded bg-ink-800 px-1 py-0.5">npm run dev</code>) — Vite solo lee el archivo{' '}
              <code className="rounded bg-ink-800 px-1 py-0.5">.env</code> al arrancar.
            </li>
            <li>Si ya desplegaste, define estas variables en el panel de tu proveedor (Vercel/Netlify) y vuelve a desplegar.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-ink-800 bg-ink-900 p-7 text-center shadow-lift">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-2xl">💥</div>
            <h1 className="mb-2 font-display text-xl font-bold text-white">Algo falló al cargar BarFlow POS</h1>
            <p className="mb-4 text-sm text-mist-400">
              Abre la consola del navegador (F12 → pestaña Console) para ver el detalle técnico del error.
            </p>
            <pre className="max-h-40 overflow-auto rounded-2xl bg-ink-950 p-4 text-left text-xs text-red-300">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

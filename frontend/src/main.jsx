import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import ConfigErrorScreen from './components/common/ConfigErrorScreen.jsx';
import { supabaseConfigError } from './services/supabaseClient.js';
import './styles/index.css';

function Root() {
  // Si faltan o son inválidas las variables de entorno de Supabase, nunca
  // dejamos la pantalla en blanco: mostramos exactamente qué falta y cómo
  // arreglarlo.
  if (supabaseConfigError) {
    return <ConfigErrorScreen mensaje={supabaseConfigError} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          gutter={8}
          containerStyle={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '0.875rem',
              background: '#12151A',
              color: '#FAFAF9',
              fontSize: '0.875rem',
              padding: '0.75rem 1rem',
              maxWidth: '92vw',
              boxShadow: '0 16px 40px -12px rgba(18, 21, 26, 0.35)',
            },
            success: { iconTheme: { primary: '#2E6E6E', secondary: '#FAFAF9' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#FAFAF9' }, duration: 4500 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);

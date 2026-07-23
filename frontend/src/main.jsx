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
          toastOptions={{
            style: {
              borderRadius: '0.875rem',
              background: '#12151A',
              color: '#FAFAF9',
              fontSize: '0.875rem',
            },
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

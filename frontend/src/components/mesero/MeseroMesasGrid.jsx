import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Plus, KeyRound, Grid3x3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { mesasApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import { SkeletonCard } from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import CambiarPasswordModal from '../common/CambiarPasswordModal.jsx';

const ESTILO_ESTADO = {
  libre: 'bg-white border-mist-200 text-ink-900',
  ocupada: 'bg-petrol-600 border-petrol-600 text-white',
  reservada: 'bg-gold-200 border-gold-400 text-ink-900',
  limpieza: 'bg-mist-200 border-mist-300 text-mist-500',
};

const ETIQUETA_ESTADO = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  limpieza: 'En limpieza',
};

export default function MeseroMesasGrid() {
  const { perfil, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalPassword, setModalPassword] = useState(false);

  const cargar = useCallback(async () => {
    const data = await mesasApi.listar();
    setMesas(data);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeTable({ table: 'mesas', onChange: cargar });

  const zonas = [...new Set(mesas.map((m) => m.zona))];

  async function liberarMesa(mesa) {
    await mesasApi.actualizar(mesa.id, { estado: 'libre' });
  }

  return (
    <div className="min-h-screen bg-mist-50 pb-10">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mist-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div>
          <h1 className="font-display text-lg font-bold text-ink-900">Mesas</h1>
          <p className="text-xs text-mist-500">Hola, {perfil?.nombre}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setModalPassword(true)} className="btn-icon" aria-label="Cambiar contraseña">
            <KeyRound size={20} />
          </button>
          <button onClick={cerrarSesion} className="btn-icon" aria-label="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {modalPassword && <CambiarPasswordModal onClose={() => setModalPassword(false)} />}

      <main className="px-4 py-5">
        {cargando ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : mesas.length === 0 ? (
          <EmptyState
            icono={Grid3x3}
            titulo="Todavía no hay mesas creadas"
            descripcion="Pide al administrador que las cree desde el panel de Mesas."
          />
        ) : (
          zonas.map((zona) => (
            <section key={zona} className="mb-6">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-mist-400">{zona}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {mesas
                  .filter((m) => m.zona === zona)
                  .map((mesa) => (
                    <button
                      key={mesa.id}
                      onClick={() =>
                        mesa.estado === 'limpieza' ? liberarMesa(mesa) : navigate(`/mesero/mesa/${mesa.id}`)
                      }
                      aria-label={`${mesa.nombre}, ${mesa.estado === 'limpieza' ? 'en limpieza, tocar para liberar' : ETIQUETA_ESTADO[mesa.estado]}`}
                      className={`flex min-h-[92px] flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left shadow-soft transition active:scale-[0.97] ${ESTILO_ESTADO[mesa.estado]}`}
                    >
                      <span className="font-display text-base font-bold">{mesa.nombre}</span>
                      <span className="flex items-center gap-1 text-xs opacity-80">
                        <Users size={12} /> {mesa.capacidad}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-90">
                        {mesa.estado === 'limpieza' ? 'Toca para liberar' : ETIQUETA_ESTADO[mesa.estado]}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))
        )}
      </main>

      <button
        onClick={() => navigate('/mesero/mesa/nueva')}
        className="fixed right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-ink-950 shadow-lift active:scale-95"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        aria-label="Pedido para llevar"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

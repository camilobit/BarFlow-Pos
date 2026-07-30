import { useEffect, useState, useCallback } from 'react';
import { Plus, Grid3x3, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { mesasApi, negociosApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import { SkeletonKpis, SkeletonCard } from '../../components/common/Skeleton.jsx';

const ESTILO_ESTADO = {
  libre: 'bg-mist-100 text-ink-800',
  ocupada: 'bg-petrol-100 text-petrol-700',
  reservada: 'bg-gold-200 text-gold-600',
  limpieza: 'bg-mist-200 text-mist-500',
};

export default function AdminMesasPage() {
  const { negocioConfig, recargarNegocioConfig } = useAuth();
  const [mesas, setMesas] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cambiandoModo, setCambiandoModo] = useState(false);
  const [form, setForm] = useState({ nombre: '', capacidad: 4, zona: 'Salón' });

  const cargar = useCallback(async () => setMesas(await mesasApi.listar()), []);
  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeTable({ table: 'mesas', onChange: cargar });

  async function crearMesa(e) {
    e.preventDefault();
    try {
      await mesasApi.crear({ ...form, capacidad: Number(form.capacidad) });
      toast.success('Mesa creada');
      setModalAbierto(false);
      setForm({ nombre: '', capacidad: 4, zona: 'Salón' });
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function cambiarEstado(mesa, estado) {
    await mesasApi.actualizar(mesa.id, { estado });
    cargar();
  }

  async function cambiarModoMesas(modo) {
    if (negocioConfig?.modo_mesas === modo) return;
    setCambiandoModo(true);
    try {
      await negociosApi.actualizarMiConfiguracion({ modo_mesas: modo });
      await recargarNegocioConfig();
      toast.success(
        modo === 'fijo'
          ? 'Ahora los meseros ven el plano de mesas.'
          : 'Ahora los meseros ven "Crear pedido" en vez del plano de mesas.'
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCambiandoModo(false);
    }
  }

  if (!mesas || !negocioConfig) return <div className="space-y-6"><SkeletonKpis cantidad={2} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div></div>;

  const modoFijo = negocioConfig.modo_mesas === 'fijo';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Mesas</h1>
          <p className="text-sm text-mist-500">Distribución y estado del salón</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nueva mesa</button>
      </div>

      {/* Selector de cómo trabajan los meseros: plano fijo vs. pedidos libres */}
      <div className="card p-5">
        <p className="mb-1 text-sm font-semibold text-ink-900">¿Cómo trabajan tus meseros?</p>
        <p className="mb-4 text-xs text-mist-500">
          Puedes cambiarlo cuando quieras — no se pierde ningún pedido ni información al cambiar.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => cambiarModoMesas('fijo')}
            disabled={cambiandoModo}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
              modoFijo ? 'border-petrol-600 bg-petrol-50' : 'border-mist-200 hover:border-mist-300'
            }`}
          >
            <Grid3x3 size={20} className={modoFijo ? 'text-petrol-600' : 'text-mist-400'} />
            <div>
              <p className="text-sm font-semibold text-ink-900">Plano de mesas fijo</p>
              <p className="text-xs text-mist-500">El mesero elige la mesa desde un mapa (ideal si las mesas no se mueven).</p>
            </div>
          </button>
          <button
            onClick={() => cambiarModoMesas('libre')}
            disabled={cambiandoModo}
            className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
              !modoFijo ? 'border-petrol-600 bg-petrol-50' : 'border-mist-200 hover:border-mist-300'
            }`}
          >
            <ListChecks size={20} className={!modoFijo ? 'text-petrol-600' : 'text-mist-400'} />
            <div>
              <p className="text-sm font-semibold text-ink-900">Pedidos libres</p>
              <p className="text-xs text-mist-500">El mesero toca "Crear pedido" y escribe una referencia libre (ideal si las mesas se mueven mucho).</p>
            </div>
          </button>
        </div>
      </div>

      {modoFijo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {mesas.map((mesa) => (
            <div key={mesa.id} className="card p-4">
              <p className="font-display text-base font-bold text-ink-900">{mesa.nombre}</p>
              <p className="mb-2 text-xs text-mist-500">{mesa.zona} · {mesa.capacidad} pers.</p>
              <select
                value={mesa.estado}
                onChange={(e) => cambiarEstado(mesa, e.target.value)}
                className={`w-full rounded-lg border-0 px-2 py-1.5 text-xs font-semibold ${ESTILO_ESTADO[mesa.estado]}`}
              >
                <option value="libre">Libre</option>
                <option value="ocupada">Ocupada</option>
                <option value="reservada">Reservada</option>
                <option value="limpieza">En limpieza</option>
              </select>
            </div>
          ))}
          {mesas.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-mist-500">
              Aún no has creado ninguna mesa — usa "Nueva mesa" arriba.
            </p>
          )}
        </div>
      )}

      {!modoFijo && (
        <div className="card p-6 text-center text-sm text-mist-500">
          Estás en modo "Pedidos libres" — tus meseros no ven el plano de mesas, ven un botón de "Crear pedido".
          Puedes seguir creando mesas aquí para tenerlas listas si más adelante cambias a "Plano fijo".
        </div>
      )}

      {modalAbierto && (
        <Modal title="Nueva mesa" onClose={() => setModalAbierto(false)}>
          <form onSubmit={crearMesa} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Capacidad</label>
              <input type="number" min="1" className="input" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Zona</label>
              <input className="input" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Crear mesa</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { mesasApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const ESTILO_ESTADO = {
  libre: 'bg-mist-100 text-ink-800',
  ocupada: 'bg-petrol-100 text-petrol-700',
  reservada: 'bg-gold-200 text-gold-600',
  limpieza: 'bg-mist-200 text-mist-500',
};

export default function AdminMesasPage() {
  const [mesas, setMesas] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
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

  if (!mesas) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Mesas</h1>
          <p className="text-sm text-mist-500">Distribución y estado del salón</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nueva mesa</button>
      </div>

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
      </div>

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

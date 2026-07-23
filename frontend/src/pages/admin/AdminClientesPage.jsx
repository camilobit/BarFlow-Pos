import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Gift, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientesApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const NIVEL_COLOR = {
  Bronce: 'bg-mist-100 text-mist-500',
  Plata: 'bg-mist-200 text-ink-800',
  Oro: 'bg-gold-200 text-gold-600',
  Platino: 'bg-petrol-100 text-petrol-700',
};

const FORM_VACIO = { nombre: '', apellido: '', celular: '', correo: '', fecha_cumpleanos: '' };

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [cumpleanos, setCumpleanos] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = useCallback(async (q) => {
    const [c, cumples] = await Promise.all([clientesApi.listar(q), clientesApi.cumpleanos()]);
    setClientes(c);
    setCumpleanos(cumples);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function buscar(e) {
    e.preventDefault();
    cargar(busqueda);
  }

  async function crearCliente(e) {
    e.preventDefault();
    try {
      await clientesApi.crear(form);
      toast.success('Cliente creado');
      setModalAbierto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!clientes) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Clientes</h1>
          <p className="text-sm text-mist-500">Base de clientes y fidelización</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nuevo cliente</button>
      </div>

      {cumpleanos.length > 0 && (
        <div className="card flex items-center gap-3 border-gold-400 bg-gold-50 p-4">
          <Gift size={20} className="text-gold-600" />
          <p className="text-sm text-ink-800">
            <strong>{cumpleanos.length}</strong> cliente(s) cumplen años en los próximos 30 días: {cumpleanos.slice(0, 3).map((c) => c.nombre).join(', ')}
            {cumpleanos.length > 3 ? '…' : ''}
          </p>
        </div>
      )}

      <form onSubmit={buscar} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
          <input className="input pl-9" placeholder="Buscar por nombre, celular o correo…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">Buscar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Visitas</th>
              <th className="px-4 py-3">Consumo total</th>
              <th className="px-4 py-3">Nivel</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{c.nombre} {c.apellido}</td>
                <td className="px-4 py-3 text-mist-500">{c.celular || c.correo || '—'}</td>
                <td className="px-4 py-3">{c.visitas}</td>
                <td className="px-4 py-3 font-semibold">{formatoCOP.format(c.consumo_total)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${NIVEL_COLOR[c.nivel_fidelizacion]}`}>
                    <Trophy size={11} /> {c.nivel_fidelizacion} · {c.puntos} pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal title="Nuevo cliente" onClose={() => setModalAbierto(false)}>
          <form onSubmit={crearCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
                <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Apellido</label>
                <input className="input" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Celular</label>
              <input className="input" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Correo</label>
              <input type="email" className="input" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Fecha de cumpleaños</label>
              <input type="date" className="input" value={form.fecha_cumpleanos} onChange={(e) => setForm({ ...form, fecha_cumpleanos: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Crear cliente</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { negociosApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import KpiCard from '../../components/admin/KpiCard.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const FORM_VACIO = { nombre: '', slug: '', ciudad: '', pais: 'CO' };

export default function AdminNegociosPage() {
  const [negocios, setNegocios] = useState(null);
  const [stats, setStats] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = useCallback(async () => {
    const [n, s] = await Promise.all([negociosApi.listar(), negociosApi.estadisticas()]);
    setNegocios(n);
    setStats(s);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e) {
    e.preventDefault();
    try {
      await negociosApi.crear(form);
      toast.success('Negocio creado');
      setModalAbierto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function toggleEstado(negocio) {
    if (negocio.estado === 'suspendido') await negociosApi.activar(negocio.id);
    else await negociosApi.suspender(negocio.id);
    cargar();
  }

  if (!negocios || !stats) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Negocios</h1>
          <p className="text-sm text-mist-500">Administración global de BarFlow POS</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nuevo negocio</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Negocios activos" value={stats.negociosActivos} sub={`${stats.totalNegocios} en total`} icon={Building2} accent="petrol" />
        <KpiCard label="Suspendidos" value={stats.negociosSuspendidos} accent="gold" />
        <KpiCard label="Ingresos globales" value={formatoCOP.format(stats.ingresosTotales)} accent="ink" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {negocios.map((n) => (
              <tr key={n.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{n.nombre}</td>
                <td className="px-4 py-3 text-mist-500">{n.ciudad}, {n.pais}</td>
                <td className="px-4 py-3 capitalize text-mist-500">{n.plan}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${n.estado === 'activo' ? 'bg-petrol-100 text-petrol-700' : n.estado === 'suspendido' ? 'bg-red-100 text-red-600' : 'bg-gold-200 text-gold-600'}`}>
                    {n.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleEstado(n)} className="text-xs font-semibold text-petrol-600 hover:underline">
                    {n.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal title="Nuevo negocio" onClose={() => setModalAbierto(false)}>
          <form onSubmit={crear} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Slug (URL única)</label>
              <input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Ciudad</label>
              <input className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Crear negocio</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

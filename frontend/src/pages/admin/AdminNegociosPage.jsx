import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, CircleDollarSign, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { negociosApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import KpiCard from '../../components/admin/KpiCard.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const FORM_VACIO = { nombre: '', slug: '', ciudad: '', pais: 'CO', admin_nombre: '', admin_apellido: '', admin_email: '', admin_password: '' };

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
      const resultado = await negociosApi.crear(form);
      if (resultado.adminError) {
        toast.error(`Negocio creado, pero el administrador falló: ${resultado.adminError}. Créalo desde Equipo.`);
      } else {
        toast.success(form.admin_email ? 'Negocio y administrador creados' : 'Negocio creado');
      }
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

  async function togglePago(negocio) {
    await negociosApi.marcarPago(negocio.id, !negocio.pagado);
    cargar();
  }

  async function eliminar(negocio) {
    const confirmacion = prompt(
      `Esto borra "${negocio.nombre}" y TODOS sus datos (pedidos, productos, usuarios, caja) para siempre. No se puede deshacer.\n\nEscribe el nombre exacto del negocio para confirmar:`
    );
    if (confirmacion !== negocio.nombre) {
      if (confirmacion !== null) toast.error('El nombre no coincide — no se eliminó nada.');
      return;
    }
    try {
      await negociosApi.eliminar(negocio.id);
      toast.success('Negocio eliminado');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!negocios || !stats) return <LoadingScreen />;

  const pendientesDePago = negocios.filter((n) => !n.pagado).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Negocios</h1>
          <p className="text-sm text-mist-500">Tus clientes en BarFlow POS</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nuevo negocio</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Negocios activos" value={stats.negociosActivos} sub={`${stats.totalNegocios} en total`} icon={Building2} accent="petrol" />
        <KpiCard label="Pendientes de pago" value={pendientesDePago} accent="gold" />
        <KpiCard label="Facturación total" value={formatoCOP.format(stats.ingresosTotales)} sub="Suma de ventas de todos tus negocios" icon={CircleDollarSign} accent="ink" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Facturación</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {negocios.map((n) => (
              <tr key={n.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{n.nombre}</td>
                <td className="px-4 py-3 text-mist-500">{n.ciudad}, {n.pais}</td>
                <td className="px-4 py-3 font-semibold text-ink-900">
                  {formatoCOP.format(stats.ingresosPorNegocio[n.id] || 0)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePago(n)}
                    className={`badge ${n.pagado ? 'bg-petrol-100 text-petrol-700' : 'bg-red-100 text-red-600'}`}
                  >
                    {n.pagado ? 'Pagó' : 'Pendiente'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${n.estado === 'activo' ? 'bg-petrol-100 text-petrol-700' : n.estado === 'suspendido' ? 'bg-red-100 text-red-600' : 'bg-gold-200 text-gold-600'}`}>
                    {n.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => toggleEstado(n)} className="text-xs font-semibold text-petrol-600 hover:underline">
                      {n.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                    </button>
                    <button onClick={() => eliminar(n)} className="text-mist-400 hover:text-red-500" title="Eliminar negocio">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {negocios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-mist-500">Todavía no tienes negocios creados.</td>
              </tr>
            )}
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

            <div className="border-t border-mist-200 pt-3">
              <p className="mb-1 text-xs font-semibold text-ink-900">Administrador del negocio (opcional)</p>
              <p className="mb-3 text-xs text-mist-500">Créalo de una vez, o déjalo vacío y créalo después desde Equipo.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
                  <input className="input" value={form.admin_nombre} onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-mist-500">Apellido</label>
                  <input className="input" value={form.admin_apellido} onChange={(e) => setForm({ ...form, admin_apellido: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Correo</label>
                <input type="email" className="input" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Contraseña temporal</label>
                <input type="password" minLength={6} className="input" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">Crear negocio</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

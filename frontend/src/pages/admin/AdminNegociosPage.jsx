import { useEffect, useState, useCallback } from 'react';
import { Plus, Building2, CircleDollarSign, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { negociosApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import EscribirParaConfirmar from '../../components/common/EscribirParaConfirmar.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import KpiCard from '../../components/admin/KpiCard.jsx';
import { SkeletonKpis, SkeletonTabla } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const FORM_VACIO = { nombre: '', slug: '', ciudad: '', pais: 'CO', admin_nombre: '', admin_apellido: '', admin_email: '', admin_password: '' };

export default function AdminNegociosPage() {
  const [negocios, setNegocios] = useState(null);
  const [stats, setStats] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [negocioAEliminar, setNegocioAEliminar] = useState(null);
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

  async function confirmarEliminar() {
    try {
      await negociosApi.eliminar(negocioAEliminar.id);
      toast.success('Negocio eliminado');
      setNegocioAEliminar(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!negocios || !stats) {
    return (
      <div className="space-y-6">
        <SkeletonKpis cantidad={3} />
        <SkeletonTabla filas={4} columnas={6} />
      </div>
    );
  }

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

      {negocios.length === 0 ? (
        <EmptyState
          icono={Building2}
          titulo="Todavía no tienes negocios creados"
          descripcion="Crea el primero para empezar a onboardear clientes en BarFlow POS."
          accion={{ etiqueta: 'Nuevo negocio', onClick: () => setModalAbierto(true) }}
        />
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="card hidden overflow-x-auto md:block">
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
                        <button onClick={() => setNegocioAEliminar(n)} className="btn-icon-danger" aria-label={`Eliminar ${n.nombre}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <div className="space-y-2.5 md:hidden">
            {negocios.map((n) => (
              <div key={n.id} className="card p-4">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{n.nombre}</p>
                    <p className="text-xs text-mist-500">{n.ciudad}, {n.pais}</p>
                  </div>
                  <span className={`shrink-0 badge ${n.estado === 'activo' ? 'bg-petrol-100 text-petrol-700' : n.estado === 'suspendido' ? 'bg-red-100 text-red-600' : 'bg-gold-200 text-gold-600'}`}>
                    {n.estado}
                  </span>
                </div>
                <p className="mb-3 font-display text-lg font-bold text-ink-900">{formatoCOP.format(stats.ingresosPorNegocio[n.id] || 0)}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePago(n)}
                    className={`badge ${n.pagado ? 'bg-petrol-100 text-petrol-700' : 'bg-red-100 text-red-600'}`}
                  >
                    {n.pagado ? 'Pagó' : 'Pendiente'}
                  </button>
                  <button onClick={() => toggleEstado(n)} className="ml-auto text-xs font-semibold text-petrol-600">
                    {n.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                  </button>
                  <button onClick={() => setNegocioAEliminar(n)} className="btn-icon-danger" aria-label={`Eliminar ${n.nombre}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalAbierto && (
        <Modal title="Nuevo negocio" onClose={() => setModalAbierto(false)}>
          <form onSubmit={crear} className="space-y-3">
            <div>
              <label className="label" htmlFor="negocio-nombre">Nombre</label>
              <input id="negocio-nombre" required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="negocio-slug">Slug (URL única)</label>
              <input id="negocio-slug" required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="negocio-ciudad">Ciudad</label>
              <input id="negocio-ciudad" className="input" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            </div>

            <div className="border-t border-mist-200 pt-3">
              <p className="mb-1 text-xs font-semibold text-ink-900">Administrador del negocio (opcional)</p>
              <p className="mb-3 text-xs text-mist-500">Créalo de una vez, o déjalo vacío y créalo después desde Equipo.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="admin-nombre">Nombre</label>
                  <input id="admin-nombre" className="input" value={form.admin_nombre} onChange={(e) => setForm({ ...form, admin_nombre: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="admin-apellido">Apellido</label>
                  <input id="admin-apellido" className="input" value={form.admin_apellido} onChange={(e) => setForm({ ...form, admin_apellido: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="admin-correo">Correo</label>
                <input id="admin-correo" type="email" className="input" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="label" htmlFor="admin-clave">Contraseña temporal</label>
                <input id="admin-clave" type="password" minLength={6} className="input" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">Crear negocio</button>
          </form>
        </Modal>
      )}

      {negocioAEliminar && (
        <EscribirParaConfirmar
          titulo="Eliminar negocio"
          mensaje={`Esto borra "${negocioAEliminar.nombre}" y TODOS sus datos (pedidos, productos, usuarios, caja) para siempre. No se puede deshacer.`}
          valorEsperado={negocioAEliminar.nombre}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setNegocioAEliminar(null)}
        />
      )}
    </div>
  );
}

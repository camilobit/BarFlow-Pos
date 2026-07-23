import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi, barrasApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const FORM_VACIO = { nombre: '', precio: '', costo: '', categoria_id: '', barra_id: '' };

export default function AdminProductosPage() {
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [barras, setBarras] = useState([]);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [nombreCategoria, setNombreCategoria] = useState('');

  const cargar = useCallback(async () => {
    const [p, c, b] = await Promise.all([productosApi.listar(), productosApi.categorias(), barrasApi.listar()]);
    setProductos(p);
    setCategorias(c);
    setBarras(b);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearProducto(e) {
    e.preventDefault();
    try {
      await productosApi.crear({
        ...form,
        precio: Number(form.precio),
        costo: Number(form.costo) || 0,
        categoria_id: form.categoria_id || null,
        barra_id: form.barra_id || null,
      });
      toast.success('Producto creado');
      setModalProducto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function crearCategoria(e) {
    e.preventDefault();
    try {
      await productosApi.crearCategoria({ nombre: nombreCategoria });
      toast.success('Categoría creada');
      setModalCategoria(false);
      setNombreCategoria('');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function toggleActivo(producto) {
    if (producto.activo) {
      await productosApi.eliminar(producto.id);
    } else {
      await productosApi.actualizar(producto.id, { activo: true });
    }
    cargar();
  }

  if (!productos) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Productos</h1>
          <p className="text-sm text-mist-500">Catálogo, precios y asignación a barra</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalCategoria(true)} className="btn-secondary">+ Categoría</button>
          <button onClick={() => setModalProducto(true)} className="btn-primary"><Plus size={16} /> Nuevo producto</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Barra</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{p.nombre}</td>
                <td className="px-4 py-3 text-mist-500">{p.categoria?.nombre || '—'}</td>
                <td className="px-4 py-3 text-mist-500">{p.barra?.nombre || '—'}</td>
                <td className="px-4 py-3 font-semibold text-petrol-600">{formatoCOP.format(p.precio)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(p)} className={`badge ${p.activo ? 'bg-petrol-100 text-petrol-700' : 'bg-mist-100 text-mist-500'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalProducto && (
        <Modal title="Nuevo producto" onClose={() => setModalProducto(false)}>
          <form onSubmit={crearProducto} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Precio de venta</label>
                <input required type="number" min="0" className="input" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Costo</label>
                <input type="number" min="0" className="input" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Categoría</label>
              <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Barra asignada</label>
              <select className="input" value={form.barra_id} onChange={(e) => setForm({ ...form, barra_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">Crear producto</button>
          </form>
        </Modal>
      )}

      {modalCategoria && (
        <Modal title="Nueva categoría" onClose={() => setModalCategoria(false)}>
          <form onSubmit={crearCategoria} className="space-y-3">
            <input required className="input" placeholder="Nombre de la categoría" value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} />
            <button type="submit" className="btn-primary w-full">Crear categoría</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

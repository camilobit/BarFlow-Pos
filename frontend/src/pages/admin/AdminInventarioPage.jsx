import { useEffect, useState, useCallback } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const FORM_VACIO = { nombre: '', unidad: 'unidad', stock: '', stock_minimo: '', costo_unitario: '' };

export default function AdminInventarioPage() {
  const [insumos, setInsumos] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = useCallback(async () => setInsumos(await productosApi.insumos()), []);
  useEffect(() => { cargar(); }, [cargar]);

  async function crearInsumo(e) {
    e.preventDefault();
    try {
      await productosApi.crearInsumo({
        ...form,
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        costo_unitario: Number(form.costo_unitario) || 0,
      });
      toast.success('Insumo creado');
      setModalAbierto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function ajustar(insumo, cantidad) {
    try {
      await productosApi.ajustarStock(insumo.id, cantidad);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!insumos) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Inventario</h1>
          <p className="text-sm text-mist-500">Insumos base y niveles de stock</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nuevo insumo</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Insumo</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Mínimo</th>
              <th className="px-4 py-3">Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => (
              <tr key={i.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{i.nombre}</td>
                <td className="px-4 py-3">
                  <span className={Number(i.stock) <= Number(i.stock_minimo) ? 'flex items-center gap-1 font-semibold text-red-500' : 'text-ink-800'}>
                    {Number(i.stock) <= Number(i.stock_minimo) && <TriangleAlert size={14} />}
                    {i.stock} {i.unidad}
                  </span>
                </td>
                <td className="px-4 py-3 text-mist-500">{i.stock_minimo} {i.unidad}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => ajustar(i, -10)} className="btn-secondary !px-2.5 !py-1 text-xs">-10</button>
                    <button onClick={() => ajustar(i, 10)} className="btn-secondary !px-2.5 !py-1 text-xs">+10</button>
                    <button onClick={() => ajustar(i, 100)} className="btn-secondary !px-2.5 !py-1 text-xs">+100</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal title="Nuevo insumo" onClose={() => setModalAbierto(false)}>
          <form onSubmit={crearInsumo} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Unidad</label>
              <select className="input" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                <option value="unidad">unidad</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Stock inicial</label>
                <input type="number" className="input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Stock mínimo</label>
                <input type="number" className="input" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">Crear insumo</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

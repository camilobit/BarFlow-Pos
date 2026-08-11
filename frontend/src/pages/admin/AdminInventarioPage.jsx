import { useEffect, useState, useCallback, Fragment } from 'react';
import { Plus, TriangleAlert, PackagePlus, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi, barrasApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import { SkeletonLista } from '../../components/common/Skeleton.jsx';

const FORM_VACIO = { nombre: '', unidad: 'unidad', costo_unitario: '' };
const FORM_ASIGNAR = { barra_id: '', cantidad: '', stock_minimo: '' };

export default function AdminInventarioPage() {
  const [insumos, setInsumos] = useState(null);
  const [barras, setBarras] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(null); // insumo seleccionado
  const [form, setForm] = useState(FORM_VACIO);
  const [formAsignar, setFormAsignar] = useState(FORM_ASIGNAR);

  const cargar = useCallback(async () => {
    const [ins, brs] = await Promise.all([productosApi.insumos(), barrasApi.listar()]);
    setInsumos(ins);
    setBarras(brs);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearInsumo(e) {
    e.preventDefault();
    try {
      await productosApi.crearInsumo({ ...form, costo_unitario: Number(form.costo_unitario) || 0 });
      toast.success('Insumo creado. Ahora asígnale stock a cada barra.');
      setModalAbierto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function actualizarStock(e) {
    e.preventDefault();
    try {
      await productosApi.establecerStockBarra(modalAsignar.id, {
        barra_id: formAsignar.barra_id,
        cantidad: Number(formAsignar.cantidad),
        ...(formAsignar.stock_minimo !== '' && { stock_minimo: Number(formAsignar.stock_minimo) }),
      });
      toast.success('Cantidad actualizada');
      setModalAsignar(null);
      setFormAsignar(FORM_ASIGNAR);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Al elegir la barra, precarga la cantidad ACTUAL de esa barra para ese
  // insumo — así el admin edita el número directamente (lo que ve es lo
  // que hay), en vez de tener que calcular una diferencia a mano.
  function alElegirBarra(barraId) {
    const actual = (modalAsignar?.stock_por_barra || []).find((s) => s.barra_id === barraId);
    setFormAsignar({
      barra_id: barraId,
      cantidad: actual ? String(actual.stock) : '0',
      stock_minimo: actual ? String(actual.stock_minimo) : '',
    });
  }

  if (!insumos) return <SkeletonLista filas={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Inventario</h1>
          <p className="text-sm text-mist-500">Cada insumo se asigna con una cantidad específica a cada barra</p>
        </div>
        <button onClick={() => setModalAbierto(true)} className="btn-primary"><Plus size={16} /> Nuevo insumo</button>
      </div>

      {/* Escritorio: tabla expandible */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Insumo</th>
              <th className="px-4 py-3">Stock total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => {
              const stockTotal = (i.stock_por_barra || []).reduce((sum, s) => sum + Number(s.stock), 0);
              const hayAlerta = (i.stock_por_barra || []).some((s) => Number(s.stock) <= Number(s.stock_minimo));
              const abierto = expandido === i.id;
              return (
                <Fragment key={i.id}>
                  <tr className="border-b border-mist-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{i.nombre}</td>
                    <td className="px-4 py-3">
                      <span className={hayAlerta ? 'flex items-center gap-1 font-semibold text-red-500' : 'text-ink-800'}>
                        {hayAlerta && <TriangleAlert size={14} />}
                        {stockTotal} {i.unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setModalAsignar(i); setFormAsignar(FORM_ASIGNAR); }}
                          className="btn-secondary !px-2.5 !py-1 text-xs"
                        >
                          <PackagePlus size={13} /> Cantidad
                        </button>
                        <button onClick={() => setExpandido(abierto ? null : i.id)} className="rounded-lg p-1.5 text-mist-400 hover:bg-mist-100">
                          {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {abierto && (
                    <tr className="bg-mist-50">
                      <td colSpan={3} className="px-4 py-3">
                        {(i.stock_por_barra || []).length === 0 ? (
                          <p className="text-xs text-mist-500">Todavía no se ha asignado stock a ninguna barra.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {i.stock_por_barra.map((s) => (
                              <div key={s.id} className="rounded-xl bg-white px-3 py-2 shadow-soft">
                                <p className="text-xs font-semibold text-mist-500">{s.barra?.nombre}</p>
                                <p className={`text-sm font-bold ${Number(s.stock) <= Number(s.stock_minimo) ? 'text-red-500' : 'text-ink-900'}`}>
                                  {s.stock} {i.unidad}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {insumos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-mist-500">Todavía no has creado ningún insumo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Móvil: tarjetas — pensadas para tocar "Asignar" rápido desde el celular */}
      <div className="space-y-2.5 md:hidden">
        {insumos.map((i) => {
          const stockTotal = (i.stock_por_barra || []).reduce((sum, s) => sum + Number(s.stock), 0);
          const hayAlerta = (i.stock_por_barra || []).some((s) => Number(s.stock) <= Number(s.stock_minimo));
          const abierto = expandido === i.id;
          return (
            <div key={i.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-semibold text-ink-900">{i.nombre}</p>
                <span className={`shrink-0 text-sm font-bold ${hayAlerta ? 'flex items-center gap-1 text-red-500' : 'text-ink-800'}`}>
                  {hayAlerta && <TriangleAlert size={14} />}
                  {stockTotal} {i.unidad}
                </span>
              </div>

              {(i.stock_por_barra || []).length > 0 && (
                <button onClick={() => setExpandido(abierto ? null : i.id)} className="mb-2 flex items-center gap-1 text-xs font-semibold text-petrol-600">
                  {abierto ? 'Ocultar por barra' : 'Ver por barra'} {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
              {abierto && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {i.stock_por_barra.map((s) => (
                    <div key={s.id} className="rounded-xl bg-mist-50 px-3 py-2">
                      <p className="text-xs font-semibold text-mist-500">{s.barra?.nombre}</p>
                      <p className={`text-sm font-bold ${Number(s.stock) <= Number(s.stock_minimo) ? 'text-red-500' : 'text-ink-900'}`}>
                        {s.stock} {i.unidad}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setModalAsignar(i); setFormAsignar(FORM_ASIGNAR); }}
                className="btn-primary w-full !py-2 text-sm"
              >
                <PackagePlus size={15} /> Actualizar cantidad
              </button>
            </div>
          );
        })}
        {insumos.length === 0 && <p className="py-8 text-center text-sm text-mist-500">Todavía no has creado ningún insumo.</p>}
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
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Costo unitario</label>
              <input type="number" min="0" className="input" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} />
            </div>
            <p className="text-xs text-mist-500">Después de crearlo, toca "Cantidad" para poner cuántas unidades tiene cada barra.</p>
            <button type="submit" className="btn-primary w-full">Crear insumo</button>
          </form>
        </Modal>
      )}

      {modalAsignar && (
        <Modal title={`Cantidad de "${modalAsignar.nombre}"`} onClose={() => setModalAsignar(null)}>
          <form onSubmit={actualizarStock} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Barra</label>
              <select required className="input" value={formAsignar.barra_id} onChange={(e) => alElegirBarra(e.target.value)}>
                <option value="">Selecciona una barra</option>
                {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Cantidad en esta barra ahora mismo</label>
              <input
                required
                type="number"
                min="0"
                className="input"
                value={formAsignar.cantidad}
                onChange={(e) => setFormAsignar({ ...formAsignar, cantidad: e.target.value })}
                disabled={!formAsignar.barra_id}
              />
              <p className="mt-1 text-xs text-mist-500">
                Escribe el número real que hay — no se suma a lo anterior, esto reemplaza la cantidad guardada.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Stock mínimo de alerta (opcional)</label>
              <input type="number" min="0" className="input" value={formAsignar.stock_minimo} onChange={(e) => setFormAsignar({ ...formAsignar, stock_minimo: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={!formAsignar.barra_id}>Guardar cantidad</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

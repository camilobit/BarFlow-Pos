import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Upload, Download, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi, barrasApi } from '../../services/endpoints.js';
import { parseCSV, descargarCSV } from '../../utils/csv.js';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';
import { SkeletonTabla } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const FORM_VACIO = { nombre: '', precio: '', costo: '', categoria_id: '', barra_id: '', controla_inventario_unidad: false };

export default function AdminProductosPage() {
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [barras, setBarras] = useState([]);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [editando, setEditando] = useState(null); // producto en edición, o null si es nuevo
  const [form, setForm] = useState(FORM_VACIO);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const { confirmar, estaAbierto, opciones, onConfirmar, onCancelar } = useConfirm();
  const inputArchivoRef = useRef(null);

  const cargar = useCallback(async () => {
    const [p, c, b] = await Promise.all([productosApi.listar(), productosApi.categorias(), barrasApi.listar()]);
    setProductos(p);
    setCategorias(c);
    setBarras(b);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalProducto(true);
  }

  function abrirEditar(producto) {
    setEditando(producto);
    setForm({
      nombre: producto.nombre,
      precio: producto.precio,
      costo: producto.costo || '',
      categoria_id: producto.categoria_id || '',
      barra_id: producto.barra_id || '',
      controla_inventario_unidad: false,
    });
    setModalProducto(true);
  }

  function descargarPlantilla() {
    descargarCSV('plantilla_productos.csv', [
      { nombre: 'Mojito', precio: 22000, costo: 8000, categoria_nombre: 'Cócteles', barra_nombre: 'Barra Principal' },
      { nombre: 'Cerveza Águila', precio: 8000, costo: 3500, categoria_nombre: 'Cervezas', barra_nombre: 'Cantina' },
    ]);
  }

  function exportarProductos() {
    if (!productos.length) return toast.error('No hay productos para exportar todavía.');
    descargarCSV(
      'productos_barflow.csv',
      productos.map((p) => ({
        nombre: p.nombre,
        precio: p.precio,
        costo: p.costo,
        categoria_nombre: p.categoria?.nombre || '',
        barra_nombre: p.barra?.nombre || '',
        activo: p.activo ? 'si' : 'no',
      }))
    );
  }

  async function importarArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a subir el mismo archivo si hay error
    if (!archivo) return;

    try {
      const texto = await archivo.text();
      const filas = parseCSV(texto)
        .filter((f) => f.nombre)
        .map((f) => ({
          nombre: f.nombre,
          precio: Number(f.precio) || 0,
          costo: Number(f.costo) || 0,
          categoria_nombre: f.categoria_nombre || undefined,
          barra_nombre: f.barra_nombre || undefined,
        }));

      if (!filas.length) return toast.error('El archivo no tiene filas válidas (revisa la columna "nombre").');

      const creados = await productosApi.importarMasivo(filas);
      toast.success(`${creados.length} productos importados`);
      cargar();
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el archivo. Verifica que sea un CSV exportado desde Excel.');
    }
  }

  async function guardarProducto(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        precio: Number(form.precio),
        costo: Number(form.costo) || 0,
        categoria_id: form.categoria_id || null,
        barra_id: form.barra_id || null,
      };

      if (editando) {
        delete payload.controla_inventario_unidad; // solo aplica al crear
        await productosApi.actualizar(editando.id, payload);
        toast.success('Producto actualizado');
      } else {
        await productosApi.crear(payload);
        if (form.controla_inventario_unidad) {
          toast.success('Producto creado. Ahora ve a Inventario para asignarle cuántas unidades tiene cada barra.', { duration: 5000 });
        } else {
          toast.success('Producto creado');
        }
      }

      setModalProducto(false);
      setForm(FORM_VACIO);
      setEditando(null);
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
      setNombreCategoria('');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function eliminarCategoria(categoria) {
    const ok = await confirmar({
      titulo: 'Eliminar categoría',
      mensaje: `¿Eliminar "${categoria.nombre}"? Los productos que la tenían NO se eliminan, solo quedan sin categoría.`,
      textoConfirmar: 'Eliminar categoría',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await productosApi.eliminarCategoria(categoria.id);
      toast.success('Categoría eliminada');
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

  async function eliminarProducto(producto) {
    const ok = await confirmar({
      titulo: 'Eliminar producto',
      mensaje: `¿Eliminar "${producto.nombre}" para siempre? Solo se puede si nunca tuvo pedidos. Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar para siempre',
      peligroso: true,
    });
    if (!ok) return;
    try {
      await productosApi.eliminarPermanente(producto.id);
      toast.success('Producto eliminado');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!productos) return <SkeletonTabla filas={5} columnas={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Productos</h1>
          <p className="text-sm text-mist-500">Catálogo, precios y asignación a barra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={descargarPlantilla} className="btn-ghost text-xs">Plantilla CSV</button>
          <button onClick={exportarProductos} className="btn-secondary"><Download size={16} /> Exportar</button>
          <button onClick={() => inputArchivoRef.current?.click()} className="btn-secondary">
            <Upload size={16} /> Importar CSV
          </button>
          <input ref={inputArchivoRef} type="file" accept=".csv" className="hidden" onChange={importarArchivo} />
          <button onClick={() => setModalCategoria(true)} className="btn-secondary">Categorías</button>
          <button onClick={abrirNuevo} className="btn-primary"><Plus size={16} /> Nuevo producto</button>
        </div>
      </div>

      {/* Escritorio: tabla */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Barra</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
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
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActivo(p)} className={`badge ${p.activo ? 'bg-petrol-100 text-petrol-700' : 'bg-mist-100 text-mist-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => abrirEditar(p)} className="btn-icon" aria-label={`Editar ${p.nombre}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => eliminarProducto(p)} className="btn-icon-danger" aria-label={`Eliminar ${p.nombre}`}>
                      <Trash2 size={14} />
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
        {productos.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className="font-semibold text-ink-900">{p.nombre}</p>
              <button onClick={() => toggleActivo(p)} className={`shrink-0 badge ${p.activo ? 'bg-petrol-100 text-petrol-700' : 'bg-mist-100 text-mist-500'}`}>
                {p.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <p className="mb-1 font-display text-lg font-bold text-petrol-600">{formatoCOP.format(p.precio)}</p>
            <p className="mb-3 text-xs text-mist-500">
              {p.categoria?.nombre || 'Sin categoría'} · {p.barra?.nombre || 'Sin barra'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => abrirEditar(p)} className="btn-secondary flex-1 !py-1.5 text-xs"><Pencil size={13} /> Editar</button>
              <button onClick={() => eliminarProducto(p)} className="btn-icon-danger border border-mist-200" aria-label={`Eliminar ${p.nombre}`}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {productos.length === 0 && <p className="py-8 text-center text-sm text-mist-500">Todavía no has creado ningún producto.</p>}
      </div>

      {modalProducto && (
        <Modal title={editando ? `Editar "${editando.nombre}"` : 'Nuevo producto'} onClose={() => setModalProducto(false)}>
          <form onSubmit={guardarProducto} className="space-y-3">
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
            {!editando && (
              <label className="flex items-start gap-2.5 rounded-xl bg-mist-50 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-mist-300"
                  checked={form.controla_inventario_unidad}
                  onChange={(e) => setForm({ ...form, controla_inventario_unidad: e.target.checked })}
                />
                <span className="text-xs text-ink-800">
                  <span className="font-semibold text-ink-900">Controlar inventario por unidad</span> (botella, lata, etc.)
                  <br />
                  Actívalo si vendes el producto completo (ej. una cerveza, una botella de aguardiente) — después podrás asignar cuántas unidades tiene cada barra desde Inventario.
                </span>
              </label>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Categoría</label>
              <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Barra que lo despacha</label>
              <select className="input" value={form.barra_id} onChange={(e) => setForm({ ...form, barra_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
              <p className="mt-1 text-xs text-mist-500">A cuál barra le llega el pedido cuando alguien lo compra. No es lo mismo que la cantidad en inventario.</p>
            </div>
            <button type="submit" className="btn-primary w-full">{editando ? 'Guardar cambios' : 'Crear producto'}</button>
          </form>
        </Modal>
      )}

      {modalCategoria && (
        <Modal title="Categorías" onClose={() => setModalCategoria(false)}>
          <div className="mb-4 space-y-2">
            {categorias.length === 0 ? (
              <p className="text-sm text-mist-500">Todavía no has creado ninguna categoría.</p>
            ) : (
              categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-mist-50 px-3.5 py-2.5">
                  <span className="text-sm font-medium text-ink-900">{c.nombre}</span>
                  <button onClick={() => eliminarCategoria(c)} className="btn-icon-danger" aria-label={`Eliminar categoría ${c.nombre}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <form onSubmit={crearCategoria} className="flex gap-2 border-t border-mist-200 pt-4">
            <input required className="input" placeholder="Nueva categoría" value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} />
            <button type="submit" className="btn-primary shrink-0">Añadir</button>
          </form>
        </Modal>
      )}

      {estaAbierto && <ConfirmDialog {...opciones} onConfirmar={onConfirmar} onCancelar={onCancelar} />}
    </div>
  );
}

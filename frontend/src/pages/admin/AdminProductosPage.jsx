import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Upload, Download, Pencil, Trash2, Copy, FlaskConical, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { productosApi, barrasApi } from '../../services/endpoints.js';
import { parseCSV, descargarCSV } from '../../utils/csv.js';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useConfirm } from '../../hooks/useConfirm.js';
import { SkeletonTabla } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const FORM_VACIO = {
  nombre: '', precio: '', costo: '', categoria_id: '', barra_id: '',
  controla_inventario_unidad: false,
  tieneReceta: false,
  ingredientes: [], // [{ busqueda, insumo_id, cantidad }]
};

function filaIngredienteVacia() {
  return { busqueda: '', insumo_id: null, cantidad: '' };
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [barras, setBarras] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [modalResultadoRecetas, setModalResultadoRecetas] = useState(null);
  const [editando, setEditando] = useState(null); // producto en edición, o null si es nuevo
  const [form, setForm] = useState(FORM_VACIO);
  const [nombreCategoria, setNombreCategoria] = useState('');
  const { confirmar, estaAbierto, opciones, onConfirmar, onCancelar } = useConfirm();
  const inputArchivoRef = useRef(null);
  const inputRecetasRef = useRef(null);

  const cargar = useCallback(async () => {
    const [p, c, b, i] = await Promise.all([
      productosApi.listar(), productosApi.categorias(), barrasApi.listar(), productosApi.insumos(),
    ]);
    setProductos(p);
    setCategorias(c);
    setBarras(b);
    setInsumos(i.filter((ins) => ins.activo));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalProducto(true);
  }

  function abrirEditar(producto) {
    setEditando(producto);
    const ingredientesExistentes = (producto.ingredientes || []).map((ing) => ({
      busqueda: ing.insumo?.nombre || '',
      insumo_id: ing.insumo?.id || null,
      cantidad: String(ing.cantidad),
    }));
    setForm({
      nombre: producto.nombre,
      precio: producto.precio,
      costo: producto.costo || '',
      categoria_id: producto.categoria_id || '',
      barra_id: producto.barra_id || '',
      controla_inventario_unidad: false,
      tieneReceta: ingredientesExistentes.length > 0,
      ingredientes: ingredientesExistentes.length > 0 ? ingredientesExistentes : [],
    });
    setModalProducto(true);
  }

  // --- Constructor de receta -------------------------------------------
  function agregarIngrediente() {
    setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, filaIngredienteVacia()] }));
  }

  function actualizarBusquedaIngrediente(index, texto) {
    const coincidencia = insumos.find((ins) => ins.nombre.trim().toLowerCase() === texto.trim().toLowerCase());
    setForm((f) => {
      const copia = [...f.ingredientes];
      copia[index] = { ...copia[index], busqueda: texto, insumo_id: coincidencia ? coincidencia.id : null };
      return { ...f, ingredientes: copia };
    });
  }

  function actualizarCantidadIngrediente(index, valor) {
    setForm((f) => {
      const copia = [...f.ingredientes];
      copia[index] = { ...copia[index], cantidad: valor };
      return { ...f, ingredientes: copia };
    });
  }

  function quitarIngrediente(index) {
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== index) }));
  }

  function unidadDe(insumoId) {
    return insumos.find((i) => i.id === insumoId)?.unidad || '';
  }

  const costoEstimadoReceta = form.ingredientes.reduce((total, ing) => {
    const insumo = insumos.find((i) => i.id === ing.insumo_id);
    if (!insumo || !ing.cantidad) return total;
    return total + Number(insumo.costo_unitario) * Number(ing.cantidad);
  }, 0);

  const hayIngredientesSinResolver = form.tieneReceta && form.ingredientes.some((i) => i.busqueda && !i.insumo_id);

  function descargarPlantilla() {
    descargarCSV('plantilla_productos.csv', [
      { nombre: 'Mojito', precio: 22000, costo: 8000, categoria_nombre: 'Cócteles', barra_nombre: 'Barra Principal' },
      { nombre: 'Cerveza Águila', precio: 8000, costo: 3500, categoria_nombre: 'Cervezas', barra_nombre: 'Cantina' },
    ]);
  }

  function descargarPlantillaRecetas() {
    descargarCSV('plantilla_recetas.csv', [
      { producto: 'Mojito', insumo: 'Ron blanco', cantidad: 60 },
      { producto: 'Mojito', insumo: 'Azúcar', cantidad: 15 },
      { producto: 'Mojito', insumo: 'Hierbabuena', cantidad: 10 },
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
    e.target.value = '';
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

  // El producto y el insumo de cada línea deben existir DE ANTES — este
  // archivo solo conecta lo que ya está creado, no crea nada nuevo. Si
  // falta algo, se lo explicamos línea por línea al admin.
  async function importarRecetasArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    try {
      const texto = await archivo.text();
      const filas = parseCSV(texto)
        .filter((f) => f.producto && f.insumo)
        .map((f) => ({ producto: f.producto, insumo: f.insumo, cantidad: Number(f.cantidad) || 0 }));

      if (!filas.length) return toast.error('El archivo no tiene filas válidas (revisa las columnas "producto" e "insumo").');

      const resultado = await productosApi.importarRecetas(filas);
      setModalResultadoRecetas(resultado);
      if (resultado.noAplicadas.length === 0) {
        toast.success(`${resultado.aplicadas} líneas de receta aplicadas correctamente.`);
      }
      cargar();
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el archivo. Verifica que sea un CSV exportado desde Excel.');
    }
  }

  async function guardarProducto(e) {
    e.preventDefault();
    if (hayIngredientesSinResolver) {
      return toast.error('Hay un ingrediente que no coincide con ningún insumo creado. Revísalo antes de guardar.');
    }
    try {
      const ingredientesValidos = form.tieneReceta
        ? form.ingredientes.filter((i) => i.insumo_id && Number(i.cantidad) > 0).map((i) => ({ insumo_id: i.insumo_id, cantidad: Number(i.cantidad) }))
        : undefined;

      const payload = {
        nombre: form.nombre,
        precio: Number(form.precio),
        costo: Number(form.costo) || 0,
        categoria_id: form.categoria_id || null,
        barra_id: form.barra_id || null,
        controla_inventario_unidad: form.controla_inventario_unidad,
        ...(ingredientesValidos && ingredientesValidos.length > 0 && { ingredientes: ingredientesValidos }),
      };

      if (editando) {
        delete payload.controla_inventario_unidad; // solo aplica al crear
        // Si el admin quitó todos los ingredientes a propósito, hay que
        // mandar un arreglo vacío (no "undefined") para que se borre la receta.
        if (!ingredientesValidos || ingredientesValidos.length === 0) payload.ingredientes = [];
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

  async function duplicarProducto(producto) {
    try {
      await productosApi.duplicar(producto.id);
      toast.success(`"${producto.nombre}" duplicado. Ábrelo para renombrarlo y ajustarlo.`);
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
          <p className="text-sm text-mist-500">Catálogo, precios, recetas y asignación a barra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={descargarPlantilla} className="btn-ghost text-xs">Plantilla productos</button>
          <button onClick={descargarPlantillaRecetas} className="btn-ghost text-xs">Plantilla recetas</button>
          <button onClick={exportarProductos} className="btn-secondary"><Download size={16} /> Exportar</button>
          <button onClick={() => inputArchivoRef.current?.click()} className="btn-secondary">
            <Upload size={16} /> Importar productos
          </button>
          <button onClick={() => inputRecetasRef.current?.click()} className="btn-secondary">
            <FlaskConical size={16} /> Importar recetas
          </button>
          <input ref={inputArchivoRef} type="file" accept=".csv" className="hidden" onChange={importarArchivo} />
          <input ref={inputRecetasRef} type="file" accept=".csv" className="hidden" onChange={importarRecetasArchivo} />
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
                <td className="px-4 py-3 font-medium text-ink-900">
                  {p.nombre}
                  {p.ingredientes?.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase text-petrol-500" title="Tiene receta">
                      <FlaskConical size={11} />
                    </span>
                  )}
                </td>
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
                    <button onClick={() => duplicarProducto(p)} className="btn-icon" aria-label={`Duplicar ${p.nombre}`}>
                      <Copy size={14} />
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
              <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                {p.nombre}
                {p.ingredientes?.length > 0 && <FlaskConical size={13} className="text-petrol-500" />}
              </p>
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
              <button onClick={() => duplicarProducto(p)} className="btn-icon-danger border border-mist-200 !text-mist-400 hover:!text-ink-800" aria-label={`Duplicar ${p.nombre}`}>
                <Copy size={15} />
              </button>
              <button onClick={() => eliminarProducto(p)} className="btn-icon-danger border border-mist-200" aria-label={`Eliminar ${p.nombre}`}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {productos.length === 0 && <p className="py-8 text-center text-sm text-mist-500">Todavía no has creado ningún producto.</p>}
      </div>

      {modalProducto && (
        <Modal title={editando ? `Editar "${editando.nombre}"` : 'Nuevo producto'} onClose={() => setModalProducto(false)} maxWidth="max-w-lg">
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
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">
                  Costo {form.tieneReceta && <span className="normal-case text-petrol-600">(automático)</span>}
                </label>
                <input
                  type="number" min="0" className="input"
                  value={form.tieneReceta ? Math.round(costoEstimadoReceta) : form.costo}
                  onChange={(e) => setForm({ ...form, costo: e.target.value })}
                  disabled={form.tieneReceta}
                />
              </div>
            </div>

            {!editando && (
              <label className={`flex items-start gap-2.5 rounded-xl bg-mist-50 p-3 ${form.tieneReceta ? 'opacity-40' : ''}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-mist-300"
                  checked={form.controla_inventario_unidad}
                  disabled={form.tieneReceta}
                  onChange={(e) => setForm({ ...form, controla_inventario_unidad: e.target.checked })}
                />
                <span className="text-xs text-ink-800">
                  <span className="font-semibold text-ink-900">Controlar inventario por unidad</span> (botella, lata, etc.)
                  <br />
                  Actívalo si vendes el producto completo (ej. una cerveza, una botella de aguardiente) — después podrás asignar cuántas unidades tiene cada barra desde Inventario.
                </span>
              </label>
            )}

            <label className={`flex items-start gap-2.5 rounded-xl bg-mist-50 p-3 ${form.controla_inventario_unidad ? 'opacity-40' : ''}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-mist-300"
                checked={form.tieneReceta}
                disabled={form.controla_inventario_unidad}
                onChange={(e) => setForm({ ...form, tieneReceta: e.target.checked, ingredientes: e.target.checked && form.ingredientes.length === 0 ? [filaIngredienteVacia()] : form.ingredientes })}
              />
              <span className="text-xs text-ink-800">
                <span className="font-semibold text-ink-900">Tiene receta</span> (varios insumos, ej. un cóctel o un plato)
                <br />
                Ron + azúcar + hierbabuena para un Mojito. Cada venta descuenta automáticamente cada ingrediente de la barra que lo prepara.
              </span>
            </label>

            {form.tieneReceta && (
              <div className="rounded-xl border border-mist-200 p-3">
                <p className="mb-2 text-xs font-semibold text-mist-500">Ingredientes</p>
                <div className="space-y-2">
                  {form.ingredientes.map((ing, idx) => {
                    const sinResolver = ing.busqueda && !ing.insumo_id;
                    return (
                      <div key={idx}>
                        <div className="flex gap-2">
                          <input
                            list="lista-insumos-receta"
                            className={`input flex-[2] ${sinResolver ? 'input-error' : ''}`}
                            placeholder="Buscar insumo…"
                            value={ing.busqueda}
                            onChange={(e) => actualizarBusquedaIngrediente(idx, e.target.value)}
                          />
                          <input
                            type="number" min="0" step="any" className="input flex-1"
                            placeholder="Cant."
                            value={ing.cantidad}
                            onChange={(e) => actualizarCantidadIngrediente(idx, e.target.value)}
                          />
                          <span className="flex w-12 shrink-0 items-center justify-center text-xs text-mist-500">
                            {unidadDe(ing.insumo_id)}
                          </span>
                          <button type="button" onClick={() => quitarIngrediente(idx)} className="btn-icon-danger shrink-0" aria-label="Quitar ingrediente">
                            <X size={16} />
                          </button>
                        </div>
                        {sinResolver && (
                          <p className="mt-1 text-xs text-red-500">No encontramos un insumo llamado "{ing.busqueda}" — créalo primero en Inventario.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <datalist id="lista-insumos-receta">
                  {insumos.map((i) => <option key={i.id} value={i.nombre} />)}
                </datalist>
                <button type="button" onClick={agregarIngrediente} className="btn-ghost mt-2 text-xs">
                  <Plus size={14} /> Agregar ingrediente
                </button>
                {form.ingredientes.some((i) => i.insumo_id) && (
                  <p className="mt-2 text-xs text-mist-500">
                    Costo estimado de la receta: <span className="font-semibold text-ink-800">{formatoCOP.format(costoEstimadoReceta)}</span>
                  </p>
                )}
              </div>
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

      {modalResultadoRecetas && (
        <Modal title="Resultado de la importación de recetas" onClose={() => setModalResultadoRecetas(null)}>
          <div className="mb-4 rounded-xl bg-petrol-50 px-3.5 py-2.5 text-sm text-petrol-700">
            {modalResultadoRecetas.aplicadas} de {modalResultadoRecetas.totalFilas} líneas se aplicaron correctamente.
          </div>
          {modalResultadoRecetas.noAplicadas.length > 0 && (
            <>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-red-500">
                <AlertCircle size={14} /> {modalResultadoRecetas.noAplicadas.length} línea(s) no se pudieron aplicar
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {modalResultadoRecetas.noAplicadas.map((fila, idx) => (
                  <div key={idx} className="rounded-xl border border-red-100 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-ink-900">{fila.producto} → {fila.insumo} ({fila.cantidad})</p>
                    <p className="mt-0.5 text-xs text-mist-600">{fila.motivo}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          <button onClick={() => setModalResultadoRecetas(null)} className="btn-primary mt-4 w-full">Entendido</button>
        </Modal>
      )}

      {estaAbierto && <ConfirmDialog {...opciones} onConfirmar={onConfirmar} onCancelar={onCancelar} />}
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Send, Receipt, ShoppingCart, X, Search, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi, productosApi, barrasApi } from '../../services/endpoints.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import CerrarCuentaModal from '../../components/mesero/CerrarCuentaModal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// De qué barra salieron más productos en este pedido — para preseleccionar
// esa caja al cerrar la cuenta y ahorrarle un clic al mesero.
function barraMasFrecuente(pedido) {
  const conteo = {};
  for (const item of pedido?.items || []) {
    if (!item.barra_id) continue;
    conteo[item.barra_id] = (conteo[item.barra_id] || 0) + item.cantidad;
  }
  const entradas = Object.entries(conteo);
  if (!entradas.length) return null;
  return entradas.sort((a, b) => b[1] - a[1])[0][0];
}

export default function MeseroPedidoDetalle() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const esNuevo = pedidoId === 'nuevo';
  // La barra reutiliza esta misma pantalla ("exactamente el mismo
  // proceso que hace un mesero") — solo cambia a dónde vuelve al salir.
  const rutaVolver = perfil?.rol === 'barra' ? '/barra' : '/mesero';

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [barras, setBarras] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [pedido, setPedido] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);

  const cargarTodo = useCallback(async () => {
    const [prods, cats, brs] = await Promise.all([
      productosApi.listar({ activos: true }),
      productosApi.categorias(),
      barrasApi.listar(),
    ]);
    setProductos(prods);
    setCategorias(cats);
    setBarras(brs);
    if (cats.length) setCategoriaActiva((prev) => prev || cats[0].id);

    if (!esNuevo) {
      const data = await pedidosApi.obtener(pedidoId);
      setPedido(data);
      setReferencia(data.referencia_mesa || '');
    }
    setCargando(false);
  }, [pedidoId, esNuevo]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  useRealtimeTable({
    table: 'pedido_items',
    filter: pedido ? `pedido_id=eq.${pedido.id}` : undefined,
    onChange: async () => {
      if (pedido) setPedido(await pedidosApi.obtener(pedido.id));
    },
    enabled: !!pedido,
  });

  function agregarAlCarrito(producto) {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto_id === producto.id && !i.observaciones);
      if (existe) return prev.map((i) => (i === existe ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, observaciones: '' }];
    });
  }

  function cambiarCantidad(index, delta) {
    setCarrito((prev) => {
      const copia = [...prev];
      copia[index].cantidad += delta;
      return copia.filter((i) => i.cantidad > 0);
    });
  }

  const totalCarrito = useMemo(() => carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0), [carrito]);

  async function enviarPedido() {
    if (carrito.length === 0) return;
    setEnviando(true);
    try {
      const items = carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, observaciones: i.observaciones || undefined }));
      let actualizado;
      if (pedido) {
        actualizado = await pedidosApi.agregarItems(pedido.id, items);
      } else {
        actualizado = await pedidosApi.crear({ referencia_mesa: referencia || null, items });
        // Actualiza la URL a /mesero/pedido/<id-real> sin recargar la página
        window.history.replaceState(null, '', `/mesero/pedido/${actualizado.id}`);
      }
      setPedido(actualizado);
      setCarrito([]);
      toast.success('Pedido enviado a barra');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function quitarItemPedido(itemId) {
    if (!pedido) return;
    try {
      setPedido(await pedidosApi.quitarItem(pedido.id, itemId));
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (cargando) return <LoadingScreen label="Cargando catálogo…" />;

  const buscando = busqueda.trim().length > 0;
  const productosFiltrados = buscando
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : productos.filter((p) => p.categoria_id === categoriaActiva);
  const totalPedido = pedido?.subtotal || 0;

  return (
    <div className="flex min-h-screen flex-col bg-mist-50">
      <header className="sticky top-0 z-10 border-b border-mist-200 bg-white px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(rutaVolver)} className="btn-icon shrink-0" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-base font-bold text-ink-900">
              {pedido ? (pedido.referencia_mesa || 'Pedido') : 'Nuevo pedido'}
            </h1>
            {pedido && <p className="text-xs text-mist-500">#{pedido.id.slice(0, 8)} · {pedido.estado}</p>}
          </div>
        </div>

        {!pedido && (
          <input
            className="input mt-3"
            placeholder="Referencia (ej. Mesa 5, Terraza, Juan) — opcional"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
        )}

        <div className="relative mt-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
          <label htmlFor="buscar-producto" className="sr-only-focusable">Buscar producto</label>
          <input
            id="buscar-producto"
            className="input pl-9 pr-9"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {buscando && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-mist-400 hover:bg-mist-100 hover:text-ink-800"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Categorías (ocultas mientras se busca, para no confundir) */}
      {!buscando && (
        <div className="flex gap-2 overflow-x-auto border-b border-mist-200 bg-white px-4 py-3" role="tablist" aria-label="Categorías">
          {categorias.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={categoriaActiva === c.id}
              onClick={() => setCategoriaActiva(c.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                categoriaActiva === c.id ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {productosFiltrados.length === 0 ? (
          <EmptyState
            icono={PackageSearch}
            titulo={buscando ? `Sin resultados para "${busqueda}"` : 'Sin productos en esta categoría'}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                className="card-tap flex min-h-[72px] flex-col items-start gap-1 p-3.5"
              >
                <span className="text-sm font-semibold text-ink-900">{p.nombre}</span>
                <span className="text-xs font-medium text-petrol-600">{formatoCOP.format(p.precio)}</span>
              </button>
            ))}
          </div>
        )}

        {pedido?.items?.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mist-400">En preparación / enviados</h3>
            <div className="space-y-2">
              {pedido.items.map((it) => (
                <div key={it.id} className="card flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{it.cantidad}× {it.producto?.nombre}</p>
                    <p className="text-xs capitalize text-mist-500">{it.estado}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatoCOP.format(it.cantidad * it.precio_unitario)}</span>
                    {it.estado === 'pendiente' && (
                      <button
                        onClick={() => quitarItemPedido(it.id)}
                        className="btn-icon-danger"
                        aria-label={`Quitar ${it.producto?.nombre} del pedido`}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {carrito.length > 0 && (
        <div className="border-t border-mist-200 bg-white px-4 py-3">
          <div className="mb-2 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
            {carrito.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-ink-800">{item.nombre}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => cambiarCantidad(idx, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-100 text-ink-800 active:scale-95"
                    aria-label={`Quitar una unidad de ${item.nombre}`}
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-5 text-center font-semibold">{item.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(idx, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-mist-100 text-ink-800 active:scale-95"
                    aria-label={`Agregar una unidad de ${item.nombre}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={enviarPedido} disabled={enviando} className="btn-lg btn-primary w-full">
            <Send size={18} /> {enviando ? 'Enviando…' : `Enviar a barra · ${formatoCOP.format(totalCarrito)}`}
          </button>
        </div>
      )}

      {pedido && carrito.length === 0 && !['pagado', 'cancelado'].includes(pedido.estado) && (
        <div className="flex items-center justify-between border-t border-mist-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs text-mist-500">Total cuenta</p>
            <p className="font-display text-lg font-bold text-ink-900">{formatoCOP.format(totalPedido)}</p>
          </div>
          <button onClick={() => setModalCierre(true)} className="btn-gold">
            <Receipt size={16} /> Cerrar cuenta
          </button>
        </div>
      )}

      {carrito.length === 0 && !pedido && (
        <div className="flex items-center justify-center gap-2 border-t border-mist-200 bg-white px-4 py-4 text-sm text-mist-500">
          <ShoppingCart size={16} /> Toca un producto para iniciar el pedido
        </div>
      )}

      {modalCierre && pedido && (
        <CerrarCuentaModal
          pedido={pedido}
          barras={barras}
          barraSugerida={barraMasFrecuente(pedido)}
          onClose={() => setModalCierre(false)}
          onSuccess={() => navigate(rutaVolver)}
        />
      )}
    </div>
  );
}

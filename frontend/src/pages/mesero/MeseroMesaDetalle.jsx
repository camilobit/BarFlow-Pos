import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Send, Receipt, History, ShoppingCart, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { pedidosApi, mesasApi, productosApi, barrasApi } from '../../services/endpoints.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';
import CerrarCuentaModal from '../../components/mesero/CerrarCuentaModal.jsx';
import HistorialMesaModal from '../../components/mesero/HistorialMesaModal.jsx';

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

export default function MeseroMesaDetalle() {
  const { mesaId } = useParams();
  const navigate = useNavigate();
  const esParaLlevar = mesaId === 'nueva';

  const [mesa, setMesa] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [barras, setBarras] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [pedido, setPedido] = useState(null);
  const [carrito, setCarrito] = useState([]); // items nuevos por enviar
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [modalCierre, setModalCierre] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);

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

    if (!esParaLlevar) {
      const [mesaData, pedidos] = await Promise.all([
        mesasApi.listar().then((lista) => lista.find((m) => m.id === mesaId)),
        pedidosApi.listar({ mesa_id: mesaId }),
      ]);
      setMesa(mesaData);
      const activo = pedidos.find((p) => !['pagado', 'cancelado'].includes(p.estado));
      setPedido(activo || null);
    }
    setCargando(false);
  }, [mesaId, esParaLlevar]);

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
      if (existe) {
        return prev.map((i) => (i === existe ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
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
        actualizado = await pedidosApi.crear({ mesa_id: esParaLlevar ? null : mesaId, items });
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
      const actualizado = await pedidosApi.quitarItem(pedido.id, itemId);
      setPedido(actualizado);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (cargando) return <LoadingScreen />;

  const productosFiltrados = productos.filter((p) => p.categoria_id === categoriaActiva);
  const totalPedido = pedido?.subtotal || 0;

  return (
    <div className="flex min-h-screen flex-col bg-mist-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mist-200 bg-white px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/mesero')} className="rounded-xl p-2 hover:bg-mist-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-base font-bold text-ink-900">
              {esParaLlevar ? 'Pedido para llevar' : mesa?.nombre || 'Mesa'}
            </h1>
            {pedido && <p className="text-xs text-mist-500">Pedido #{pedido.id.slice(0, 8)} · {pedido.estado}</p>}
          </div>
        </div>
        {!esParaLlevar && (
          <button onClick={() => setModalHistorial(true)} className="rounded-xl p-2 text-mist-500 hover:bg-mist-100">
            <History size={20} />
          </button>
        )}
      </header>

      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto border-b border-mist-200 bg-white px-4 py-3">
        {categorias.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoriaActiva(c.id)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              categoriaActiva === c.id ? 'bg-petrol-600 text-white' : 'bg-mist-100 text-ink-800'
            }`}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      {/* Catálogo */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {productosFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => agregarAlCarrito(p)}
              className="card flex flex-col items-start gap-1 p-3.5 text-left active:scale-[0.97]"
            >
              <span className="text-sm font-semibold text-ink-900">{p.nombre}</span>
              <span className="text-xs font-medium text-petrol-600">{formatoCOP.format(p.precio)}</span>
            </button>
          ))}
        </div>

        {/* Items ya confirmados del pedido */}
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
                      <button onClick={() => quitarItemPedido(it.id)} className="rounded-lg p-1.5 text-mist-400 hover:bg-red-50 hover:text-red-500">
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

      {/* Carrito flotante */}
      {carrito.length > 0 && (
        <div className="border-t border-mist-200 bg-white px-4 py-3">
          <div className="mb-2 flex max-h-32 flex-col gap-1.5 overflow-y-auto">
            {carrito.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-ink-800">{item.nombre}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(idx, -1)} className="rounded-lg bg-mist-100 p-1"><Minus size={14} /></button>
                  <span className="w-4 text-center font-semibold">{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(idx, 1)} className="rounded-lg bg-mist-100 p-1"><Plus size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={enviarPedido} disabled={enviando} className="btn-primary w-full">
            <Send size={16} /> Enviar a barra · {formatoCOP.format(totalCarrito)}
          </button>
        </div>
      )}

      {/* Footer de cuenta */}
      {pedido && carrito.length === 0 && (
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
          onSuccess={() => navigate('/mesero')}
        />
      )}
      {modalHistorial && !esParaLlevar && (
        <HistorialMesaModal mesaId={mesaId} onClose={() => setModalHistorial(false)} />
      )}
    </div>
  );
}

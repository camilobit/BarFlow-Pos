import { useEffect, useState, useCallback } from 'react';
import { Receipt, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { pedidosApi, barrasApi } from '../../services/endpoints.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonTabla } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState(null);
  const [barras, setBarras] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [filtros, setFiltros] = useState({ desde: hoyISO(), hasta: hoyISO(), barra_id: '', origen: '' });

  const cargar = useCallback(async () => {
    setPedidos(null);
    const params = {
      estado: 'pagado',
      desde: `${filtros.desde}T00:00:00`,
      hasta: `${filtros.hasta}T23:59:59`,
    };
    if (filtros.barra_id) params.barra_id = filtros.barra_id;
    if (filtros.origen) params.origen = filtros.origen;
    const data = await pedidosApi.listar(params);
    setPedidos(data.sort((a, b) => new Date(b.cerrado_at) - new Date(a.cerrado_at)));
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { barrasApi.listar().then(setBarras); }, []);

  const totalPeriodo = (pedidos || []).reduce((sum, p) => sum + Number(p.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Historial de pedidos</h1>
        <p className="text-sm text-mist-500">Todos los pedidos ya facturados, con el detalle de cada uno</p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-1.5 pb-2.5 text-xs font-semibold text-mist-500">
          <Filter size={14} /> Filtros
        </div>
        <div>
          <label className="label" htmlFor="pedidos-desde">Desde</label>
          <input id="pedidos-desde" type="date" className="input !py-2" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="pedidos-hasta">Hasta</label>
          <input id="pedidos-hasta" type="date" className="input !py-2" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="pedidos-barra">Barra</label>
          <select id="pedidos-barra" className="select !py-2" value={filtros.barra_id} onChange={(e) => setFiltros({ ...filtros, barra_id: e.target.value })}>
            <option value="">Todas</option>
            {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pedidos-origen">Canal</label>
          <select id="pedidos-origen" className="select !py-2" value={filtros.origen} onChange={(e) => setFiltros({ ...filtros, origen: e.target.value })}>
            <option value="">Ambos</option>
            <option value="mesero">Mesero</option>
            <option value="barra">Barra directo</option>
          </select>
        </div>
        {pedidos && (
          <div className="ml-auto text-right">
            <p className="text-xs text-mist-500">{pedidos.length} pedido(s)</p>
            <p className="font-display text-lg font-bold text-petrol-600">{formatoCOP.format(totalPeriodo)}</p>
          </div>
        )}
      </div>

      {!pedidos ? (
        <SkeletonTabla filas={6} columnas={5} />
      ) : pedidos.length === 0 ? (
        <EmptyState icono={Receipt} titulo="No hay pedidos facturados en este rango" descripcion="Prueba ampliar el rango de fechas o quitar algún filtro." />
      ) : (
        <div className="card divide-y divide-mist-100 overflow-hidden">
          {pedidos.map((p) => {
            const abierto = expandido === p.id;
            return (
              <div key={p.id}>
                <button onClick={() => setExpandido(abierto ? null : p.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-mist-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {p.mesa?.nombre || p.referencia_mesa || 'Para llevar'}
                      </p>
                      <span className={`badge ${p.origen === 'barra' ? 'bg-gold-200 text-gold-600' : 'bg-petrol-100 text-petrol-700'}`}>
                        {p.origen === 'barra' ? 'Barra' : 'Mesero'}
                      </span>
                    </div>
                    <p className="text-xs text-mist-500">
                      {p.mesero?.nombre} · {p.barra_pago?.nombre || 'sin barra'} · {new Date(p.cerrado_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(p.total)}</span>
                    {abierto ? <ChevronUp size={16} className="text-mist-400" /> : <ChevronDown size={16} className="text-mist-400" />}
                  </div>
                </button>
                {abierto && (
                  <div className="bg-mist-50 px-4 py-3">
                    <div className="mb-2 space-y-1">
                      {(p.items || []).map((it) => (
                        <div key={it.id} className="flex justify-between text-xs text-ink-800">
                          <span>{it.cantidad}× {it.producto?.nombre}</span>
                          <span>{formatoCOP.format(it.cantidad * it.precio_unitario)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-0.5 border-t border-mist-200 pt-2 text-xs">
                      <div className="flex justify-between text-mist-500"><span>Subtotal</span><span>{formatoCOP.format(p.subtotal)}</span></div>
                      {Number(p.descuento) > 0 && <div className="flex justify-between text-mist-500"><span>Descuento</span><span>-{formatoCOP.format(p.descuento)}</span></div>}
                      {Number(p.propina) > 0 && <div className="flex justify-between text-mist-500"><span>Propina</span><span>+{formatoCOP.format(p.propina)}</span></div>}
                      <div className="flex justify-between font-semibold text-ink-900"><span>Total</span><span>{formatoCOP.format(p.total)}</span></div>
                      <div className="flex justify-between text-mist-500"><span>Método de pago</span><span className="capitalize">{p.metodo_pago}</span></div>
                      <div className="flex justify-between text-mist-500"><span>Verificado por barra</span><span>{p.pago_verificado ? 'Sí' : 'No'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

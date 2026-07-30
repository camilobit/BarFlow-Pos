import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Receipt, Users, Flame, Download, Filter, UtensilsCrossed, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardApi, barrasApi } from '../../services/endpoints.js';
import { descargarCSV } from '../../utils/csv.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import KpiCard from '../../components/admin/KpiCard.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [barras, setBarras] = useState([]);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroBarra, setFiltroBarra] = useState('');

  const cargar = useCallback(() => {
    const filtros = {};
    if (filtroDesde) filtros.desde = filtroDesde;
    if (filtroHasta) filtros.hasta = filtroHasta;
    if (filtroBarra) filtros.barra_id = filtroBarra;
    dashboardApi.resumen(filtros).then(setData);
  }, [filtroDesde, filtroHasta, filtroBarra]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { barrasApi.listar().then(setBarras); }, []);

  // Cada vez que se cierra una cuenta en cualquier mesa/barra, el panel
  // se actualiza solo — así "tiempo real" no es solo la barra, también
  // las métricas que ve el admin.
  useRealtimeTable({ table: 'pedidos', onChange: cargar });

  if (!data) return <LoadingScreen />;

  const { ventas, topProductos, porMesero, porBarra, porOrigen, pico } = data;
  const totalOrigen = (porOrigen?.mesero.total || 0) + (porOrigen?.barra.total || 0);
  const pctMesero = totalOrigen ? Math.round(((porOrigen?.mesero.total || 0) / totalOrigen) * 100) : 0;
  const pctBarra = totalOrigen ? 100 - pctMesero : 0;

  function exportarReporte() {
    descargarCSV('reporte_productos_mas_vendidos.csv', topProductos.map((p) => ({
      producto: p.producto_nombre,
      unidades_vendidas: p.unidades_vendidas,
      ingresos: p.ingresos,
    })));
    descargarCSV('reporte_ventas_por_mesero.csv', porMesero.map((m) => ({
      vendedor: `${m.mesero?.nombre || ''} ${m.mesero?.apellido || ''}`.trim() || 'Sin asignar',
      origen: m.origen === 'barra' ? 'Barra' : 'Mesero',
      pedidos: m.pedidos,
      total_vendido: m.total,
    })));
    descargarCSV('reporte_ventas_por_barra.csv', porBarra.map((b) => ({
      barra: b.barra?.nombre || 'Sin barra',
      total_vendido: b.total,
    })));
    descargarCSV('reporte_ventas_por_origen.csv', [
      { canal: 'Mesero', pedidos: porOrigen?.mesero.pedidos || 0, total_vendido: porOrigen?.mesero.total || 0 },
      { canal: 'Barra (directo)', pedidos: porOrigen?.barra.pedidos || 0, total_vendido: porOrigen?.barra.total || 0 },
    ]);
  }

  function limpiarFiltros() {
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroBarra('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Panel general</h1>
          <p className="text-sm text-mist-500">Resumen de la operación en tiempo real</p>
        </div>
        <button onClick={exportarReporte} className="btn-secondary"><Download size={16} /> Descargar reportes (CSV)</button>
      </div>

      {/* Filtros: fecha y barra — se aplican a los reportes de abajo */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-1.5 pb-2.5 text-xs font-semibold text-mist-500">
          <Filter size={14} /> Filtros
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Desde</label>
          <input type="date" className="input !py-2" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Hasta</label>
          <input type="date" className="input !py-2" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-mist-500">Barra</label>
          <select className="input !py-2" value={filtroBarra} onChange={(e) => setFiltroBarra(e.target.value)}>
            <option value="">Todas</option>
            {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        {(filtroDesde || filtroHasta || filtroBarra) && (
          <button onClick={limpiarFiltros} className="btn-ghost text-xs">Limpiar filtros</button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ventas de hoy" value={formatoCOP.format(ventas.hoy.total)} sub={`${ventas.hoy.numPedidos} pedidos`} icon={TrendingUp} accent="petrol" />
        <KpiCard label="Ventas del mes" value={formatoCOP.format(ventas.mes.total)} sub={`${ventas.mes.numPedidos} pedidos`} icon={Receipt} accent="gold" />
        <KpiCard label="Ticket promedio" value={formatoCOP.format(ventas.mes.ticketPromedio)} sub="Últimos 30 días" icon={Users} accent="ink" />
        <KpiCard label="Ventas del año" value={formatoCOP.format(ventas.anio.total)} sub={`${ventas.anio.numPedidos} pedidos`} icon={Flame} accent="petrol" />
      </div>

      {/* Desglose por canal: cuánto llegó por mesero vs. directo en barra */}
      <div className="card p-5">
        <h2 className="mb-4 font-display text-base font-bold text-ink-900">Ventas por canal (mesero vs. barra)</h2>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-mist-100">
          <div className="bg-petrol-600" style={{ width: `${pctMesero}%` }} />
          <div className="bg-gold-500" style={{ width: `${pctBarra}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-petrol-50 text-petrol-600"><ClipboardList size={17} /></div>
            <div>
              <p className="text-xs text-mist-500">Mesero · {pctMesero}%</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(porOrigen?.mesero.total || 0)}</p>
              <p className="text-xs text-mist-500">{porOrigen?.mesero.pedidos || 0} pedidos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-200 text-gold-600"><UtensilsCrossed size={17} /></div>
            <div>
              <p className="text-xs text-mist-500">Barra (directo) · {pctBarra}%</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(porOrigen?.barra.total || 0)}</p>
              <p className="text-xs text-mist-500">{porOrigen?.barra.pedidos || 0} pedidos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Productos más vendidos</h2>
          <div className="space-y-2.5">
            {topProductos.slice(0, 8).map((p) => (
              <div key={p.producto_id} className="flex items-center justify-between text-sm">
                <span className="text-ink-800">{p.producto_nombre}</span>
                <span className="font-semibold text-petrol-600">{p.unidades_vendidas} uds</span>
              </div>
            ))}
            {topProductos.length === 0 && <p className="text-sm text-mist-500">Aún no hay ventas registradas.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Horas pico</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E6" />
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}h`} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#2E6E6E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Ventas por vendedor</h2>
          <div className="space-y-2.5">
            {porMesero.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-800">
                  {m.origen === 'barra' && <span className="rounded bg-gold-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-600">Barra</span>}
                  {m.mesero?.nombre || 'Sin asignar'}
                </span>
                <span className="font-semibold text-ink-900">{formatoCOP.format(m.total)}</span>
              </div>
            ))}
            {porMesero.length === 0 && <p className="text-sm text-mist-500">Sin datos aún.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Ventas por barra</h2>
          <div className="space-y-2.5">
            {porBarra.slice(0, 8).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-800">{b.barra?.nombre || 'Sin barra'}</span>
                <span className="font-semibold text-ink-900">{formatoCOP.format(b.total)}</span>
              </div>
            ))}
            {porBarra.length === 0 && <p className="text-sm text-mist-500">Sin datos aún.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Receipt, Users, Flame, Download, Filter, UtensilsCrossed,
  ClipboardList, Inbox, ChevronDown, Trophy,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardApi, barrasApi } from '../../services/endpoints.js';
import { descargarCSV } from '../../utils/csv.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import KpiCard from '../../components/admin/KpiCard.jsx';
import { SkeletonKpis } from '../../components/common/Skeleton.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [barras, setBarras] = useState([]);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroBarra, setFiltroBarra] = useState('');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

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

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-8 w-40" />
        <SkeletonKpis cantidad={4} />
      </div>
    );
  }

  const { ventas, topProductos, porMesero, porBarra, porOrigen, pico } = data;
  const totalOrigen = (porOrigen?.mesero.total || 0) + (porOrigen?.barra.total || 0);
  const pctMesero = totalOrigen ? Math.round(((porOrigen?.mesero.total || 0) / totalOrigen) * 100) : 0;
  const pctBarra = totalOrigen ? 100 - pctMesero : 0;
  const filtrosActivos = [filtroDesde, filtroHasta, filtroBarra].filter(Boolean).length;

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
    <div className="space-y-5 sm:space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">Panel general</h1>
          <p className="text-xs text-mist-500 sm:text-sm">Resumen de la operación en tiempo real</p>
        </div>
        <button onClick={exportarReporte} className="btn-secondary btn-sm shrink-0 sm:btn sm:min-h-[44px] sm:px-4 sm:py-2.5 sm:text-sm">
          <Download size={15} />
          <span className="hidden sm:inline">Descargar reportes</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>

      {/* Filtros — colapsables en celular, siempre abiertos en escritorio */}
      <div className="card p-4">
        <button
          onClick={() => setFiltrosAbiertos((v) => !v)}
          className="flex w-full items-center justify-between sm:pointer-events-none"
          aria-expanded={filtrosAbiertos}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-mist-600">
            <Filter size={14} /> Filtros
            {filtrosActivos > 0 && <span className="badge bg-petrol-100 text-petrol-700">{filtrosActivos}</span>}
          </span>
          <ChevronDown size={16} className={`text-mist-400 transition-transform sm:hidden ${filtrosAbiertos ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${filtrosAbiertos ? 'grid' : 'hidden'} mt-3 grid-cols-2 gap-3 sm:mt-3 sm:flex sm:flex-wrap sm:items-end`}>
          <div>
            <label className="label" htmlFor="panel-filtro-desde">Desde</label>
            <input id="panel-filtro-desde" type="date" className="input !py-2" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="panel-filtro-hasta">Hasta</label>
            <input id="panel-filtro-hasta" type="date" className="input !py-2" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="panel-filtro-barra">Barra</label>
            <select id="panel-filtro-barra" className="select !py-2" value={filtroBarra} onChange={(e) => setFiltroBarra(e.target.value)}>
              <option value="">Todas</option>
              {barras.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          {filtrosActivos > 0 && (
            <button onClick={limpiarFiltros} className="btn-ghost btn-sm col-span-2 sm:col-span-1">Limpiar filtros</button>
          )}
        </div>
      </div>

      {/* KPIs — carrusel con scroll-snap en celular, grilla en escritorio */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        <div className="w-[78%] shrink-0 snap-start sm:w-auto">
          <KpiCard destacado label="Ventas de hoy" value={formatoCOP.format(ventas.hoy.total)} sub={`${ventas.hoy.numPedidos} pedidos`} icon={TrendingUp} />
        </div>
        <div className="w-[78%] shrink-0 snap-start sm:w-auto">
          <KpiCard label="Ventas del mes" value={formatoCOP.format(ventas.mes.total)} sub={`${ventas.mes.numPedidos} pedidos`} icon={Receipt} accent="gold" />
        </div>
        <div className="w-[78%] shrink-0 snap-start sm:w-auto">
          <KpiCard label="Ticket promedio" value={formatoCOP.format(ventas.mes.ticketPromedio)} sub="Últimos 30 días" icon={Users} accent="ink" />
        </div>
        <div className="w-[78%] shrink-0 snap-start sm:w-auto">
          <KpiCard label="Ventas del año" value={formatoCOP.format(ventas.anio.total)} sub={`${ventas.anio.numPedidos} pedidos`} icon={Flame} accent="petrol" />
        </div>
      </div>

      {/* Desglose por canal: cuánto llegó por mesero vs. directo en barra */}
      <div className="card p-4 sm:p-5">
        <h2 className="mb-4 font-display text-sm font-bold text-ink-900 sm:text-base">Ventas por canal</h2>
        <div
          className="mb-4 flex h-3 overflow-hidden rounded-full bg-mist-100"
          role="img"
          aria-label={`Mesero: ${pctMesero}% de las ventas. Barra directo: ${pctBarra}% de las ventas.`}
        >
          <div className="bg-petrol-600 transition-all" style={{ width: `${pctMesero}%` }} />
          <div className="bg-gold-500 transition-all" style={{ width: `${pctBarra}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-petrol-50 text-petrol-600"><ClipboardList size={17} /></div>
            <div className="min-w-0">
              <p className="text-xs text-mist-500">Mesero · {pctMesero}%</p>
              <p className="truncate font-display text-sm font-bold text-ink-900">{formatoCOP.format(porOrigen?.mesero.total || 0)}</p>
              <p className="text-xs text-mist-500">{porOrigen?.mesero.pedidos || 0} pedidos</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-200 text-gold-600"><UtensilsCrossed size={17} /></div>
            <div className="min-w-0">
              <p className="text-xs text-mist-500">Barra directo · {pctBarra}%</p>
              <p className="truncate font-display text-sm font-bold text-ink-900">{formatoCOP.format(porOrigen?.barra.total || 0)}</p>
              <p className="text-xs text-mist-500">{porOrigen?.barra.pedidos || 0} pedidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reportes */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <div className="card p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-ink-900 sm:text-base">Productos más vendidos</h2>
          {topProductos.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-mist-500"><Inbox size={16} className="opacity-50" /> Aún no hay ventas registradas.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {topProductos.slice(0, 8).map((p, i) => (
                <li key={p.producto_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i < 3 ? 'bg-gold-200 text-gold-600' : 'bg-mist-100 text-mist-500'}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{p.producto_nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-petrol-600">{p.unidades_vendidas} uds</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-ink-900 sm:text-base">Horas pico</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pico} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E6" vertical={false} />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#A8A8A3' }} tickFormatter={(h) => `${h}h`} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#A8A8A3' }} allowDecimals={false} width={28} />
              <Tooltip cursor={{ fill: '#F4F4F3' }} contentStyle={{ borderRadius: 12, border: '1px solid #E8E8E6', fontSize: 12 }} />
              <Bar dataKey="cantidad" fill="#2E6E6E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-ink-900 sm:text-base">Ventas por vendedor</h2>
          {porMesero.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-mist-500"><Inbox size={16} className="opacity-50" /> Sin datos con este filtro todavía.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {porMesero.slice(0, 8).map((m, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist-100 text-xs font-bold text-ink-700">
                    {(m.mesero?.nombre || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-ink-800">
                    {m.origen === 'barra' && <span className="shrink-0 rounded bg-gold-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-600">Barra</span>}
                    <span className="truncate">{m.mesero?.nombre || 'Sin asignar'}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{formatoCOP.format(m.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-bold text-ink-900 sm:text-base">Ventas por barra</h2>
          {porBarra.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-mist-500"><Inbox size={16} className="opacity-50" /> Sin datos con este filtro todavía.</p>
          ) : (
            <ul className="divide-y divide-mist-100">
              {porBarra.slice(0, 8).map((b, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-petrol-50 text-petrol-600">
                    <Trophy size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{b.barra?.nombre || 'Sin barra'}</span>
                  <span className="shrink-0 text-sm font-semibold text-ink-900">{formatoCOP.format(b.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

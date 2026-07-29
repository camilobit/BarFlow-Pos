import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Receipt, Users, Flame, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardApi } from '../../services/endpoints.js';
import { descargarCSV } from '../../utils/csv.js';
import { useRealtimeTable } from '../../hooks/useRealtimeTable.js';
import KpiCard from '../../components/admin/KpiCard.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);

  const cargar = useCallback(() => { dashboardApi.resumen().then(setData); }, []);

  useEffect(() => { cargar(); }, [cargar]);
  // Cada vez que se cierra una cuenta en cualquier mesa/barra, el panel
  // se actualiza solo — así "tiempo real" no es solo la barra, también
  // las métricas que ve el admin.
  useRealtimeTable({ table: 'pedidos', onChange: cargar });

  if (!data) return <LoadingScreen />;

  const { ventas, topProductos, porMesero, porBarra, pico } = data;

  function exportarReporte() {
    descargarCSV('reporte_productos_mas_vendidos.csv', topProductos.map((p) => ({
      producto: p.producto_nombre,
      unidades_vendidas: p.unidades_vendidas,
      ingresos: p.ingresos,
    })));
    descargarCSV('reporte_ventas_por_mesero.csv', porMesero.map((m) => ({
      mesero: `${m.mesero?.nombre || ''} ${m.mesero?.apellido || ''}`.trim() || 'Sin asignar',
      pedidos: m.pedidos,
      total_vendido: m.total,
    })));
    descargarCSV('reporte_ventas_por_barra.csv', porBarra.map((b) => ({
      barra: b.barra?.nombre || 'Sin barra',
      total_vendido: b.total,
    })));
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ventas de hoy" value={formatoCOP.format(ventas.hoy.total)} sub={`${ventas.hoy.numPedidos} pedidos`} icon={TrendingUp} accent="petrol" />
        <KpiCard label="Ventas del mes" value={formatoCOP.format(ventas.mes.total)} sub={`${ventas.mes.numPedidos} pedidos`} icon={Receipt} accent="gold" />
        <KpiCard label="Ticket promedio" value={formatoCOP.format(ventas.mes.ticketPromedio)} sub="Últimos 30 días" icon={Users} accent="ink" />
        <KpiCard label="Ventas del año" value={formatoCOP.format(ventas.anio.total)} sub={`${ventas.anio.numPedidos} pedidos`} icon={Flame} accent="petrol" />
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
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Horas pico (últimos 30 días)</h2>
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
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Ventas por mesero</h2>
          <div className="space-y-2.5">
            {porMesero.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-800">{m.mesero?.nombre || 'Sin asignar'}</span>
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

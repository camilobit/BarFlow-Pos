import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, TriangleAlert, CheckCircle2, Printer, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { cajaApi } from '../../services/endpoints.js';
import Modal from './Modal.jsx';

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// cajaId: cuál sesión de caja mostrar. permitirRevisar: solo el admin
// puede marcar un cierre como "ya lo revisé" — el cajero que lo cerró no.
export default function ReporteCierreCaja({ cajaId, onClose, permitirRevisar = false, onRevisado }) {
  const [reporte, setReporte] = useState(null);
  const [verInventarioCompleto, setVerInventarioCompleto] = useState(false);
  const [verVentas, setVerVentas] = useState(false);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    cajaApi.reporte(cajaId).then(setReporte).catch((err) => toast.error(err.message));
  }, [cajaId]);

  async function marcarRevisado() {
    setMarcando(true);
    try {
      await cajaApi.marcarRevisado(cajaId);
      toast.success('Marcado como revisado');
      onRevisado?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMarcando(false);
    }
  }

  if (!reporte) {
    return (
      <Modal title="Reporte de cierre" onClose={onClose}>
        <p className="py-8 text-center text-sm text-mist-500">Cargando…</p>
      </Modal>
    );
  }

  const { caja, totales, inventario, ventasPorProducto, hayAlertasInventario } = reporte;
  const conAlerta = inventario.filter((i) => i.conAlerta);
  const sinAlerta = inventario.filter((i) => !i.conAlerta);
  const hayDiferenciaDinero = caja.diferencia !== null && Math.abs(Number(caja.diferencia)) > 1000;

  return (
    <Modal title={`Reporte de cierre — ${caja.barra?.nombre || 'Caja'}`} onClose={onClose} maxWidth="max-w-2xl">
      <div id="reporte-cierre-imprimible" className="space-y-5">
        <div className="flex items-center justify-between text-xs text-mist-500 print:text-black">
          <span>{new Date(caja.abierta_at).toLocaleString('es-CO')} → {caja.cerrada_at ? new Date(caja.cerrada_at).toLocaleString('es-CO') : 'abierta'}</span>
          <span>Abrió: {caja.abierto_por_usuario?.nombre} {caja.cerrado_por_usuario && `· Cerró: ${caja.cerrado_por_usuario.nombre}`}</span>
        </div>

        {/* Dinero */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mist-500">Dinero</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-mist-50 p-3">
              <p className="text-xs text-mist-500">Efectivo esperado</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(totales.ingresosEfectivo)}</p>
            </div>
            <div className="rounded-xl bg-mist-50 p-3">
              <p className="text-xs text-mist-500">Transferencia</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(totales.porMetodo?.transferencia || 0)}</p>
            </div>
            <div className="rounded-xl bg-mist-50 p-3">
              <p className="text-xs text-mist-500">Tarjeta</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(totales.porMetodo?.tarjeta || 0)}</p>
            </div>
            <div className="rounded-xl bg-mist-50 p-3">
              <p className="text-xs text-mist-500">Propinas</p>
              <p className="font-display text-sm font-bold text-ink-900">{formatoCOP.format(totales.propinas)}</p>
            </div>
          </div>
          {caja.cerrada_at && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-mist-50 p-3 text-sm">
              <span className="text-mist-500">Efectivo contado vs. esperado</span>
              <span className={`font-semibold ${hayDiferenciaDinero ? 'text-red-500' : 'text-petrol-600'}`}>
                {formatoCOP.format(caja.monto_final_real)} ({caja.diferencia >= 0 ? '+' : ''}{formatoCOP.format(caja.diferencia)})
              </span>
            </div>
          )}
        </div>

        {/* Alertas de inventario — lo primero, sin necesidad de expandir nada */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-mist-500">Inventario</h3>
          {!hayAlertasInventario ? (
            <div className="flex items-center gap-2 rounded-xl bg-petrol-50 px-3.5 py-3 text-sm text-petrol-700">
              <CheckCircle2 size={18} /> Todo el inventario contado cuadra con lo vendido.
            </div>
          ) : (
            <div className="space-y-2">
              {conAlerta.map((i) => (
                <div key={i.insumo_id} className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <TriangleAlert size={16} className="shrink-0 text-red-500" />
                    <span className="font-medium text-ink-900">{i.nombre}</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {i.diferencia > 0 ? 'sobran' : 'faltan'} {Math.abs(i.diferencia)} {i.unidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalle completo — colapsado por defecto */}
        <div>
          <button onClick={() => setVerInventarioCompleto((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold text-ink-800">
            Ver inventario completo del turno
            {verInventarioCompleto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {verInventarioCompleto && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-mist-200 text-left text-mist-400">
                    <th className="py-1.5 pr-2">Insumo</th>
                    <th className="py-1.5 pr-2">Apertura</th>
                    <th className="py-1.5 pr-2">Vendido</th>
                    <th className="py-1.5 pr-2">Cierre sistema</th>
                    <th className="py-1.5 pr-2">Cierre contado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...conAlerta, ...sinAlerta].map((i) => (
                    <tr key={i.insumo_id} className="border-b border-mist-100 last:border-0">
                      <td className="py-1.5 pr-2 text-ink-900">{i.nombre}</td>
                      <td className="py-1.5 pr-2 text-mist-500">{i.apertura ?? '—'} {i.unidad}</td>
                      <td className="py-1.5 pr-2 text-mist-500">{i.vendidoTeorico ?? '—'}</td>
                      <td className="py-1.5 pr-2 text-mist-500">{i.cierreSistema ?? '—'}</td>
                      <td className={`py-1.5 pr-2 font-medium ${i.conAlerta ? 'text-red-500' : i.sinVerificar ? 'text-mist-400' : 'text-ink-900'}`}>
                        {i.sinVerificar ? 'sin contar' : `${i.cierreFisico} ${i.unidad}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ventas por producto — colapsado por defecto */}
        <div>
          <button onClick={() => setVerVentas((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold text-ink-800">
            Ver ventas por producto
            {verVentas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {verVentas && (
            <div className="mt-2 space-y-1">
              {ventasPorProducto.length === 0 ? (
                <p className="text-xs text-mist-500">Sin ventas en este turno.</p>
              ) : (
                ventasPorProducto.map((v, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-ink-800">{v.nombre} × {v.unidades}</span>
                    <span className="font-medium text-ink-900">{formatoCOP.format(v.total)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="btn-secondary flex-1"><Printer size={16} /> Imprimir / PDF</button>
        {permitirRevisar && !caja.revisado_at && (
          <button onClick={marcarRevisado} disabled={marcando} className="btn-primary flex-1">
            <BadgeCheck size={16} /> {marcando ? 'Marcando…' : 'Marcar como revisado'}
          </button>
        )}
      </div>
      {caja.revisado_at && (
        <p className="mt-2 text-center text-xs text-mist-500">Revisado por {caja.revisado_por_usuario?.nombre} el {new Date(caja.revisado_at).toLocaleString('es-CO')}</p>
      )}
    </Modal>
  );
}

import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as dashboardService from './dashboard.service.js';

export const resumen = asyncHandler(async (req, res) => {
  const [ventas, topProductos, porMesero, porBarra, pico] = await Promise.all([
    dashboardService.resumenVentas(req.usuario.negocio_id),
    dashboardService.productosMasVendidos(req.usuario.negocio_id),
    dashboardService.ventasPorMesero(req.usuario.negocio_id),
    dashboardService.ventasPorBarra(req.usuario.negocio_id),
    dashboardService.horasPico(req.usuario.negocio_id),
  ]);
  return response.success(res, { ventas, topProductos, porMesero, porBarra, pico });
});

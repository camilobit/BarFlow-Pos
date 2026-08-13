import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './productos.controller.js';
import {
  crearProductoSchema, importarProductosSchema, importarRecetasSchema,
  asignarStockSchema, establecerStockSchema, crearMovimientoSchema,
} from './productos.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireRole('admin_negocio', 'super_admin'), validate(crearProductoSchema), ctrl.crear);
router.post('/importar-masivo', requireRole('admin_negocio', 'super_admin'), validate(importarProductosSchema), ctrl.importarMasivo);
router.post('/importar-recetas', requireRole('admin_negocio', 'super_admin'), validate(importarRecetasSchema), ctrl.importarRecetas);
router.patch('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.actualizar);
router.post('/:id/duplicar', requireRole('admin_negocio', 'super_admin'), ctrl.duplicar);
router.delete('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminar);
router.delete('/:id/permanente', requireRole('admin_negocio', 'super_admin'), ctrl.eliminarPermanente);

router.get('/categorias/todas', ctrl.listarCategorias);
router.post('/categorias', requireRole('admin_negocio', 'super_admin'), ctrl.crearCategoria);
router.delete('/categorias/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminarCategoria);

// El cajero de barra necesita ver los insumos (con su stock por barra)
// para poder elegir qué trasladar a otra barra.
router.get('/insumos/todos', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.listarInsumos);
router.post('/insumos', requireRole('admin_negocio', 'super_admin'), ctrl.crearInsumo);
router.delete('/insumos/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminarInsumo);
router.post('/insumos/:id/asignar-stock', requireRole('admin_negocio', 'super_admin'), validate(asignarStockSchema), ctrl.asignarStockBarra);
router.post('/insumos/:id/establecer-stock', requireRole('admin_negocio', 'super_admin'), validate(establecerStockSchema), ctrl.establecerStockBarra);

// Traslados de inventario entre barras — el cajero envía y acepta; el
// admin solo consulta el historial completo para el cierre.
router.post('/movimientos', requireRole('barra', 'admin_negocio', 'super_admin'), validate(crearMovimientoSchema), ctrl.crearMovimiento);
router.get('/movimientos/pendientes', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.movimientosPendientes);
router.get('/movimientos/enviados', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.movimientosEnviados);
router.get('/movimientos/historial', requireRole('admin_negocio', 'super_admin'), ctrl.historialMovimientos);
router.patch('/movimientos/:id/aceptar', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.aceptarMovimiento);
router.patch('/movimientos/:id/rechazar', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.rechazarMovimiento);

export default router;

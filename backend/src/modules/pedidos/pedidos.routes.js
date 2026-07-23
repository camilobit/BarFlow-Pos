import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './pedidos.controller.js';
import {
  crearPedidoSchema,
  agregarItemsSchema,
  actualizarEstadoItemSchema,
  cerrarCuentaSchema,
  dividirCuentaSchema,
} from './pedidos.validator.js';

const router = Router();
router.use(requireAuth);

// Rutas estáticas ANTES de '/:id' para que no choquen con el parámetro dinámico
router.get('/pagos-por-verificar', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.pagosPorVerificar);
router.get('/mesa/:mesaId/historial', ctrl.historialPorMesa);
router.get('/barra/:barraId', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.pedidosPorBarra);
router.post('/combinar-mesas', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.combinarMesas);
router.patch(
  '/items/:itemId/estado',
  requireRole('barra', 'mesero', 'admin_negocio', 'super_admin'),
  validate(actualizarEstadoItemSchema),
  ctrl.actualizarEstadoItem
);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);

router.post('/', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(crearPedidoSchema), ctrl.crear);
router.post('/:id/items', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(agregarItemsSchema), ctrl.agregarItems);
router.delete('/:id/items/:itemId', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.quitarItem);
router.patch('/:id/mesa', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.cambiarMesa);
router.post('/:id/cerrar-cuenta', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(cerrarCuentaSchema), ctrl.cerrarCuenta);
router.post('/:id/dividir', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(dividirCuentaSchema), ctrl.dividirCuenta);
router.patch('/:id/verificar-pago', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.verificarPago);

export default router;

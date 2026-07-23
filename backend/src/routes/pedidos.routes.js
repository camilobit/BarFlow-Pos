import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/pedidos.controller.js';
import {
  crearPedidoSchema,
  agregarItemsSchema,
  actualizarEstadoItemSchema,
  cerrarCuentaSchema,
  dividirCuentaSchema,
} from '../validations/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.get('/mesa/:mesaId/historial', ctrl.historialPorMesa);
router.get('/barra/:barraId', requireRole('barra', 'admin_negocio', 'super_admin'), ctrl.pedidosPorBarra);

router.post('/', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(crearPedidoSchema), ctrl.crear);
router.post('/:id/items', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(agregarItemsSchema), ctrl.agregarItems);
router.delete('/:id/items/:itemId', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.quitarItem);
router.patch(
  '/items/:itemId/estado',
  requireRole('barra', 'mesero', 'admin_negocio', 'super_admin'),
  validate(actualizarEstadoItemSchema),
  ctrl.actualizarEstadoItem
);
router.patch('/:id/mesa', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.cambiarMesa);
router.post('/combinar-mesas', requireRole('mesero', 'admin_negocio', 'super_admin'), ctrl.combinarMesas);
router.post('/:id/cerrar-cuenta', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(cerrarCuentaSchema), ctrl.cerrarCuenta);
router.post('/:id/dividir', requireRole('mesero', 'admin_negocio', 'super_admin'), validate(dividirCuentaSchema), ctrl.dividirCuenta);

export default router;

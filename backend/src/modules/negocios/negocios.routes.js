import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './negocios.controller.js';
import { crearNegocioSchema } from './negocios.validator.js';

const router = Router();
router.use(requireAuth);

// Configuración operativa del propio negocio (ej. modo de mesas): la lee
// cualquier rol del negocio, pero solo el admin (o super_admin) la cambia.
router.get('/configuracion', ctrl.miConfiguracion);
router.patch('/configuracion', requireRole('admin_negocio', 'super_admin'), ctrl.actualizarMiConfiguracion);

// Limpiar pedidos/caja de prueba del propio negocio — solo el admin de
// ese negocio (siempre sobre su propio negocio_id, nunca otro).
router.post('/limpiar-pedidos', requireRole('admin_negocio', 'super_admin'), ctrl.limpiarPedidosYCaja);

// Administración de negocios: exclusivo de super_admin
router.get('/', requireRole('super_admin'), ctrl.listar);
router.get('/estadisticas', requireRole('super_admin'), ctrl.estadisticas);
router.post('/', requireRole('super_admin'), validate(crearNegocioSchema), ctrl.crear);
router.patch('/:id', requireRole('super_admin'), ctrl.actualizar);
router.patch('/:id/suspender', requireRole('super_admin'), ctrl.suspender);
router.patch('/:id/activar', requireRole('super_admin'), ctrl.activar);
router.patch('/:id/pago', requireRole('super_admin'), ctrl.marcarPago);
router.delete('/:id', requireRole('super_admin'), ctrl.eliminar);

export default router;

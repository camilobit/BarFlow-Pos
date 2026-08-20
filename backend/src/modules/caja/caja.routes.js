import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './caja.controller.js';
import { abrirCajaSchema, cerrarCajaSchema, movimientoCajaSchema } from './caja.validator.js';

const router = Router();
// "barra" (cajero) ahora puede abrir/cerrar/mover su propia caja, además de admin y mesero
router.use(requireAuth, requireRole('admin_negocio', 'super_admin', 'mesero', 'barra'));

router.get('/actual', ctrl.obtenerActual);
router.get('/abiertas', ctrl.listarAbiertas);
router.get('/resumen', ctrl.resumen);
router.get('/insumos-para-conteo', ctrl.insumosParaConteo);
router.get('/historial', requireRole('admin_negocio', 'super_admin'), ctrl.historial);
router.get('/pendientes-revision', requireRole('admin_negocio', 'super_admin'), ctrl.pendientesRevision);
router.get('/:id/reporte', ctrl.reporte);
router.patch('/:id/revisar', requireRole('admin_negocio', 'super_admin'), ctrl.marcarRevisado);
router.post('/abrir', validate(abrirCajaSchema), ctrl.abrir);
router.post('/movimiento', validate(movimientoCajaSchema), ctrl.registrarMovimiento);
router.post('/cerrar', validate(cerrarCajaSchema), ctrl.cerrar);

export default router;

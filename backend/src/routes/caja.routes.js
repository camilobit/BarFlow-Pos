import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/caja.controller.js';
import { abrirCajaSchema, cerrarCajaSchema, movimientoCajaSchema } from '../validations/schemas.js';

const router = Router();
router.use(requireAuth, requireRole('admin_negocio', 'super_admin', 'mesero'));

router.get('/actual', ctrl.obtenerActual);
router.get('/resumen', ctrl.resumen);
router.get('/historial', requireRole('admin_negocio', 'super_admin'), ctrl.historial);
router.post('/abrir', validate(abrirCajaSchema), ctrl.abrir);
router.post('/movimiento', validate(movimientoCajaSchema), ctrl.registrarMovimiento);
router.post('/cerrar', requireRole('admin_negocio', 'super_admin'), validate(cerrarCajaSchema), ctrl.cerrar);

export default router;

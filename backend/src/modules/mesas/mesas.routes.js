import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './mesas.controller.js';
import { crearMesaSchema, actualizarMesaSchema } from './mesas.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireRole('admin_negocio', 'super_admin'), validate(crearMesaSchema), ctrl.crear);
router.patch('/:id', requireRole('admin_negocio', 'mesero', 'super_admin'), validate(actualizarMesaSchema), ctrl.actualizar);
router.delete('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminar);

export default router;

import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/negocios.controller.js';
import { crearNegocioSchema } from '../validations/schemas.js';

const router = Router();
router.use(requireAuth, requireRole('super_admin'));

router.get('/', ctrl.listar);
router.get('/estadisticas', ctrl.estadisticas);
router.post('/', validate(crearNegocioSchema), ctrl.crear);
router.patch('/:id', ctrl.actualizar);
router.patch('/:id/suspender', ctrl.suspender);
router.patch('/:id/activar', ctrl.activar);

export default router;

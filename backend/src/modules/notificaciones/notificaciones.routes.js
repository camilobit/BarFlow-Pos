import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import * as ctrl from './notificaciones.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.patch('/:id/leida', ctrl.marcarLeida);
router.patch('/leer-todas', ctrl.marcarTodasLeidas);

export default router;

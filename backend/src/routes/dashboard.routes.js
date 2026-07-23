import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/dashboard.controller.js';

const router = Router();
router.use(requireAuth, requireRole('admin_negocio', 'super_admin'));

router.get('/resumen', ctrl.resumen);

export default router;

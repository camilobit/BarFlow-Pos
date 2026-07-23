import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/usuarios.controller.js';
import { crearUsuarioSchema } from '../validations/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/perfil', ctrl.perfilActual);
router.get('/', requireRole('admin_negocio', 'super_admin'), ctrl.listar);
router.post('/', requireRole('admin_negocio', 'super_admin'), validate(crearUsuarioSchema), ctrl.crear);
router.patch('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.actualizar);
router.delete('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.desactivar);

export default router;

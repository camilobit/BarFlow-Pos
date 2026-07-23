import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/clientes.controller.js';
import { crearClienteSchema } from '../validations/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.get('/ranking', ctrl.ranking);
router.get('/cumpleanos', ctrl.cumpleanos);
router.get('/:id', ctrl.obtener);
router.get('/:id/historial', ctrl.historial);
router.post('/', validate(crearClienteSchema), ctrl.crear);
router.patch('/:id', ctrl.actualizar);

export default router;

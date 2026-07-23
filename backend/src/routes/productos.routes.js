import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import * as ctrl from '../controllers/productos.controller.js';
import { crearProductoSchema } from '../validations/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireRole('admin_negocio', 'super_admin'), validate(crearProductoSchema), ctrl.crear);
router.patch('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.actualizar);
router.delete('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminar);

router.get('/categorias/todas', ctrl.listarCategorias);
router.post('/categorias', requireRole('admin_negocio', 'super_admin'), ctrl.crearCategoria);

router.get('/insumos/todos', requireRole('admin_negocio', 'super_admin'), ctrl.listarInsumos);
router.post('/insumos', requireRole('admin_negocio', 'super_admin'), ctrl.crearInsumo);
router.patch('/insumos/:id/ajustar-stock', requireRole('admin_negocio', 'super_admin'), ctrl.ajustarStock);

export default router;

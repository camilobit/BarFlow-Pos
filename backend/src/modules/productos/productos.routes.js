import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import * as ctrl from './productos.controller.js';
import { crearProductoSchema, importarProductosSchema, asignarStockSchema } from './productos.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireRole('admin_negocio', 'super_admin'), validate(crearProductoSchema), ctrl.crear);
router.post('/importar-masivo', requireRole('admin_negocio', 'super_admin'), validate(importarProductosSchema), ctrl.importarMasivo);
router.patch('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.actualizar);
router.delete('/:id', requireRole('admin_negocio', 'super_admin'), ctrl.eliminar);
router.delete('/:id/permanente', requireRole('admin_negocio', 'super_admin'), ctrl.eliminarPermanente);

router.get('/categorias/todas', ctrl.listarCategorias);
router.post('/categorias', requireRole('admin_negocio', 'super_admin'), ctrl.crearCategoria);

router.get('/insumos/todos', requireRole('admin_negocio', 'super_admin'), ctrl.listarInsumos);
router.post('/insumos', requireRole('admin_negocio', 'super_admin'), ctrl.crearInsumo);
router.post('/insumos/:id/asignar-stock', requireRole('admin_negocio', 'super_admin'), validate(asignarStockSchema), ctrl.asignarStockBarra);

export default router;

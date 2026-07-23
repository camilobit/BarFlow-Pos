import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/errorHandler.middleware.js';
import { AppError } from '../utils/AppError.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('barras')
      .select('*')
      .eq('negocio_id', req.usuario.negocio_id)
      .order('orden');
    if (error) throw new AppError('No se pudieron listar las barras.', 500, error.message);
    res.json(data);
  })
);

router.post(
  '/',
  requireRole('admin_negocio', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('barras')
      .insert({ ...req.body, negocio_id: req.usuario.negocio_id })
      .select()
      .single();
    if (error) throw new AppError('No se pudo crear la barra.', 500, error.message);
    res.status(201).json(data);
  })
);

router.patch(
  '/:id',
  requireRole('admin_negocio', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin.from('barras').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw new AppError('No se pudo actualizar la barra.', 500, error.message);
    res.json(data);
  })
);

export default router;

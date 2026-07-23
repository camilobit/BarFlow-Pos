import { Router } from 'express';
import pedidosRoutes from '../modules/pedidos/pedidos.routes.js';
import mesasRoutes from '../modules/mesas/mesas.routes.js';
import productosRoutes from '../modules/productos/productos.routes.js';
import cajaRoutes from '../modules/caja/caja.routes.js';
import clientesRoutes from '../modules/clientes/clientes.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import negociosRoutes from '../modules/negocios/negocios.routes.js';
import usuariosRoutes from '../modules/usuarios/usuarios.routes.js';
import notificacionesRoutes from '../modules/notificaciones/notificaciones.routes.js';
import barrasRoutes from '../modules/barras/barras.routes.js';
import { response } from '../utils/response.utils.js';

const router = Router();

router.get('/health', (req, res) => response.success(res, { service: 'barflow-pos-api' }, 'BarFlow POS API online'));

router.use('/pedidos', pedidosRoutes);
router.use('/mesas', mesasRoutes);
router.use('/productos', productosRoutes);
router.use('/caja', cajaRoutes);
router.use('/clientes', clientesRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/negocios', negociosRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/barras', barrasRoutes);

export default router;

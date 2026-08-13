import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { response } from '../../utils/response.utils.js';
import * as negociosService from './negocios.service.js';
import * as usuariosService from '../usuarios/usuarios.service.js';

export const listar = asyncHandler(async (req, res) => {
  const negocios = await negociosService.listarNegocios();
  return response.success(res, negocios);
});

export const crear = asyncHandler(async (req, res) => {
  const { admin_nombre, admin_apellido, admin_email, admin_password, ...datosNegocio } = req.body;
  const negocio = await negociosService.crearNegocio(datosNegocio);

  let admin = null;
  if (admin_email && admin_password) {
    try {
      admin = await usuariosService.crearEmpleado({
        negocioId: negocio.id,
        email: admin_email,
        password: admin_password,
        nombre: admin_nombre || 'Administrador',
        apellido: admin_apellido,
        rol: 'admin_negocio',
      });
    } catch (err) {
      // El negocio ya quedó creado; si falla el admin, avisamos pero no
      // revertimos el negocio (el super_admin puede crear el admin luego
      // desde Equipo sin tener que rehacer todo).
      return response.created(res, { ...negocio, adminError: err.message }, 'Negocio creado, pero el administrador no se pudo crear');
    }
  }

  return response.created(res, { ...negocio, admin }, 'Negocio creado');
});

export const actualizar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.actualizarNegocio(req.params.id, req.body);
  return response.success(res, negocio, 'Negocio actualizado');
});

export const suspender = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'suspendido');
  return response.success(res, negocio, 'Negocio suspendido');
});

export const activar = asyncHandler(async (req, res) => {
  const negocio = await negociosService.cambiarEstadoNegocio(req.params.id, 'activo');
  return response.success(res, negocio, 'Negocio activado');
});

export const marcarPago = asyncHandler(async (req, res) => {
  const negocio = await negociosService.marcarPago(req.params.id, req.body.pagado, req.body.pagado_hasta);
  return response.success(res, negocio, req.body.pagado ? 'Marcado como pagado' : 'Marcado como pendiente de pago');
});

export const eliminar = asyncHandler(async (req, res) => {
  await negociosService.eliminarNegocio(req.params.id);
  return response.noContent(res);
});

export const estadisticas = asyncHandler(async (req, res) => {
  const stats = await negociosService.estadisticasGlobales();
  return response.success(res, stats);
});

// Cualquier rol autenticado puede LEER la configuración de su propio
// negocio (la necesitan mesero y barra para saber qué pantalla mostrar).
export const miConfiguracion = asyncHandler(async (req, res) => {
  const configuracion = await negociosService.obtenerConfiguracion(req.usuario.negocio_id);
  return response.success(res, configuracion);
});

// Solo el admin del negocio (o super_admin) puede CAMBIAR la configuración.
export const actualizarMiConfiguracion = asyncHandler(async (req, res) => {
  const configuracion = await negociosService.actualizarConfiguracion(req.usuario.negocio_id, req.body);
  return response.success(res, configuracion, 'Configuración actualizada');
});

export const limpiarPedidosYCaja = asyncHandler(async (req, res) => {
  const resultado = await negociosService.limpiarPedidosYCaja(req.usuario.negocio_id, {
    reiniciarClientes: !!req.body.reiniciar_clientes,
  });
  return response.success(res, resultado, 'Pedidos y caja limpiados correctamente');
});

import { asyncHandler } from '../../middlewares/errorHandler.middleware.js';
import { registrarAuditoria } from '../../utils/auditoria.js';
import { response } from '../../utils/response.utils.js';
import { AppError } from '../../utils/AppError.js';
import * as pedidosService from './pedidos.service.js';

export const crear = asyncHandler(async (req, res) => {
  const { mesa_id, referencia_mesa, cliente_id, observaciones, items, barra_destino_id } = req.body;
  // El origen lo decide el backend según quién está autenticado, no el
  // cliente — así nadie puede falsear si el pedido vino de un mesero o
  // se hizo directo en la barra.
  const origen = req.usuario.rol === 'barra' ? 'barra' : 'mesero';
  const pedido = await pedidosService.crearPedido({
    negocioId: req.usuario.negocio_id,
    meseroId: req.usuario.id,
    mesaId: mesa_id,
    referenciaMesa: referencia_mesa,
    clienteId: cliente_id,
    observaciones,
    items,
    origen,
    barraDestinoId: barra_destino_id,
  });
  await registrarAuditoria({
    negocioId: req.usuario.negocio_id,
    usuarioId: req.usuario.id,
    accion: 'crear_pedido',
    entidad: 'pedido',
    entidadId: pedido.id,
    detalle: { origen },
  });
  return response.created(res, pedido, origen === 'barra' ? 'Pedido creado en barra' : 'Pedido creado y enviado a barra');
});

export const listar = asyncHandler(async (req, res) => {
  const { estado, mesa_id, mesero_id, origen, barra_id, desde, hasta } = req.query;
  const pedidos = await pedidosService.listarPedidos({
    negocioId: req.usuario.negocio_id,
    estado,
    mesaId: mesa_id,
    meseroId: mesero_id,
    origen,
    barraId: barra_id,
    desde,
    hasta,
  });
  return response.success(res, pedidos);
});

export const obtener = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.obtenerPedidoPorId(req.params.id);
  return response.success(res, pedido);
});

export const agregarItems = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.agregarItems(req.params.id, req.body.items, req.body.barra_destino_id);
  return response.success(res, pedido, 'Productos agregados al pedido');
});

export const anular = asyncHandler(async (req, res) => {
  const { barra_id } = req.body;
  if (!barra_id) throw new AppError('Falta indicar la barra que está anulando.', 422);
  const resultado = await pedidosService.anularPedido(req.params.id, barra_id);
  await registrarAuditoria({
    negocioId: req.usuario.negocio_id,
    usuarioId: req.usuario.id,
    accion: 'anular_pedido_parcial',
    entidad: 'pedido',
    entidadId: req.params.id,
    detalle: { barra_id, productos_anulados: resultado.productosAnulados },
  });
  return response.success(res, resultado, `${resultado.productosAnulados} producto(s) anulado(s)`);
});

export const avanzarEstadoPorBarra = asyncHandler(async (req, res) => {
  const { barra_id } = req.body;
  if (!barra_id) throw new AppError('Falta indicar la barra.', 422);
  const pedido = await pedidosService.avanzarEstadoPorBarra(req.params.id, barra_id);
  return response.success(res, pedido, 'Estado actualizado');
});

export const quitarItem = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.quitarItem(req.params.id, req.params.itemId);
  return response.success(res, pedido, 'Producto retirado del pedido');
});

export const actualizarEstadoItem = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.actualizarEstadoItem(req.params.itemId, req.body.estado);
  return response.success(res, pedido, 'Estado actualizado');
});

export const cambiarMesa = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.cambiarMesaPedido(req.params.id, req.body.mesa_id);
  return response.success(res, pedido, 'Mesa actualizada');
});

export const combinarMesas = asyncHandler(async (req, res) => {
  const resultado = await pedidosService.combinarMesas(req.body.mesa_principal_id, req.body.mesas_secundarias_ids);
  return response.success(res, resultado, 'Mesas combinadas');
});

export const cerrarCuenta = asyncHandler(async (req, res) => {
  const { pagos, propina, descuento, barra_id, nota } = req.body;
  const pedido = await pedidosService.cerrarCuenta(req.params.id, { pagos, propina, descuento, barraId: barra_id, nota });
  await registrarAuditoria({
    negocioId: req.usuario.negocio_id,
    usuarioId: req.usuario.id,
    accion: 'cerrar_cuenta',
    entidad: 'pedido',
    entidadId: pedido.id,
    detalle: { total: pedido.total, metodos: pagos?.map((p) => p.metodo) },
  });
  return response.success(res, pedido, 'Cuenta cerrada');
});

export const registrarDevolucion = asyncHandler(async (req, res) => {
  const { barra_id, motivo } = req.body;
  if (!barra_id) throw new AppError('Falta indicar la barra.', 422);
  const resultado = await pedidosService.registrarDevolucion(req.params.id, barra_id, motivo);
  await registrarAuditoria({
    negocioId: req.usuario.negocio_id,
    usuarioId: req.usuario.id,
    accion: 'registrar_devolucion',
    entidad: 'pedido',
    entidadId: req.params.id,
    detalle: { barra_id, motivo, productos_devueltos: resultado.productosDevueltos },
  });
  return response.success(res, resultado, `${resultado.productosDevueltos} producto(s) devuelto(s) al inventario`);
});

export const verificarPago = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.verificarPago(req.params.id, req.usuario.id);
  return response.success(res, pedido, 'Pago confirmado');
});

export const pagosPorVerificar = asyncHandler(async (req, res) => {
  const pedidos = await pedidosService.pagosPorVerificar(req.usuario.negocio_id, req.query.barra_id || null);
  return response.success(res, pedidos);
});

export const dividirCuenta = asyncHandler(async (req, res) => {
  const pedidos = await pedidosService.dividirCuenta(req.params.id, req.body.grupos);
  return response.success(res, pedidos, 'Cuenta dividida');
});

export const historialPorMesa = asyncHandler(async (req, res) => {
  const historial = await pedidosService.historialPorMesa(req.params.mesaId);
  return response.success(res, historial);
});

export const pedidosPorBarra = asyncHandler(async (req, res) => {
  const pedidos = await pedidosService.pedidosPorBarra(req.usuario.negocio_id, req.params.barraId);
  return response.success(res, pedidos);
});

import api from './api.js';

export const pedidosApi = {
  listar: (params) => api.get('/pedidos', { params }).then((r) => r.data),
  obtener: (id) => api.get(`/pedidos/${id}`).then((r) => r.data),
  crear: (payload) => api.post('/pedidos', payload).then((r) => r.data),
  agregarItems: (id, items, barra_destino_id) => api.post(`/pedidos/${id}/items`, { items, barra_destino_id }).then((r) => r.data),
  quitarItem: (id, itemId) => api.delete(`/pedidos/${id}/items/${itemId}`).then((r) => r.data),
  anular: (id, barraId) => api.post(`/pedidos/${id}/anular`, { barra_id: barraId }).then((r) => r.data),
  avanzarPorBarra: (id, barraId) => api.patch(`/pedidos/${id}/avanzar-por-barra`, { barra_id: barraId }).then((r) => r.data),
  actualizarEstadoItem: (itemId, estado) => api.patch(`/pedidos/items/${itemId}/estado`, { estado }).then((r) => r.data),
  cambiarMesa: (id, mesa_id) => api.patch(`/pedidos/${id}/mesa`, { mesa_id }).then((r) => r.data),
  combinarMesas: (mesa_principal_id, mesas_secundarias_ids) =>
    api.post('/pedidos/combinar-mesas', { mesa_principal_id, mesas_secundarias_ids }).then((r) => r.data),
  cerrarCuenta: (id, payload) => api.post(`/pedidos/${id}/cerrar-cuenta`, payload).then((r) => r.data),
  dividirCuenta: (id, grupos) => api.post(`/pedidos/${id}/dividir`, { grupos }).then((r) => r.data),
  historialPorMesa: (mesaId) => api.get(`/pedidos/mesa/${mesaId}/historial`).then((r) => r.data),
  porBarra: (barraId) => api.get(`/pedidos/barra/${barraId}`).then((r) => r.data),
  pagosPorVerificar: (barraId) => api.get('/pedidos/pagos-por-verificar', { params: { barra_id: barraId } }).then((r) => r.data),
  verificarPago: (id) => api.patch(`/pedidos/${id}/verificar-pago`).then((r) => r.data),
  devolucion: (id, barraId, motivo) => api.post(`/pedidos/${id}/devolucion`, { barra_id: barraId, motivo }).then((r) => r.data),
};

export const mesasApi = {
  listar: () => api.get('/mesas').then((r) => r.data),
  crear: (payload) => api.post('/mesas', payload).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/mesas/${id}`, payload).then((r) => r.data),
  eliminar: (id) => api.delete(`/mesas/${id}`),
};

export const productosApi = {
  listar: (params) => api.get('/productos', { params }).then((r) => r.data),
  crear: (payload) => api.post('/productos', payload).then((r) => r.data),
  importarMasivo: (filas) => api.post('/productos/importar-masivo', { filas }).then((r) => r.data),
  importarRecetas: (filas) => api.post('/productos/importar-recetas', { filas }).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/productos/${id}`, payload).then((r) => r.data),
  duplicar: (id) => api.post(`/productos/${id}/duplicar`).then((r) => r.data),
  eliminar: (id) => api.delete(`/productos/${id}`),
  eliminarPermanente: (id) => api.delete(`/productos/${id}/permanente`),
  categorias: () => api.get('/productos/categorias/todas').then((r) => r.data),
  crearCategoria: (payload) => api.post('/productos/categorias', payload).then((r) => r.data),
  eliminarCategoria: (id) => api.delete(`/productos/categorias/${id}`),
  insumos: () => api.get('/productos/insumos/todos').then((r) => r.data),
  crearInsumo: (payload) => api.post('/productos/insumos', payload).then((r) => r.data),
  eliminarInsumo: (id) => api.delete(`/productos/insumos/${id}`).then((r) => r.data),
  asignarStockBarra: (id, payload) => api.post(`/productos/insumos/${id}/asignar-stock`, payload).then((r) => r.data),
  establecerStockBarra: (id, payload) => api.post(`/productos/insumos/${id}/establecer-stock`, payload).then((r) => r.data),
};

export const movimientosApi = {
  crear: (payload) => api.post('/productos/movimientos', payload).then((r) => r.data),
  pendientes: (barraId) => api.get('/productos/movimientos/pendientes', { params: { barra_id: barraId } }).then((r) => r.data),
  enviados: (barraId) => api.get('/productos/movimientos/enviados', { params: { barra_id: barraId } }).then((r) => r.data),
  aceptar: (id) => api.patch(`/productos/movimientos/${id}/aceptar`).then((r) => r.data),
  rechazar: (id) => api.patch(`/productos/movimientos/${id}/rechazar`).then((r) => r.data),
  historial: (params) => api.get('/productos/movimientos/historial', { params }).then((r) => r.data),
};

export const cajaApi = {
  actual: (barraId) => api.get('/caja/actual', { params: { barra_id: barraId } }).then((r) => r.data),
  abiertas: () => api.get('/caja/abiertas').then((r) => r.data),
  resumen: (barraId) => api.get('/caja/resumen', { params: { barra_id: barraId } }).then((r) => r.data),
  historial: (params) => api.get('/caja/historial', { params }).then((r) => r.data),
  abrir: (barraId, monto_inicial) => api.post('/caja/abrir', { barra_id: barraId, monto_inicial }).then((r) => r.data),
  movimiento: (barraId, payload) => api.post('/caja/movimiento', { ...payload, barra_id: barraId }).then((r) => r.data),
  cerrar: (barraId, monto_final_real, conteoFisico = []) =>
    api.post('/caja/cerrar', { barra_id: barraId, monto_final_real, conteo_fisico: conteoFisico }).then((r) => r.data),
  insumosParaConteo: (barraId) => api.get('/caja/insumos-para-conteo', { params: { barra_id: barraId } }).then((r) => r.data),
  reporte: (cajaId) => api.get(`/caja/${cajaId}/reporte`).then((r) => r.data),
  marcarRevisado: (cajaId) => api.patch(`/caja/${cajaId}/revisar`).then((r) => r.data),
  pendientesRevision: () => api.get('/caja/pendientes-revision').then((r) => r.data),
};

export const clientesApi = {
  listar: (q) => api.get('/clientes', { params: { q } }).then((r) => r.data),
  obtener: (id) => api.get(`/clientes/${id}`).then((r) => r.data),
  crear: (payload) => api.post('/clientes', payload).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/clientes/${id}`, payload).then((r) => r.data),
  historial: (id) => api.get(`/clientes/${id}/historial`).then((r) => r.data),
  ranking: () => api.get('/clientes/ranking').then((r) => r.data),
  cumpleanos: () => api.get('/clientes/cumpleanos').then((r) => r.data),
};

export const dashboardApi = {
  resumen: (filtros = {}) => api.get('/dashboard/resumen', { params: filtros }).then((r) => r.data),
};

export const usuariosApi = {
  perfil: () => api.get('/usuarios/perfil').then((r) => r.data),
  listar: (negocio_id) => api.get('/usuarios', { params: { negocio_id } }).then((r) => r.data),
  crear: (payload) => api.post('/usuarios', payload).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/usuarios/${id}`, payload).then((r) => r.data),
  resetearPassword: (id, password) => api.patch(`/usuarios/${id}/resetear-password`, { password }).then((r) => r.data),
  desactivar: (id) => api.delete(`/usuarios/${id}`),
  eliminarPermanente: (id) => api.delete(`/usuarios/${id}/permanente`),
};

export const negociosApi = {
  listar: () => api.get('/negocios').then((r) => r.data),
  crear: (payload) => api.post('/negocios', payload).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/negocios/${id}`, payload).then((r) => r.data),
  suspender: (id) => api.patch(`/negocios/${id}/suspender`).then((r) => r.data),
  activar: (id) => api.patch(`/negocios/${id}/activar`).then((r) => r.data),
  marcarPago: (id, pagado, pagado_hasta) => api.patch(`/negocios/${id}/pago`, { pagado, pagado_hasta }).then((r) => r.data),
  eliminar: (id) => api.delete(`/negocios/${id}`),
  estadisticas: () => api.get('/negocios/estadisticas').then((r) => r.data),
  miConfiguracion: () => api.get('/negocios/configuracion').then((r) => r.data),
  actualizarMiConfiguracion: (payload) => api.patch('/negocios/configuracion', payload).then((r) => r.data),
  limpiarPedidos: (reiniciarClientes) => api.post('/negocios/limpiar-pedidos', { reiniciar_clientes: reiniciarClientes }).then((r) => r.data),
};

export const barrasApi = {
  listar: (negocioId) => api.get('/barras', { params: negocioId ? { negocio_id: negocioId } : {} }).then((r) => r.data),
  crear: (payload) => api.post('/barras', payload).then((r) => r.data),
  actualizar: (id, payload) => api.patch(`/barras/${id}`, payload).then((r) => r.data),
  eliminar: (id) => api.delete(`/barras/${id}`),
  estadisticas: (id, filtros = {}) => api.get(`/barras/${id}/estadisticas`, { params: filtros }).then((r) => r.data),
};

export const notificacionesApi = {
  listar: () => api.get('/notificaciones').then((r) => r.data),
  marcarLeida: (id) => api.patch(`/notificaciones/${id}/leida`),
  marcarTodasLeidas: () => api.patch('/notificaciones/leer-todas'),
};

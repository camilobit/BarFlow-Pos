import { supabaseAdmin } from '../config/supabase.js';

/**
 * Registra una acción en la tabla de auditoría. No lanza errores hacia
 * arriba (una falla de auditoría nunca debe romper la operación principal).
 */
export async function registrarAuditoria({ negocioId, usuarioId, accion, entidad, entidadId, detalle }) {
  try {
    await supabaseAdmin.from('auditoria').insert({
      negocio_id: negocioId,
      usuario_id: usuarioId,
      accion,
      entidad,
      entidad_id: entidadId,
      detalle: detalle || {},
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auditoria] no se pudo registrar:', err.message);
  }
}

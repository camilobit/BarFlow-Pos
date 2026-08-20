// El "día operativo" de un bar no coincide con el día del calendario: un
// sábado en la noche sigue siendo "sábado" hasta que cierra en la
// madrugada del domingo. Esta función traduce "quiero ver el sábado 15"
// en el rango de tiempo REAL que hay que consultar: desde las 6pm del
// sábado hasta las 8am del domingo (o lo que el negocio haya configurado
// como su horario de turno).
//
// fechaISO: 'YYYY-MM-DD' (el día que el usuario eligió en el filtro)
// negocioConfig: { turno_inicio: 'HH:MM', turno_fin: 'HH:MM' }
export function rangoDeTurno(fechaISO, negocioConfig) {
  const turnoInicio = negocioConfig?.turno_inicio || '18:00';
  const turnoFin = negocioConfig?.turno_fin || '08:00';

  const desde = `${fechaISO}T${turnoInicio}:00`;

  // El cierre cae en el día calendario SIGUIENTE (la madrugada del
  // domingo, para un turno que arrancó el sábado).
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const fechaSiguiente = new Date(anio, mes - 1, dia + 1);
  const fechaSiguienteISO = fechaSiguiente.toISOString().slice(0, 10);
  const hasta = `${fechaSiguienteISO}T${turnoFin}:00`;

  return { desde, hasta };
}

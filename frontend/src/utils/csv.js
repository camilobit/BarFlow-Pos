// Utilidades mínimas de CSV — se abren y editan directamente en Excel,
// sin necesidad de agregar una librería de parseo de .xlsx al proyecto.

// Parsea un CSV simple (separado por comas, primera fila = encabezados)
// a un arreglo de objetos. Soporta valores entre comillas con comas adentro.
export function parseCSV(texto) {
  const lineas = texto.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lineas.length === 0) return [];

  const partirLinea = (linea) => {
    const valores = [];
    let actual = '';
    let entreComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const char = linea[i];
      if (char === '"') {
        entreComillas = !entreComillas;
      } else if (char === ',' && !entreComillas) {
        valores.push(actual.trim());
        actual = '';
      } else {
        actual += char;
      }
    }
    valores.push(actual.trim());
    return valores;
  };

  const encabezados = partirLinea(lineas[0]).map((h) => h.toLowerCase().trim());
  return lineas.slice(1).map((linea) => {
    const valores = partirLinea(linea);
    const fila = {};
    encabezados.forEach((h, idx) => { fila[h] = valores[idx] ?? ''; });
    return fila;
  });
}

// Convierte un arreglo de objetos a texto CSV (con encabezados en la
// primera fila) y dispara la descarga en el navegador.
export function descargarCSV(nombreArchivo, filas) {
  if (!filas.length) return;
  const encabezados = Object.keys(filas[0]);
  const escapar = (valor) => {
    const texto = String(valor ?? '');
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const lineas = [
    encabezados.join(','),
    ...filas.map((fila) => encabezados.map((h) => escapar(fila[h])).join(',')),
  ];
  // \uFEFF al inicio: para que Excel detecte UTF-8 y no dañe tildes/ñ
  const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

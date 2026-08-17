// Consulta los feriados de Argentina usando una API pública y gratuita
// (no requiere clave ni registro). Guardamos en memoria los feriados de
// cada año ya consultado para no pedirlos de nuevo todo el tiempo.
const cache = {};

async function obtenerFeriados(anio) {
  if (cache[anio]) return cache[anio];
  try {
    const res = await fetch(`https://api.argentinadatos.com/v1/feriados/${anio}`);
    if (!res.ok) throw new Error('respuesta no ok');
    const data = await res.json(); // [{ fecha: '2026-01-01', tipo, nombre }, ...]
    cache[anio] = data;
    return data;
  } catch {
    // Si falla la consulta (sin internet, API caída, etc.) simplemente
    // no mostramos el aviso de feriado, no rompemos nada.
    return [];
  }
}

// fecha en formato 'YYYY-MM-DD'. Devuelve { fecha, tipo, nombre } o null.
export async function esFeriado(fecha) {
  if (!fecha) return null;
  const anio = fecha.slice(0, 4);
  const feriados = await obtenerFeriados(anio);
  return feriados.find((f) => f.fecha === fecha) || null;
}

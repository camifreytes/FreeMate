import { horaAFranja, franjaAHora, FRANJAS_POR_DIA, sumarDias } from './tiempo';

// Horario razonable para sugerir juntadas (08:00 a 24:00)
const FRANJA_MIN = 8 * 4; // 08:00
const FRANJA_MAX = 24 * 4; // 24:00

// Calcula huecos libres para UNA fecha concreta ('YYYY-MM-DD')
function huecosDeFecha(todosBloques, fechaISO, diaSemana, duracionMinFranjas) {
  const ocupado = new Array(FRANJAS_POR_DIA).fill(false);

  for (const b of todosBloques) {
    if (!bloqueAplicaEnFecha(b, diaSemana, fechaISO)) continue;
    const desde = horaAFranja(b.hora_desde);
    const hasta = horaAFranja(b.hora_hasta);
    for (let f = desde; f < hasta; f++) {
      if (f >= 0 && f < FRANJAS_POR_DIA) ocupado[f] = true;
    }
  }

  const huecos = [];
  let inicio = null;
  for (let f = FRANJA_MIN; f <= FRANJA_MAX; f++) {
    const libre = f < FRANJA_MAX && !ocupado[f];
    if (libre && inicio === null) {
      inicio = f;
    } else if (!libre && inicio !== null) {
      const largo = f - inicio;
      if (largo >= duracionMinFranjas) {
        huecos.push({
          fecha: fechaISO,
          dia: diaSemana,
          desde: franjaAHora(inicio),
          hasta: franjaAHora(f),
          largoFranjas: largo,
        });
      }
      inicio = null;
    }
  }
  return huecos;
}

// Busca huecos libres desde HOY hasta "diasAdelante" días (por defecto un mes).
// Devuelve una lista de { fecha, dia, huecos: [...] }, día por día, en orden.
export function calcularHuecos(todosBloques, _ignorado, duracionMinFranjas = 8, diasAdelante = 30) {
  const hoyISO = new Date().toISOString().slice(0, 10);
  const resultado = [];

  for (let i = 0; i <= diasAdelante; i++) {
    const fechaISO = sumarDias(hoyISO, i);
    const jsDay = new Date(fechaISO + 'T00:00:00').getDay();
    const diaSemana = jsDay === 0 ? 6 : jsDay - 1;
    const huecos = huecosDeFecha(todosBloques, fechaISO, diaSemana, duracionMinFranjas);
    if (huecos.length > 0) {
      resultado.push({ fecha: fechaISO, dia: diaSemana, huecos });
    }
  }

  return resultado;
}

function bloqueAplicaEnFecha(b, dia, fechaColumna) {
  if (b.tipo === 'permanente') {
    return b.dia_semana === dia;
  }
  if (b.tipo === 'unico' && b.fecha) {
    return String(b.fecha).slice(0, 10) === fechaColumna;
  }
  return false;
}

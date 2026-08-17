export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGO = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

// dia_semana en la base: 0=Lunes ... 6=Domingo (nuestro orden)
// Cada día tiene 96 franjas de 15 min (24h * 4)
export const FRANJAS_POR_DIA = 96;
export const MINUTOS_POR_FRANJA = 15;

export function franjaAHora(franja) {
  const totalMin = franja * MINUTOS_POR_FRANJA;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function horaAFranja(hora) {
  const [h, m] = hora.split(':').map(Number);
  return Math.floor((h * 60 + m) / MINUTOS_POR_FRANJA);
}

// Paleta pastel + degradés blanco/negro, estilo pedido
export const COLORES = [
  { nombre: 'Durazno', valor: '#F2C6B4' },
  { nombre: 'Lavanda', valor: '#CDC2E8' },
  { nombre: 'Menta', valor: '#B8DECA' },
  { nombre: 'Cielo', valor: '#B4CFE8' },
  { nombre: 'Arena', valor: '#E8DCC0' },
  { nombre: 'Rosa', valor: '#E8C2D2' },
  { nombre: 'Gris claro', valor: 'linear-gradient(135deg,#e8e8ea,#b8babf)' },
  { nombre: 'Gris medio', valor: 'linear-gradient(135deg,#8a8c92,#5a5c62)' },
  { nombre: 'Grafito', valor: 'linear-gradient(135deg,#3a3c42,#1c1e22)' },
];

export function esColorOscuro(valor) {
  // Para decidir color de texto encima del bloque
  if (valor.includes('gradient')) {
    return valor.includes('#3a3c42') || valor.includes('#5a5c62');
  }
  const hex = valor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luz = (r * 299 + g * 587 + b * 114) / 1000;
  return luz < 140;
}

// ---------- Semanas reales (para la grilla con navegación) ----------

// Devuelve el lunes (en formato 'YYYY-MM-DD') de la semana que contiene "fecha"
export function lunesDeSemana(fecha = new Date()) {
  const d = new Date(fecha);
  const jsDay = d.getDay(); // 0=domingo
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Suma (o resta) días a una fecha 'YYYY-MM-DD' y devuelve otra 'YYYY-MM-DD'
export function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Texto lindo tipo "11 al 17 de agosto"
export function rangoSemanaTexto(lunesISO) {
  const domingoISO = sumarDias(lunesISO, 6);
  const lunes = new Date(lunesISO + 'T00:00:00');
  const domingo = new Date(domingoISO + 'T00:00:00');
  const mismomes = lunes.getMonth() === domingo.getMonth();
  const mesTxt = domingo.toLocaleDateString('es-AR', { month: 'long' });
  if (mismomes) {
    return `${lunes.getDate()} al ${domingo.getDate()} de ${mesTxt}`;
  }
  const mesLunes = lunes.toLocaleDateString('es-AR', { month: 'short' });
  return `${lunes.getDate()} ${mesLunes} – ${domingo.getDate()} ${mesTxt}`;
}

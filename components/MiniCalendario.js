'use client';

import { lunesDeSemana, sumarDias } from '../lib/tiempo';

const DIAS_MINI = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Mini calendario compacto que va ARRIBA de la grilla.
// - La semana en la que estás parada se resalta con tu color de fondo.
// - El día de hoy va en un círculo blanco.
// - Tocar un día te lleva a la semana Y al día de ese día en la grilla.
export default function MiniCalendario({ weekStart, onElegirDia }) {
  const base = new Date(weekStart + 'T00:00:00');
  const anio = base.getFullYear();
  const mes = base.getMonth();
  const hoyISO = new Date().toISOString().slice(0, 10);

  const primeroDelMes = new Date(anio, mes, 1);
  const primerLunes = lunesDeSemana(primeroDelMes);

  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const fechaISO = sumarDias(primerLunes, i);
    const d = new Date(fechaISO + 'T00:00:00');
    celdas.push({
      fechaISO,
      numero: d.getDate(),
      esDeEsteMes: d.getMonth() === mes,
      esHoy: fechaISO === hoyISO,
      enSemanaActiva: fechaISO >= weekStart && fechaISO <= sumarDias(weekStart, 6),
    });
  }
  let ultimoDelMes = 0;
  celdas.forEach((c, i) => {
    if (c.esDeEsteMes) ultimoDelMes = i;
  });
  const filasNecesarias = Math.ceil((ultimoDelMes + 1) / 7);
  const visibles = celdas.slice(0, filasNecesarias * 7);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '0.5px solid var(--line)',
        borderRadius: '16px',
        padding: '12px 14px',
        maxWidth: '300px',
        margin: '0 auto 16px',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', textTransform: 'capitalize' }}>
        {MESES[mes]} {anio}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '2px' }}>
        {DIAS_MINI.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {visibles.map((c) => {
          let fondo = 'transparent';
          let colorTexto = c.esDeEsteMes ? 'var(--text)' : 'var(--text-dim)';
          let borde = 'none';
          if (c.esHoy) {
            fondo = '#ffffff';
            colorTexto = '#1a1a1a';
          } else if (c.enSemanaActiva) {
            fondo = 'var(--bg)';
            borde = '1px solid var(--text)';
          }
          return (
            <button
              key={c.fechaISO}
              onClick={() => onElegirDia(c.fechaISO)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                borderRadius: '50%',
                border: borde,
                background: fondo,
                color: colorTexto,
                opacity: c.esDeEsteMes ? 1 : 0.35,
                fontWeight: c.esHoy ? 700 : c.enSemanaActiva ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {c.numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  DIAS,
  FRANJAS_POR_DIA,
  franjaAHora,
  horaAFranja,
  esColorOscuro,
  sumarDias,
  rangoSemanaTexto,
} from '../lib/tiempo';
import { esFeriado } from '../lib/feriados';

const ALTO_FRANJA = 14;
const HORA_INICIO_SCROLL = 7;

export default function Grilla({
  misBloques,
  onNuevoRango,
  onEditarBloque,
  soloLectura = false,
  weekStart,
  onCambiarSemana,
  mostrarNav = false,
  diaEnfocado = null,
}) {
  const [seleccion, setSeleccion] = useState(null);
  const arrastrando = useRef(false);
  const inicioRef = useRef(null);
  const scrollRef = useRef(null);
  const [diaActivo, setDiaActivo] = useState(0);
  const [esMovil, setEsMovil] = useState(false);
  const [feriados, setFeriados] = useState({}); // { 'YYYY-MM-DD': {nombre,...} }
  const touchTimer = useRef(null); // para distinguir scroll de "pintar" en celular
  const touchInicio = useRef(null);

  // Fecha real de cada columna (0=Lunes .. 6=Domingo) de la semana mostrada
  const fechasSemana = Array.from({ length: 7 }).map((_, i) => sumarDias(weekStart, i));
  const hoyISO = new Date().toISOString().slice(0, 10);
  const lunesDeHoy = sumarDias(hoyISO, -((new Date(hoyISO + 'T00:00:00').getDay() + 6) % 7));

  useEffect(() => {
    const check = () => setEsMovil(window.innerWidth < 720);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HORA_INICIO_SCROLL * 4 * ALTO_FRANJA;
    }
  }, []);

  // Si el mini calendario pide enfocar un día (0-6), saltar a ese día en celular
  useEffect(() => {
    if (diaEnfocado !== null && diaEnfocado >= 0 && diaEnfocado <= 6) {
      setDiaActivo(diaEnfocado);
    }
  }, [diaEnfocado]);

  // Consultar feriados de las 7 fechas visibles cada vez que cambia la semana
  useEffect(() => {
    let vigente = true;
    Promise.all(fechasSemana.map((f) => esFeriado(f))).then((resultados) => {
      if (!vigente) return;
      const mapa = {};
      fechasSemana.forEach((f, i) => {
        if (resultados[i]) mapa[f] = resultados[i];
      });
      setFeriados(mapa);
    });
    return () => {
      vigente = false;
    };
  }, [weekStart]);

  function franjaDesdeEvento(e, diaIdx) {
    const cont = document.getElementById(`col-${diaIdx}`);
    if (!cont) return null;
    const rect = cont.getBoundingClientRect();
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    let f = Math.floor(y / ALTO_FRANJA);
    if (f < 0) f = 0;
    if (f > FRANJAS_POR_DIA) f = FRANJAS_POR_DIA;
    return f;
  }

  function empezar(e, diaIdx) {
    if (soloLectura) return;
    const f = franjaDesdeEvento(e, diaIdx);
    if (f === null) return;
    arrastrando.current = true;
    inicioRef.current = { dia: diaIdx, franja: f };
    setSeleccion({ dia: diaIdx, desde: f, hasta: f + 1 });
  }

  // ---- Táctil (celular): distinguir "scroll" de "pintar" ----
  // Al tocar, esperamos un ratito. Si el dedo se mueve (scroll) antes de ese
  // tiempo, cancelamos. Si se mantiene quieto, ahí sí empezamos a pintar.
  function touchStart(e, diaIdx) {
    if (soloLectura) return;
    const t = e.touches[0];
    touchInicio.current = { x: t.clientX, y: t.clientY };
    touchTimer.current = setTimeout(() => {
      empezar(e, diaIdx);
    }, 220);
  }

  function touchMove(e, diaIdx) {
    // Si todavía no empezamos a pintar y el dedo se movió, es scroll: cancelar
    if (!arrastrando.current) {
      if (touchInicio.current) {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchInicio.current.x);
        const dy = Math.abs(t.clientY - touchInicio.current.y);
        if (dx > 8 || dy > 8) {
          clearTimeout(touchTimer.current);
          touchInicio.current = null;
        }
      }
      return;
    }
    e.preventDefault(); // ya estamos pintando: frenar el scroll
    mover(e, diaIdx);
  }

  function touchEnd() {
    clearTimeout(touchTimer.current);
    touchInicio.current = null;
    soltar();
  }

  function empezarMouse(e, diaIdx) {
    empezar(e, diaIdx);
  }

  function mover(e, diaIdx) {
    if (!arrastrando.current || !inicioRef.current) return;
    if (inicioRef.current.dia !== diaIdx) return;
    const f = franjaDesdeEvento(e, diaIdx);
    if (f === null) return;
    const ini = inicioRef.current.franja;
    const desde = Math.min(ini, f);
    const hasta = Math.max(ini, f) + 1;
    setSeleccion({ dia: diaIdx, desde, hasta });
  }

  function soltar() {
    if (!arrastrando.current || !seleccion) {
      arrastrando.current = false;
      return;
    }
    arrastrando.current = false;
    onNuevoRango({
      dia: seleccion.dia,
      fecha: fechasSemana[seleccion.dia],
      desde: franjaAHora(seleccion.desde),
      hasta: franjaAHora(seleccion.hasta),
    });
    setSeleccion(null);
  }

  const diasVisibles = esMovil ? [diaActivo] : [0, 1, 2, 3, 4, 5, 6];

  return (
    <div style={{ userSelect: 'none' }}>
      {mostrarNav && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            gap: '10px',
          }}
        >
          <button
            onClick={() => onCambiarSemana(-7)}
            aria-label="Semana anterior"
            style={navBtnStyle}
          >
            ←
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
              {rangoSemanaTexto(weekStart)}
            </div>
            {weekStart !== lunesDeHoy && (
              <button
                onClick={() => onCambiarSemana('hoy')}
                style={{ fontSize: '12px', color: 'var(--text-dim)', textDecoration: 'underline', marginTop: '2px' }}
              >
                Volver a hoy
              </button>
            )}
          </div>
          <button
            onClick={() => onCambiarSemana(7)}
            aria-label="Semana siguiente"
            style={navBtnStyle}
          >
            →
          </button>
        </div>
      )}

      {esMovil && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
          {DIAS.map((d, i) => (
            <button
              key={i}
              onClick={() => setDiaActivo(i)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                background: diaActivo === i ? 'var(--text)' : 'var(--card)',
                color: diaActivo === i ? 'var(--bg)' : 'var(--text)',
                fontWeight: 500,
                fontSize: '14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          background: 'var(--card)',
          border: '0.5px solid var(--line)',
          borderRadius: '18px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex' }}>
          <div
            style={{
              width: '52px',
              flexShrink: 0,
              height: '48px',
              borderRight: '0.5px solid var(--line)',
              borderBottom: '0.5px solid var(--line)',
            }}
          />
          {diasVisibles.map((diaIdx) => {
            const fecha = fechasSemana[diaIdx];
            const esHoy = fecha === hoyISO;
            const feriado = feriados[fecha];
            const numeroDia = new Date(fecha + 'T00:00:00').getDate();
            return (
              <div
                key={diaIdx}
                title={feriado ? `Feriado: ${feriado.nombre}` : undefined}
                style={{
                  flex: 1,
                  minWidth: esMovil ? '100%' : '0',
                  height: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRight: '0.5px solid var(--line)',
                  borderBottom: '0.5px solid var(--line)',
                  background: esHoy ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                <span>
                  {DIAS[diaIdx]} {feriado && '🎉'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: esHoy ? 700 : 400,
                    color: esHoy ? 'var(--text)' : 'var(--text-dim)',
                  }}
                >
                  {numeroDia}
                </span>
              </div>
            );
          })}
        </div>

        <div
          ref={scrollRef}
          style={{ display: 'flex', maxHeight: '600px', overflowY: 'auto' }}
          onMouseUp={soltar}
          onMouseLeave={() => arrastrando.current && soltar()}
          onTouchEnd={touchEnd}
        >
          <div style={{ width: '52px', flexShrink: 0, borderRight: '0.5px solid var(--line)' }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                style={{
                  height: `${4 * ALTO_FRANJA}px`,
                  fontSize: '11px',
                  color: 'var(--text-dim)',
                  textAlign: 'right',
                  paddingRight: '8px',
                  paddingTop: '2px',
                  boxSizing: 'border-box',
                }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {diasVisibles.map((diaIdx) => (
            <div
              key={diaIdx}
              style={{
                flex: 1,
                minWidth: esMovil ? '100%' : '0',
                borderRight: '0.5px solid var(--line)',
                position: 'relative',
              }}
            >
              <div
                id={`col-${diaIdx}`}
                onMouseDown={(e) => empezarMouse(e, diaIdx)}
                onMouseMove={(e) => mover(e, diaIdx)}
                onTouchStart={(e) => touchStart(e, diaIdx)}
                onTouchMove={(e) => touchMove(e, diaIdx)}
                style={{
                  position: 'relative',
                  height: `${FRANJAS_POR_DIA * ALTO_FRANJA}px`,
                  cursor: soloLectura ? 'default' : 'crosshair',
                }}
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      top: `${h * 4 * ALTO_FRANJA}px`,
                      left: 0,
                      right: 0,
                      borderTop: '0.5px solid var(--line)',
                    }}
                  />
                ))}

                {misBloques
                  .filter((b) => bloqueEnFecha(b, diaIdx, fechasSemana[diaIdx]))
                  .map((b) => {
                    const desde = horaAFranja(b.hora_desde);
                    const hasta = horaAFranja(b.hora_hasta);
                    const oscuro = esColorOscuro(b.color || '#4A90D9');
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!soloLectura) onEditarBloque(b);
                        }}
                        style={{
                          position: 'absolute',
                          top: `${desde * ALTO_FRANJA}px`,
                          height: `${(hasta - desde) * ALTO_FRANJA - 2}px`,
                          left: '2px',
                          right: '2px',
                          background: b.color || '#4A90D9',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          fontSize: '11px',
                          color: oscuro ? '#fff' : '#1a1a1a',
                          overflow: 'hidden',
                          cursor: soloLectura ? 'default' : 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                      >
                        <div style={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {b.mostrar_detalle ? b.titulo || 'Ocupado' : 'Ocupado'}
                        </div>
                        <div style={{ opacity: 0.8, fontSize: '10px' }}>
                          {b.hora_desde.slice(0, 5)}–{b.hora_hasta.slice(0, 5)}
                        </div>
                      </div>
                    );
                  })}

                {seleccion && seleccion.dia === diaIdx && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${seleccion.desde * ALTO_FRANJA}px`,
                      height: `${(seleccion.hasta - seleccion.desde) * ALTO_FRANJA}px`,
                      left: '2px',
                      right: '2px',
                      background: 'rgba(255,255,255,0.25)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      borderRadius: '6px',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!soloLectura && (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '12px', textAlign: 'center' }}>
          Arrastrá sobre la grilla para marcar un horario ocupado. Tocá un bloque para editarlo.
        </p>
      )}
    </div>
  );
}

const navBtnStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '10px',
  background: 'var(--bg-soft)',
  border: '0.5px solid var(--line)',
  color: 'var(--text)',
  fontSize: '16px',
  flexShrink: 0,
};

// Un bloque "permanente" se repite cada semana en su día. Uno "único" solo
// aparece en la fecha exacta que le corresponde, no en cualquier semana.
function bloqueEnFecha(b, diaIdx, fechaColumna) {
  if (b.tipo === 'permanente') {
    return b.dia_semana === diaIdx;
  }
  if (b.tipo === 'unico' && b.fecha) {
    // Comparamos solo la parte YYYY-MM-DD, por si la fecha viene con hora/zona
    const fb = String(b.fecha).slice(0, 10);
    return fb === fechaColumna;
  }
  return false;
}

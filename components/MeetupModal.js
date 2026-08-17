'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '../lib/supabase-client';
import { DIAS_LARGO } from '../lib/tiempo';
import { esFeriado } from '../lib/feriados';

const TIPOS = ['Merienda', 'Almuerzo', 'Cena', 'Estudio', 'Salida', 'Otro'];

function proximaFecha(diaIdx) {
  const hoy = new Date();
  const jsDay = hoy.getDay();
  const nuestroHoy = jsDay === 0 ? 6 : jsDay - 1;
  let delta = diaIdx - nuestroHoy;
  if (delta < 0) delta += 7;
  const f = new Date(hoy);
  f.setDate(hoy.getDate() + delta);
  return f.toISOString().slice(0, 10);
}

export default function MeetupModal({ hueco, grupoId, userId, miembros, onClose, onGuardado }) {
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [lugar, setLugar] = useState('');
  const [desde, setDesde] = useState(hueco.desde.slice(0, 5));
  const [hasta, setHasta] = useState(hueco.hasta.slice(0, 5));
  const [fecha, setFecha] = useState(hueco.fecha || proximaFecha(hueco.dia));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState(false);
  const [meetupId, setMeetupId] = useState(null);
  const [feriado, setFeriado] = useState(null);
  const supabase = createClient();

  // Cada vez que cambia la fecha elegida, nos fijamos si es feriado
  useEffect(() => {
    let vigente = true;
    esFeriado(fecha).then((f) => {
      if (vigente) setFeriado(f);
    });
    return () => {
      vigente = false;
    };
  }, [fecha]);

  async function crear() {
    setLoading(true);
    setError('');

    const { data: meetup, error: errMeetup } = await supabase
      .from('meetups')
      .insert({
        grupo_id: grupoId,
        creado_por: userId,
        tipo,
        lugar: lugar.trim() || null,
        fecha,
        hora_desde: desde,
        hora_hasta: hasta,
      })
      .select()
      .single();

    if (errMeetup) {
      setError('No se pudo crear la juntada. Probá de nuevo.');
      setLoading(false);
      return;
    }

    // Invitar solo a los seleccionados (si vinieron del buscador), menos yo
    // A quiénes invitar (incluye al creador, que también vota, y arranca en "aceptada")
    const idsInvitar = hueco.invitados
      ? hueco.invitados
      : miembros.map((m) => m.perfil_id);

    const invitaciones = idsInvitar.map((pid) => ({
      meetup_id: meetup.id,
      perfil_id: pid,
      estado: pid === userId ? 'aceptada' : 'pendiente',
    }));

    if (invitaciones.length > 0) {
      await supabase.from('meetup_invitations').insert(invitaciones);

      // Notificar a los invitados
      try {
        const { data: perfil } = await supabase
          .from('profiles')
          .select('nombre')
          .eq('id', userId)
          .single();
        const fechaTxt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        await supabase.from('notificaciones').insert(
          idsInvitar.filter((pid) => pid !== userId).map((pid) => ({
            destinatario: pid,
            grupo_id: grupoId,
            tipo: 'invitacion',
            texto: `${perfil?.nombre || 'Alguien'} propuso una juntada: ${tipo}, ${fechaTxt} ${desde}. Entrá a responder.`,
          }))
        );
      } catch {}
    }

    setCreada(true);
    setMeetupId(meetup.id);
    setLoading(false);
  }

  function mensajeWhatsApp() {
    const link = `${window.location.origin}/grupo/${grupoId}?juntada=${meetupId}`;
    const lineas = [
      '\u{1F389} \u{A1}Te invitaron a una juntada!',
      '',
      'Ingres\u{E1} al link para m\u{E1}s informaci\u{F3}n y decir si ven\u{ED}s:',
      link,
    ];
    return `https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 100,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'var(--card)',
          border: '0.5px solid var(--line)',
          borderRadius: '24px',
          padding: '28px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        {creada ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
              ¡Juntada creada!
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
              Ya les llegó la notificación a los invitados dentro de la app. Si querés, avisales también por WhatsApp.
            </p>
            <a
              href={mensajeWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '15px',
                borderRadius: '14px',
                background: 'var(--ok)',
                color: 'var(--bg)',
                fontSize: '16px',
                fontWeight: 500,
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              Compartir por WhatsApp
            </a>
            <button
              onClick={onGuardado}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'transparent',
                color: 'var(--text)',
                border: '1.5px solid var(--text)',
                fontSize: '15px',
                fontWeight: 500,
              }}
            >
              Listo
            </button>
          </div>
        ) : (
        <>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          Armar juntada
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px' }}>
          {DIAS_LARGO[hueco.dia]} · todos libres
        </p>

        <label style={labelStyle}>Tipo</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              style={{
                padding: '9px 16px',
                borderRadius: '11px',
                background: tipo === t ? 'var(--text)' : 'var(--bg-soft)',
                color: tipo === t ? 'var(--bg)' : 'var(--text)',
                border: '0.5px solid var(--line)',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <label style={labelStyle}>¿Dónde?</label>
        <input
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder="Ej: En casa de Cami, el bar de siempre…"
          style={inputStyle}
        />

        <label style={labelStyle}>Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />

        {feriado && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: 'rgba(242, 198, 100, 0.12)',
              border: '0.5px solid rgba(242, 198, 100, 0.35)',
              borderRadius: '13px',
              padding: '12px 14px',
              marginTop: '-8px',
              marginBottom: '18px',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>🎉</span>
            <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
              Ese día es feriado: <strong>{feriado.nombre}</strong>. Puede que a algunos les cambien los planes.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Desde</label>
            <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hasta</label>
            <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}

        <button
          onClick={crear}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: '14px',
            background: 'var(--text)',
            color: 'var(--bg)',
            border: '1.5px solid var(--text)',
            fontSize: '16px',
            fontWeight: 500,
            opacity: loading ? 0.6 : 1,
            marginTop: '8px',
          }}
        >
          {loading ? 'Creando…' : 'Crear e invitar al grupo'}
        </button>
        </>
        )}
      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--text-dim)',
  marginBottom: '8px',
  fontWeight: 500,
};

const inputStyle = {
  width: '100%',
  padding: '13px 15px',
  borderRadius: '13px',
  border: '0.5px solid var(--line)',
  background: 'var(--bg-soft)',
  color: 'var(--text)',
  fontSize: '15px',
  outline: 'none',
  marginBottom: '18px',
  boxSizing: 'border-box',
};

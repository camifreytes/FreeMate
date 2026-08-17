'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase-client';
import { DIAS_LARGO } from '../lib/tiempo';
import BuscarLugaresModal from './BuscarLugaresModal';
import LugaresEncuentro from './LugaresEncuentro';

export default function MeetupsList({ juntadas, userId, grupoId, miembros, nombreMio, nombreGrupo }) {
  const router = useRouter();
  const supabase = createClient();
  const [procesando, setProcesando] = useState(null);
  const [inspeccionando, setInspeccionando] = useState(null);
  const [mostrandoLugares, setMostrandoLugares] = useState(null);
  const [buscarLugares, setBuscarLugares] = useState(null);
  const [resaltada, setResaltada] = useState(null);

  // Si llegaste con ?juntada=xxx, hacer scroll hasta ella y resaltarla
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jid = params.get('juntada');
    if (jid) {
      setResaltada(jid);
      setTimeout(() => {
        const el = document.getElementById(`juntada-${jid}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
      // quitar el resaltado después de unos segundos
      setTimeout(() => setResaltada(null), 4000);
    }
  }, []);

  function linkWhatsApp(j) {
    const link = `${window.location.origin}/grupo/${grupoId}?juntada=${j.id}`;
    const lineas = [
      '\u{1F389} \u{A1}Te invitaron a una juntada!',
      '',
      'Ingres\u{E1} al link para m\u{E1}s informaci\u{F3}n y decir si ven\u{ED}s:',
      link,
    ];
    return `https://wa.me/?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  if (juntadas.length === 0) return null;

  async function responder(meetupId, estado, motivo = null) {
    setProcesando(meetupId);
    await supabase
      .from('meetup_invitations')
      .update({ estado, motivo_rechazo: motivo, responded_at: new Date().toISOString() })
      .eq('meetup_id', meetupId)
      .eq('perfil_id', userId);

    // Notificar a los demás miembros la respuesta
    try {
      const otros = (miembros || [])
        .map((m) => m.perfil_id)
        .filter((pid) => pid !== userId);
      if (otros.length > 0) {
        const respuesta = estado === 'aceptada' ? 'va a la juntada ✓' : 'no puede ir a la juntada ✗';
        await supabase.from('notificaciones').insert(
          otros.map((pid) => ({
            destinatario: pid,
            grupo_id: grupoId,
            tipo: 'respuesta',
            texto: `${nombreMio} ${respuesta}`,
          }))
        );
      }
    } catch {}

    setProcesando(null);
    router.refresh();
  }

  async function borrarJuntada(meetupId) {
    if (!confirm('¿Seguro que querés borrar esta juntada? No se puede deshacer.')) return;
    setProcesando(meetupId);
    await supabase.from('meetups').delete().eq('id', meetupId);
    setProcesando(null);
    router.refresh();
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: '16px',
        }}
      >
        Juntadas
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {juntadas.map((j) => {
          const miInvitacion = j.meetup_invitations?.find((i) => i.perfil_id === userId);
          const soyCreador = j.creado_por === userId;
          const invs = j.meetup_invitations || [];
          const aceptaron = invs.filter((i) => i.estado === 'aceptada').length;
          const rechazaron = invs.filter((i) => i.estado === 'rechazada').length;
          const pendientes = invs.filter((i) => i.estado === 'pendiente').length;
          const total = invs.length;
          const fechaTxt = new Date(j.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          return (
            <motion.div
              key={j.id}
              id={`juntada-${j.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--card)',
                border: resaltada === j.id ? '2px solid var(--text)' : '0.5px solid var(--line)',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: resaltada === j.id ? '0 0 0 4px rgba(255,255,255,0.1), 0 8px 30px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'border 0.4s, box-shadow 0.4s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                    {j.tipo}
                    {j.lugar && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {j.lugar}</span>}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                    {fechaTxt} · {j.hora_desde.slice(0, 5)} a {j.hora_hasta.slice(0, 5)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={contadorStyle('var(--ok)')}>✓ {aceptaron} de {total}</span>
                  {rechazaron > 0 && <span style={contadorStyle('var(--no)')}>✗ {rechazaron}</span>}
                  {pendientes > 0 && <span style={contadorStyle('var(--text-dim)')}>⏳ {pendientes}</span>}
                </div>
              </div>

              {miInvitacion && miInvitacion.estado === 'pendiente' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => responder(j.id, 'aceptada')}
                    disabled={procesando === j.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'var(--text)',
                      color: 'var(--bg)',
                      border: '1.5px solid var(--text)',
                      fontWeight: 500,
                      fontSize: '14px',
                    }}
                  >
                    Voy
                  </button>
                  <button
                    onClick={() => responder(j.id, 'rechazada')}
                    disabled={procesando === j.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'var(--bg-soft)',
                      color: 'var(--text)',
                      border: '0.5px solid var(--line)',
                      fontWeight: 500,
                      fontSize: '14px',
                    }}
                  >
                    No puedo
                  </button>
                </div>
              )}

              {miInvitacion && miInvitacion.estado !== 'pendiente' && (
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', color: miInvitacion.estado === 'aceptada' ? 'var(--ok)' : 'var(--no)' }}>
                    {miInvitacion.estado === 'aceptada' ? '✓ Dijiste que vas' : '✗ Dijiste que no podés'}
                  </span>
                  <button
                    onClick={() =>
                      responder(j.id, miInvitacion.estado === 'aceptada' ? 'rechazada' : 'aceptada')
                    }
                    disabled={procesando === j.id}
                    style={{
                      fontSize: '13px',
                      color: 'var(--text)',
                      background: 'var(--bg-soft)',
                      border: '0.5px solid var(--line)',
                      borderRadius: '10px',
                      padding: '7px 14px',
                      fontWeight: 500,
                    }}
                  >
                    Cambiar a {miInvitacion.estado === 'aceptada' ? '“No puedo”' : '“Voy”'}
                  </button>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setInspeccionando(inspeccionando === j.id ? null : j.id)}
                  style={botonAccion(inspeccionando === j.id)}
                >
                  <span style={{ fontSize: '15px' }}>👥</span>
                  {inspeccionando === j.id ? 'Ocultar votos' : 'Ver votos'}
                </button>
                <button
                  onClick={() => setMostrandoLugares(mostrandoLugares === j.id ? null : j.id)}
                  style={botonAccion(mostrandoLugares === j.id)}
                >
                  <span style={{ fontSize: '15px' }}>📍</span>
                  Lugares
                  {j.meetup_lugares?.length > 0 && (
                    <span style={pastilla}>{j.meetup_lugares.length}</span>
                  )}
                </button>
                <button onClick={() => setBuscarLugares(j.lugar || '')} style={botonAccion(false)}>
                  <span style={{ fontSize: '15px' }}>🍽</span>
                  Cerca
                </button>
                <a
                  href={linkWhatsApp(j)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...botonAccion(false), color: 'var(--ok)', textDecoration: 'none' }}
                >
                  <span style={{ fontSize: '15px' }}>↗</span>
                  Compartir
                </a>
                <button
                  onClick={() => borrarJuntada(j.id)}
                  disabled={procesando === j.id}
                  style={{
                    ...botonAccion(false),
                    color: 'var(--no)',
                    marginLeft: 'auto',
                  }}
                  aria-label="Borrar juntada"
                  title="Borrar juntada"
                >
                  <span style={{ fontSize: '15px' }}>🗑</span>
                </button>
              </div>

              {mostrandoLugares === j.id && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '0.5px solid var(--line)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '10px' }}>
                    📍 ¿Dónde nos juntamos?
                  </div>
                  <LugaresEncuentro
                    meetupId={j.id}
                    lugares={j.meetup_lugares || []}
                    userId={userId}
                  />
                </div>
              )}

              {inspeccionando === j.id && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '0.5px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <ColumnaVotos titulo="Van ✓" color="var(--ok)" gente={invs.filter((i) => i.estado === 'aceptada')} />
                  <ColumnaVotos titulo="No pueden ✗" color="var(--no)" gente={invs.filter((i) => i.estado === 'rechazada')} />
                  <ColumnaVotos titulo="Falta que voten ⏳" color="var(--text-dim)" gente={invs.filter((i) => i.estado === 'pendiente')} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {buscarLugares !== null && (
        <BuscarLugaresModal
          zonaInicial={buscarLugares}
          onClose={() => setBuscarLugares(null)}
        />
      )}
    </div>
  );
}

function contadorStyle(color) {
  return {
    fontSize: '12px',
    color,
    background: 'var(--bg-soft)',
    borderRadius: '10px',
    padding: '6px 10px',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  };
}

function botonAccion(activo) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text)',
    background: activo ? 'var(--text)' : 'var(--bg-soft)',
    border: '0.5px solid var(--line)',
    borderRadius: '12px',
    padding: '8px 14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s',
  };
}

const pastilla = {
  fontSize: '11px',
  fontWeight: 600,
  background: 'var(--text)',
  color: 'var(--bg)',
  borderRadius: '999px',
  padding: '1px 7px',
  marginLeft: '2px',
};

function ColumnaVotos({ titulo, color, gente }) {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color, marginBottom: '8px' }}>
        {titulo} ({gente.length})
      </div>
      {gente.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', opacity: 0.6 }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {gente.map((i) => (
            <span
              key={i.perfil_id}
              style={{
                fontSize: '13px',
                background: 'var(--bg-soft)',
                borderRadius: '8px',
                padding: '5px 12px',
              }}
            >
              {i.profiles?.nombre || 'Sin nombre'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

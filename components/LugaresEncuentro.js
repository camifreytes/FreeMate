'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase-client';
import { useRouter } from 'next/navigation';

export default function LugaresEncuentro({ meetupId, lugares, userId }) {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [proponiendo, setProponiendo] = useState(false);
  const [votando, setVotando] = useState(null);

  const totalVotos = lugares.reduce((acc, l) => acc + (l.meetup_lugar_votos?.length || 0), 0);
  const miVoto = lugares.find((l) =>
    (l.meetup_lugar_votos || []).some((v) => v.perfil_id === userId)
  )?.id;

  async function proponer() {
    if (!nombre.trim()) return;
    setProponiendo(true);
    await supabase.from('meetup_lugares').insert({
      meetup_id: meetupId,
      propuesto_por: userId,
      nombre: nombre.trim(),
    });
    setNombre('');
    setProponiendo(false);
    router.refresh();
  }

  async function votar(lugarId) {
    setVotando(lugarId);
    if (miVoto === lugarId) {
      // Sacar mi voto
      await supabase
        .from('meetup_lugar_votos')
        .delete()
        .eq('meetup_id', meetupId)
        .eq('perfil_id', userId);
    } else {
      await supabase
        .from('meetup_lugar_votos')
        .upsert(
          { meetup_id: meetupId, lugar_id: lugarId, perfil_id: userId },
          { onConflict: 'meetup_id,perfil_id' }
        );
    }
    setVotando(null);
    router.refresh();
  }

  return (
    <div>
      {lugares.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '14px' }}>
          Todavía nadie propuso un lugar. ¡Sé la primera en sugerir uno!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {[...lugares]
            .sort((a, b) => (b.meetup_lugar_votos?.length || 0) - (a.meetup_lugar_votos?.length || 0))
            .map((l) => {
              const votos = l.meetup_lugar_votos?.length || 0;
              const pct = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;
              const esMiVoto = miVoto === l.id;
              return (
                <div
                  key={l.id}
                  style={{
                    position: 'relative',
                    padding: '12px 14px',
                    borderRadius: '13px',
                    border: esMiVoto ? '1.5px solid var(--text)' : '0.5px solid var(--line)',
                    background: 'var(--bg-soft)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Barra de progreso de fondo */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${pct}%`,
                      background: 'rgba(255,255,255,0.07)',
                      transition: 'width 0.4s',
                    }}
                  />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{l.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {votos} {votos === 1 ? 'voto' : 'votos'} · propuesto por{' '}
                        {l.propuesto_por === userId ? 'vos' : l.profiles?.nombre || 'alguien'}
                      </div>
                    </div>
                    <button
                      onClick={() => votar(l.id)}
                      disabled={votando === l.id}
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '8px 16px',
                        borderRadius: '11px',
                        cursor: 'pointer',
                        background: esMiVoto ? 'var(--text)' : 'transparent',
                        color: esMiVoto ? 'var(--bg)' : 'var(--text)',
                        border: '1.5px solid var(--text)',
                      }}
                    >
                      {esMiVoto ? '✓ Votado' : 'Votar'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {miVoto && (
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px' }}>
          Tocá "Votar" en otro lugar para cambiar tu voto, o "✓ Votado" para sacarlo.
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && proponer()}
          placeholder="Proponer un lugar…"
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '11px',
            border: '0.5px solid var(--line)',
            background: 'var(--bg-soft)',
            color: 'var(--text)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={proponer}
          disabled={proponiendo || !nombre.trim()}
          style={{
            padding: '10px 16px',
            borderRadius: '11px',
            background: 'var(--text)',
            color: 'var(--bg)',
            fontWeight: 500,
            fontSize: '13px',
            opacity: !nombre.trim() ? 0.5 : 1,
          }}
        >
          Proponer
        </button>
      </div>
    </div>
  );
}

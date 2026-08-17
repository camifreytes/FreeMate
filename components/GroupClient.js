'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase-client';
import { lunesDeSemana, sumarDias } from '../lib/tiempo';
import Grilla from './Grilla';
import MiniCalendario from './MiniCalendario';
import BlockModal from './BlockModal';
import FreeSlots from './FreeSlots';
import MeetupModal from './MeetupModal';
import MeetupsList from './MeetupsList';

export default function GroupClient({ grupo, miembros, userId, misBloques, bloquesGrupo, bloquesPorPersona, juntadas, misGrupos }) {
  const router = useRouter();
  const supabase = createClient();
  const soyAdmin = grupo?.creado_por === userId;

  async function borrarGrupo() {
    if (!confirm(`¿Seguro que querés borrar el grupo "${grupo.nombre}"? Se borra para todos y no se puede deshacer.`)) return;
    await supabase.from('groups').delete().eq('id', grupo.id);
    window.location.href = '/';
  }

  const [copiado, setCopiado] = useState(false);
  const [rango, setRango] = useState(null);
  const [bloqueEditar, setBloqueEditar] = useState(null);
  const [modalBloque, setModalBloque] = useState(false);
  const [huecoJuntada, setHuecoJuntada] = useState(null);
  const [weekStart, setWeekStart] = useState(() => lunesDeSemana(new Date()));
  const [diaEnfocado, setDiaEnfocado] = useState(null);

  function cambiarSemana(delta) {
    if (delta === 'hoy') {
      setWeekStart(lunesDeSemana(new Date()));
      return;
    }
    setWeekStart((actual) => sumarDias(actual, delta));
  }

  // Desde el mini calendario: ir a la semana de esa fecha y enfocar ese día
  function elegirDia(fechaISO) {
    const lunes = lunesDeSemana(new Date(fechaISO + 'T00:00:00'));
    setWeekStart(lunes);
    const jsDay = new Date(fechaISO + 'T00:00:00').getDay();
    const diaSemana = jsDay === 0 ? 6 : jsDay - 1;
    // Forzar re-disparo aunque sea el mismo día: primero null, después el valor
    setDiaEnfocado(null);
    setTimeout(() => setDiaEnfocado(diaSemana), 0);
  }

  if (!grupo) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Grupo no encontrado.</p>
        <a href="/" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Volver al inicio</a>
      </div>
    );
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(grupo.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function abrirNuevo(r) { setRango(r); setBloqueEditar(null); setModalBloque(true); }
  function abrirEditar(b) { setBloqueEditar(b); setRango(null); setModalBloque(true); }
  function cerrarBloque() {
    setModalBloque(false); setRango(null); setBloqueEditar(null); router.refresh();
  }
  function cerrarJuntada() {
    setHuecoJuntada(null); router.refresh();
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <nav
        style={{
          display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 32px',
          borderBottom: '0.5px solid var(--line)', position: 'sticky', top: 0,
          background: 'rgba(22,23,26,0.72)', backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)', zIndex: 10,
        }}
      >
        <a href="/" style={{ fontSize: '15px', color: 'var(--text-dim)' }}>← Volver</a>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 32px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em' }}>{grupo.nombre}</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', background: 'var(--card)', border: '0.5px solid var(--line)', borderRadius: '16px', padding: '12px 16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Código</div>
              <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.12em' }}>{grupo.codigo}</div>
            </div>
            <button onClick={copiarCodigo} style={{ padding: '9px 16px', borderRadius: '11px', background: copiado ? 'var(--bg-soft)' : 'var(--text)', color: copiado ? 'var(--text)' : 'var(--bg)', fontWeight: 500, fontSize: '14px' }}>
              {copiado ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </motion.div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '8px 32px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
          Horarios del grupo
        </div>

        {bloquesPorPersona.map((p, idx) => (
          <div key={p.perfilId} style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              {p.avatar ? (
                <img src={p.avatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#4a4d55,#2b2d33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '18px', fontWeight: 600 }}>
                {p.esYo ? 'Tu horario' : p.nombre}
              </span>
              {p.esYo && (
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', border: '0.5px solid var(--line)', borderRadius: '8px', padding: '3px 10px' }}>
                  editable
                </span>
              )}
            </div>

            {p.esYo ? (
              <div>
                <MiniCalendario
                  weekStart={weekStart}
                  onElegirDia={elegirDia}
                />
                <Grilla
                  misBloques={misBloques}
                  onNuevoRango={abrirNuevo}
                  onEditarBloque={abrirEditar}
                  weekStart={weekStart}
                  onCambiarSemana={cambiarSemana}
                  mostrarNav={idx === 0}
                  diaEnfocado={diaEnfocado}
                />
              </div>
            ) : p.bloques.length > 0 ? (
              <Grilla misBloques={p.bloques} soloLectura weekStart={weekStart} />
            ) : (
              <div style={{ padding: '24px', borderRadius: '16px', border: '0.5px dashed var(--line)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                {p.nombre} todavía no compartió horarios en este grupo.
              </div>
            )}

            {p.ultimaActualizacion && (
              <UltimaActualizacion iso={p.ultimaActualizacion} />
            )}
          </div>
        ))}

        <FreeSlots bloquesGrupo={bloquesGrupo} miembros={miembros} onArmarJuntada={setHuecoJuntada} weekStart={weekStart} />

        <MeetupsList juntadas={juntadas} userId={userId} grupoId={grupo.id} miembros={miembros} nombreMio={perfilNombre(miembros, userId)} />

        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '40px 0 16px' }}>
          Miembros ({miembros.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {miembros.map((m) => (
            <div key={m.perfil_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card)', border: '0.5px solid var(--line)', borderRadius: '14px', padding: '10px 16px' }}>
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#4a4d55,#2b2d33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>
                  {(m.profiles?.nombre || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '15px' }}>{m.profiles?.nombre || 'Sin nombre'}</span>
              {m.rol === 'admin' && (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', border: '0.5px solid var(--line)', borderRadius: '7px', padding: '3px 8px' }}>admin</span>
              )}
            </div>
          ))}
        </div>

        {soyAdmin && (
          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '0.5px solid var(--line)' }}>
            <button
              onClick={borrarGrupo}
              style={{
                fontSize: '14px',
                color: 'var(--no)',
                background: 'rgba(232,138,138,0.1)',
                borderRadius: '12px',
                padding: '12px 20px',
                fontWeight: 500,
              }}
            >
              Borrar este grupo
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
              Solo vos (admin) podés borrarlo. Se elimina para todos los miembros.
            </p>
          </div>
        )}
      </div>

      {modalBloque && (
        <BlockModal
          rango={rango}
          bloqueExistente={bloqueEditar}
          grupoId={grupo.id}
          userId={userId}
          misGrupos={misGrupos}
          onClose={() => setModalBloque(false)}
          onGuardado={cerrarBloque}
        />
      )}

      {huecoJuntada && (
        <MeetupModal
          hueco={huecoJuntada}
          grupoId={grupo.id}
          userId={userId}
          miembros={miembros}
          onClose={() => setHuecoJuntada(null)}
          onGuardado={cerrarJuntada}
        />
      )}
    </div>
  );
}

function UltimaActualizacion({ iso }) {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    const d = new Date(iso);
    setTexto(
      d.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, [iso]);
  if (!texto) return null;
  return (
    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'right' }}>
      Última actualización: {texto}
    </p>
  );
}

function perfilNombre(miembros, userId) {
  const m = miembros.find((x) => x.perfil_id === userId);
  return m?.profiles?.nombre || 'Alguien';
}

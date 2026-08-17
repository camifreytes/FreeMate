'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase-client';
import { Overlay, inputStyle, primaryBtn } from './CreateGroupModal';

export default function JoinGroupModal({ onClose }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function unirse() {
    const code = codigo.trim().toUpperCase();
    if (!code) {
      setError('Ingresá un código.');
      return;
    }
    setLoading(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: grupoId, error: errGrupo } = await supabase
      .rpc('buscar_grupo_por_codigo', { cod: code });

    if (errGrupo || !grupoId) {
      setError('No existe un grupo con ese código.');
      setLoading(false);
      return;
    }
    const grupo = { id: grupoId };

    const { data: yaExiste } = await supabase
      .from('group_members')
      .select('grupo_id')
      .eq('grupo_id', grupo.id)
      .eq('perfil_id', user.id)
      .maybeSingle();

    if (yaExiste) {
      window.location.href = `/grupo/${grupo.id}`;
      return;
    }

    const { error: errJoin } = await supabase
      .from('group_members')
      .insert({ grupo_id: grupo.id, perfil_id: user.id, rol: 'miembro' });

    if (errJoin) {
      setError('No se pudo unir al grupo. Probá de nuevo.');
      setLoading(false);
      return;
    }

    // Avisar a los demás miembros que se sumó alguien
    try {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre')
        .eq('id', user.id)
        .single();
      const { data: otros } = await supabase
        .from('group_members')
        .select('perfil_id')
        .eq('grupo_id', grupo.id)
        .neq('perfil_id', user.id);
      const { data: g } = await supabase
        .from('groups')
        .select('nombre')
        .eq('id', grupo.id)
        .single();
      if (otros && otros.length > 0) {
        await supabase.from('notificaciones').insert(
          otros.map((o) => ({
            destinatario: o.perfil_id,
            grupo_id: grupo.id,
            tipo: 'union',
            texto: `${perfil?.nombre || 'Alguien'} se unió al grupo.`,
          }))
        );
      }
    } catch {}

    window.location.href = `/grupo/${grupo.id}`;
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
        Unirme a un grupo
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '15px', marginBottom: '24px' }}>
        Pegá el código que te pasó tu amigo.
      </p>
      <input
        autoFocus
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && unirse()}
        placeholder="Código (ej: K3M9PQ)"
        maxLength={6}
        style={{ ...inputStyle, letterSpacing: '0.15em', textAlign: 'center', fontSize: '20px' }}
      />
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '12px' }}>{error}</p>
      )}
      <button onClick={unirse} disabled={loading} style={primaryBtn(loading)}>
        {loading ? 'Uniéndote…' : 'Unirme'}
      </button>
    </Overlay>
  );
}

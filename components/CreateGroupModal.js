'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '../lib/supabase-client';

function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export default function CreateGroupModal({ onClose }) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function crear() {
    if (!nombre.trim()) {
      setError('Poné un nombre al grupo.');
      return;
    }
    setLoading(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const codigo = generarCodigo();

    const { data: grupo, error: errGrupo } = await supabase
      .from('groups')
      .insert({ nombre: nombre.trim(), codigo, creado_por: user.id })
      .select()
      .single();

    if (errGrupo) {
      setError('No se pudo crear el grupo. Probá de nuevo.');
      setLoading(false);
      return;
    }

    await supabase
      .from('group_members')
      .insert({ grupo_id: grupo.id, perfil_id: user.id, rol: 'admin' });

    window.location.href = `/grupo/${grupo.id}`;
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
        Crear grupo
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '15px', marginBottom: '24px' }}>
        Se va a generar un código para que tus amigos se unan.
      </p>
      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && crear()}
        placeholder="Nombre del grupo"
        style={inputStyle}
      />
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: '14px', marginTop: '12px' }}>{error}</p>
      )}
      <button onClick={crear} disabled={loading} style={primaryBtn(loading)}>
        {loading ? 'Creando…' : 'Crear grupo'}
      </button>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
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
          padding: '32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '0.5px solid var(--line)',
  background: 'var(--bg-soft)',
  color: 'var(--text)',
  fontSize: '16px',
  outline: 'none',
};

function primaryBtn(loading) {
  return {
    width: '100%',
    marginTop: '24px',
    padding: '16px',
    borderRadius: '14px',
    background: 'var(--text)',
    color: 'var(--bg)',
    border: '1.5px solid var(--text)',
    fontSize: '16px',
    fontWeight: 500,
    opacity: loading ? 0.6 : 1,
  };
}

export { Overlay, inputStyle, primaryBtn };

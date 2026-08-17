'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '../lib/supabase-client';
import GroupCard from './GroupCard';
import CreateGroupModal from './CreateGroupModal';
import JoinGroupModal from './JoinGroupModal';
import Campanita from './Campanita';

export default function HomeClient({ profile, user, groups }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const supabase = createClient();

  const nombre = profile?.nombre || user?.email?.split('@')[0] || 'Hola';
  const inicial = nombre.charAt(0).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '0.5px solid var(--line)',
          position: 'sticky',
          top: 0,
          background: 'rgba(22,23,26,0.72)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          FreeMate
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={signOut}
            style={{ fontSize: '14px', color: 'var(--text-dim)' }}
          >
            Salir
          </button>
          <a
            href="/perfil"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 6px 6px 14px',
              borderRadius: '100px',
              border: '0.5px solid var(--line)',
              background: 'var(--bg-soft)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>{nombre}</span>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4a4d55, #2b2d33)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {inicial}
              </div>
            )}
          </a>
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '72px 32px 40px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '52px',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: '16px',
          }}
        >
          Hola, {nombre}.
        </h1>
        <p style={{ fontSize: '20px', color: 'var(--text-dim)' }}>
          {groups.length > 0
            ? 'Estos son tus grupos.'
            : 'Todavía no tenés grupos. Creá uno o unite con un código.'}
        </p>
      </motion.div>

      {groups.length > 0 && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 32px' }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '20px',
            }}
          >
            Tus grupos
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {groups.map((g, i) => (
              <GroupCard key={g.id} group={g} index={i} />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          maxWidth: '900px',
          margin: '40px auto 0',
          padding: '0 32px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <motion.button
          onClick={() => setShowCreate(true)}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '20px',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 500,
            border: '1.5px solid var(--text)',
            background: 'var(--text)',
            color: 'var(--bg)',
          }}
        >
          + Crear grupo
        </motion.button>
        <motion.button
          onClick={() => setShowJoin(true)}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          style={{
            flex: 1,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '20px',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 500,
            border: '1.5px solid var(--text)',
            background: 'transparent',
            color: 'var(--text)',
          }}
        >
          Unirme con un código
        </motion.button>
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
      <Campanita userId={user.id} />
    </div>
  );
}

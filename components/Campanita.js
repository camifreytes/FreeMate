'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '../lib/supabase-client';

export default function Campanita({ userId }) {
  const supabase = createClient();
  const [notis, setNotis] = useState([]);
  const [abierto, setAbierto] = useState(false);

  async function cargar() {
    const { data } = await supabase
      .from('notificaciones')
      .select('*, groups(nombre)')
      .eq('destinatario', userId)
      .order('created_at', { ascending: false })
      .limit(40);
    setNotis(data || []);
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, []);

  const sinLeer = notis.filter((n) => !n.leida).length;

  async function abrir() {
    const abrirAhora = !abierto;
    setAbierto(abrirAhora);
    if (abrirAhora && sinLeer > 0) {
      await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('destinatario', userId)
        .eq('leida', false);
      setNotis((prev) => prev.map((n) => ({ ...n, leida: true })));
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 200 }}>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '68px',
              right: 0,
              width: '320px',
              maxHeight: '440px',
              overflowY: 'auto',
              background: 'var(--card)',
              border: '0.5px solid var(--line)',
              borderRadius: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              padding: '8px',
            }}
          >
            <div style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notificaciones
            </div>
            {notis.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                No tenés notificaciones todavía.
              </div>
            ) : (
              notis.map((n) => (
                <a
                  key={n.id}
                  href={n.grupo_id ? `/grupo/${n.grupo_id}` : '#'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    background: n.leida ? 'transparent' : 'var(--bg-soft)',
                    marginBottom: '2px',
                    color: 'inherit',
                    textDecoration: 'none',
                    cursor: n.grupo_id ? 'pointer' : 'default',
                  }}
                >
                  <span>
                    {n.groups?.nombre && (
                      <strong style={{ opacity: 0.7 }}>{n.groups.nombre}: </strong>
                    )}
                    {n.texto}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {tiempoRelativo(n.created_at)}
                  </span>
                </a>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={abrir}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'relative',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '1.5px solid var(--text)',
          background: 'var(--text)',
          color: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          cursor: 'pointer',
        }}
      >
        🔔
        {sinLeer > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '22px',
              height: '22px',
              borderRadius: '11px',
              background: '#ff5c5c',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              border: '2px solid var(--bg)',
            }}
          >
            {sinLeer}
          </span>
        )}
      </motion.button>
    </div>
  );
}

function tiempoRelativo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? 's' : ''}`;
}

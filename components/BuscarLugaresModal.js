'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const TIPOS = [
  { label: 'Todo', q: 'mejores lugares para comer en' },
  { label: 'Parrilla', q: 'mejores parrillas en' },
  { label: 'Pizza', q: 'mejores pizzerías en' },
  { label: 'Cafés', q: 'mejores cafés en' },
  { label: 'Sushi', q: 'mejor sushi en' },
  { label: 'Hamburguesas', q: 'mejores hamburguesas en' },
  { label: 'Heladerías', q: 'mejores heladerías en' },
  { label: 'Bares', q: 'mejores bares en' },
];

export default function BuscarLugaresModal({ zonaInicial, onClose }) {
  const [barrio, setBarrio] = useState(zonaInicial || '');

  function linkGoogle(q) {
    const consulta = `${q} ${barrio.trim()}`;
    return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
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
        zIndex: 120,
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
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          Buscar dónde comer
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px' }}>
          Poné el barrio y elegí el tipo. Te abrimos los lugares en Google, con sus calificaciones.
        </p>

        <label style={labelStyle}>Barrio o zona</label>
        <input
          autoFocus
          value={barrio}
          onChange={(e) => setBarrio(e.target.value)}
          placeholder="Ej: Palermo, Núñez, Ramos Mejía…"
          style={inputStyle}
        />

        {barrio.trim() ? (
          <>
            <label style={labelStyle}>¿Qué se te antoja?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TIPOS.map((t) => (
                <a
                  key={t.label}
                  href={linkGoogle(t.q)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'var(--bg-soft)',
                    border: '0.5px solid var(--line)',
                    color: 'var(--text)',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  <span>{t.label} en {barrio.trim()}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Ver en Google →</span>
                </a>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            Escribí un barrio para ver las opciones.
          </p>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '14px',
            borderRadius: '14px',
            background: 'transparent',
            color: 'var(--text)',
            border: '1.5px solid var(--text)',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          Cerrar
        </button>
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

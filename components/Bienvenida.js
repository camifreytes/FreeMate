'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase-client';

const PASOS_INTRO = [
  {
    emoji: '👋',
    titulo: '¡Bienvenido a FreeMate!',
    texto: 'La app para compartir tus horarios con amigos y encontrar cuándo juntarse. Te muestro lo básico en 4 pasos.',
  },
  {
    emoji: '👥',
    titulo: 'Grupos',
    texto: 'Creá un grupo y compartí el código con tus amigos, o unite a uno con el código que te pasen. Podés estar en varios grupos a la vez.',
  },
  {
    emoji: '📅',
    titulo: 'Tu horario',
    texto: 'En cada grupo, arrastrá sobre la grilla para marcar cuándo estás ocupado. Elegís si es algo de todas las semanas o una sola vez, y le ponés color.',
  },
  {
    emoji: '🎉',
    titulo: 'Juntadas',
    texto: 'Apretá "Buscar juntada", elegí quiénes vienen, y la app te muestra los horarios libres de todos. Armá la juntada y avisá por WhatsApp o por la campanita.',
  },
];

export default function Bienvenida({ userId, nombre }) {
  const router = useRouter();
  const supabase = createClient();
  const [fase, setFase] = useState('intro'); // 'intro' | 'colores'
  const [paso, setPaso] = useState(0);
  const [colorFondo, setColorFondo] = useState('#16171a');
  const [colorTexto, setColorTexto] = useState('#f5f6f7');
  const [guardando, setGuardando] = useState(false);

  const primerNombre = (nombre || '').split(' ')[0];

  function siguiente() {
    if (paso < PASOS_INTRO.length - 1) {
      setPaso(paso + 1);
    } else {
      setFase('colores');
    }
  }

  async function empezar() {
    setGuardando(true);
    await supabase
      .from('profiles')
      .update({ color_fondo: colorFondo, color_texto: colorTexto, configurado: true })
      .eq('id', userId);
    router.refresh();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: fase === 'colores' ? colorFondo : '#16171a',
        color: fase === 'colores' ? colorTexto : '#f5f6f7',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <AnimatePresence mode="wait">
          {fase === 'intro' ? (
            <motion.div
              key={paso}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ fontSize: '56px', marginBottom: '20px' }}>{PASOS_INTRO[paso].emoji}</div>
              <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                {paso === 0 && primerNombre ? `¡Hola, ${primerNombre}!` : PASOS_INTRO[paso].titulo}
              </h1>
              <p style={{ fontSize: '17px', opacity: 0.75, lineHeight: 1.5, marginBottom: '36px' }}>
                {PASOS_INTRO[paso].texto}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
                {PASOS_INTRO.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === paso ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: i === paso ? '#fff' : 'rgba(255,255,255,0.3)',
                      transition: 'width 0.3s',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={siguiente}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '14px',
                  background: '#fff',
                  color: '#16171a',
                  fontSize: '16px',
                  fontWeight: 500,
                  border: '1.5px solid #fff',
                }}
              >
                {paso < PASOS_INTRO.length - 1 ? 'Siguiente' : 'Elegir mis colores'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="colores"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
              <h1 style={{ fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '10px' }}>
                Elegí tus colores
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '32px' }}>
                Personalizá tu FreeMate como más te guste.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px', textAlign: 'left' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', opacity: 0.7, marginBottom: '10px' }}>Color de fondo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <input type="color" value={colorFondo} onChange={(e) => setColorFondo(e.target.value)} style={colorInput} />
                    <span style={{ opacity: 0.6, fontSize: '14px' }}>{colorFondo}</span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', opacity: 0.7, marginBottom: '10px' }}>Color de texto</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <input type="color" value={colorTexto} onChange={(e) => setColorTexto(e.target.value)} style={colorInput} />
                    <span style={{ opacity: 0.6, fontSize: '14px' }}>{colorTexto}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={empezar}
                disabled={guardando}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '14px',
                  background: colorTexto,
                  color: colorFondo,
                  border: `1.5px solid ${colorTexto}`,
                  fontSize: '16px',
                  fontWeight: 500,
                  opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? 'Guardando…' : 'Empezar a usar FreeMate'}
              </button>

              <p style={{ fontSize: '13px', opacity: 0.55, marginTop: '18px' }}>
                Estos colores se pueden volver a cambiar cuando quieras desde tu perfil.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const colorInput = {
  width: '52px',
  height: '44px',
  borderRadius: '12px',
  border: '0.5px solid rgba(128,128,128,0.4)',
  background: 'transparent',
  cursor: 'pointer',
};

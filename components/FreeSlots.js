'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calcularHuecos } from '../lib/huecos';

export default function FreeSlots({ bloquesGrupo, miembros, onArmarJuntada, weekStart }) {
  const [abierto, setAbierto] = useState(false);
  const [huecos, setHuecos] = useState(null);
  // seleccionados: set de perfil_id incluidos en la comparación (todos por defecto)
  const [seleccionados, setSeleccionados] = useState(
    () => new Set(miembros.map((m) => m.perfil_id))
  );

  function toggle(pid) {
    setSeleccionados((prev) => {
      const s = new Set(prev);
      if (s.has(pid)) s.delete(pid);
      else s.add(pid);
      return s;
    });
    setHuecos(null); // limpiar resultado anterior al cambiar selección
  }

  function buscar() {
    // Solo bloques de las personas seleccionadas
    const bloquesFiltrados = bloquesGrupo.filter((b) => seleccionados.has(b.perfil_id));
    const resultado = calcularHuecos(bloquesFiltrados, weekStart, 8); // 8 franjas = 2h
    setHuecos(resultado);
  }

  function abrirPanel() {
    setAbierto((v) => !v);
    setHuecos(null);
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <motion.button
        onClick={abrirPanel}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--text)',
          color: 'var(--bg)',
          border: '1.5px solid var(--text)',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Buscar juntada
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '14px' }}>
                ¿Quiénes se juntan? Destildá a quien no venga.
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {miembros.map((m) => {
                  const activo = seleccionados.has(m.perfil_id);
                  return (
                    <button
                      key={m.perfil_id}
                      onClick={() => toggle(m.perfil_id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        borderRadius: '14px',
                        background: activo ? 'var(--text)' : 'transparent',
                        color: activo ? 'var(--bg)' : 'var(--text-dim)',
                        border: '1.5px solid var(--text)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: activo ? 1 : 0.55,
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          border: `1.5px solid ${activo ? 'var(--bg)' : 'var(--text-dim)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {activo ? '✓' : ''}
                      </span>
                      {m.profiles?.nombre || 'Sin nombre'}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={buscar}
                disabled={seleccionados.size === 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'var(--text)',
                  color: 'var(--bg)',
                  border: '1.5px solid var(--text)',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: seleccionados.size === 0 ? 0.5 : 1,
                  marginBottom: '8px',
                }}
              >
                Buscar horarios libres ({seleccionados.size})
              </button>

              {huecos !== null && (
                <div style={{ paddingTop: '20px' }}>
                  {huecos.length === 0 ? (
                    <div
                      style={{
                        padding: '28px',
                        borderRadius: '16px',
                        border: '0.5px dashed var(--line)',
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                      }}
                    >
                      No hay ningún hueco de 2 horas donde estén libres los seleccionados en el próximo mes.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {huecos.map((d) => (
                        <div key={d.dia}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '10px', textTransform: 'capitalize' }}>
                            {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {d.huecos.map((h, i) => (
                              <motion.button
                                key={i}
                                whileHover={{ y: -2 }}
                                onClick={() =>
                                  onArmarJuntada({
                                    dia: d.dia,
                                    fecha: d.fecha,
                                    desde: h.desde,
                                    hasta: h.hasta,
                                    invitados: Array.from(seleccionados),
                                  })
                                }
                                style={{
                                  padding: '12px 18px',
                                  borderRadius: '14px',
                                  background: 'transparent',
                                  border: '1.5px solid var(--text)',
                                  color: 'var(--text)',
                                  fontSize: '15px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '2px',
                                }}
                              >
                                <span>
                                  {h.desde.slice(0, 5)} – {h.hasta.slice(0, 5)}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                  Armar juntada →
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

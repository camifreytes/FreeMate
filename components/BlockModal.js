'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '../lib/supabase-client';
import { COLORES } from '../lib/tiempo';
import { DIAS_LARGO } from '../lib/tiempo';

export default function BlockModal({ rango, bloqueExistente, grupoId, userId, misGrupos, onClose, onGuardado }) {
  const editando = !!bloqueExistente;
  const [titulo, setTitulo] = useState(bloqueExistente?.titulo || '');
  const [tipo, setTipo] = useState(bloqueExistente?.tipo || 'permanente');
  const [color, setColor] = useState(bloqueExistente?.color || COLORES[0].valor);
  const [aplicarATodos, setAplicarATodos] = useState(!bloqueExistente);
  const [mostrarDetalle, setMostrarDetalle] = useState(
    bloqueExistente ? bloqueExistente.mostrar_detalle : true
  );
  const [fecha, setFecha] = useState(bloqueExistente?.fecha || rango?.fecha || proximaFecha(rango?.dia));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const desde = rango?.desde || bloqueExistente?.hora_desde?.slice(0, 5);
  const hasta = rango?.hasta || bloqueExistente?.hora_hasta?.slice(0, 5);
  const diaIdx = rango?.dia ?? bloqueExistente?.dia_semana ?? 0;

  async function guardar() {
    setLoading(true);
    setError('');

    const payload = {
      perfil_id: userId,
      titulo: titulo.trim() || null,
      mostrar_detalle: mostrarDetalle,
      tipo,
      color,
      hora_desde: desde,
      hora_hasta: hasta,
      dia_semana: tipo === 'permanente' ? diaIdx : null,
      fecha: tipo === 'unico' ? fecha : null,
    };

    let bloqueId;
    if (editando) {
      const { error: err } = await supabase
        .from('blocks')
        .update(payload)
        .eq('id', bloqueExistente.id);
      if (err) {
        setError('No se pudo guardar. Probá de nuevo.');
        setLoading(false);
        return;
      }
      bloqueId = bloqueExistente.id;
    } else {
      const { data, error: err } = await supabase
        .from('blocks')
        .insert(payload)
        .select()
        .single();
      if (err) {
        setError('No se pudo guardar. Probá de nuevo.');
        setLoading(false);
        return;
      }
      bloqueId = data.id;
    }

    // Compartir en este grupo (si no estaba)
    await supabase
    // Compartir el bloque en los grupos correspondientes
    const gruposDestino = aplicarATodos && misGrupos && misGrupos.length > 0
      ? misGrupos.map((g) => g.id)
      : [grupoId];

    await supabase
      .from('block_visibility')
      .upsert(
        gruposDestino.map((gid) => ({ bloque_id: bloqueId, grupo_id: gid })),
        { onConflict: 'bloque_id,grupo_id' }
      );

    onGuardado();
  }

  async function borrar() {
    setLoading(true);
    await supabase.from('blocks').delete().eq('id', bloqueExistente.id);
    onGuardado();
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
          padding: '28px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          {editando ? 'Editar horario' : 'Nuevo horario ocupado'}
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px' }}>
          {DIAS_LARGO[diaIdx]} · {desde} a {hasta}
        </p>

        <label style={labelStyle}>¿Qué es?</label>
        <input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Entrenamiento, Turno médico…"
          style={inputStyle}
        />

        <label style={labelStyle}>¿Se repite?</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <TipoBtn activo={tipo === 'permanente'} onClick={() => setTipo('permanente')}>
            Todas las semanas
          </TipoBtn>
          <TipoBtn activo={tipo === 'unico'} onClick={() => setTipo('unico')}>
            Solo una vez
          </TipoBtn>
        </div>

        {tipo === 'unico' && (
          <>
            <label style={labelStyle}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={inputStyle}
            />
          </>
        )}

        <label style={labelStyle}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          {COLORES.map((c) => (
            <button
              key={c.valor}
              onClick={() => setColor(c.valor)}
              title={c.nombre}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: c.valor,
                border: color === c.valor ? '2px solid #fff' : '0.5px solid var(--line)',
                boxShadow: color === c.valor ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          ))}
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '15px',
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={mostrarDetalle}
            onChange={(e) => setMostrarDetalle(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          Mostrar el detalle a los demás (si no, solo ven “Ocupado”)
        </label>

        {!editando && misGrupos && misGrupos.length >= 1 && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '15px',
              marginBottom: '20px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={aplicarATodos}
              onChange={(e) => setAplicarATodos(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            {misGrupos.length > 1
              ? `Aplicar este horario a todos mis grupos (${misGrupos.length})`
              : 'Aplicar este horario a todos mis grupos'}
          </label>
        )}

        {error && <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          {editando && (
            <button
              onClick={borrar}
              disabled={loading}
              style={{
                padding: '14px 18px',
                borderRadius: '14px',
                background: 'rgba(255,107,107,0.12)',
                color: '#ff6b6b',
                fontWeight: 500,
              }}
            >
              Borrar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--text)',
              color: 'var(--bg)',
              border: '1.5px solid var(--text)',
              fontSize: '16px',
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TipoBtn({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px',
        borderRadius: '12px',
        background: activo ? 'var(--text)' : 'var(--bg-soft)',
        color: activo ? 'var(--bg)' : 'var(--text)',
        border: '0.5px solid var(--line)',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
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

function proximaFecha(diaIdx) {
  const hoy = new Date();
  const jsDay = hoy.getDay();
  const nuestroHoy = jsDay === 0 ? 6 : jsDay - 1;
  let delta = (diaIdx ?? nuestroHoy) - nuestroHoy;
  if (delta < 0) delta += 7;
  const f = new Date(hoy);
  f.setDate(hoy.getDate() + delta);
  return f.toISOString().slice(0, 10);
}

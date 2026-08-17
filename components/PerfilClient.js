'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase-client';

export default function PerfilClient({ profile, userId, conexionGoogle }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef(null);

  const [nombre, setNombre] = useState(profile?.nombre || '');
  const [colorFondo, setColorFondo] = useState(profile?.color_fondo || '#16171a');
  const [colorTexto, setColorTexto] = useState(profile?.color_texto || '#f5f6f7');
  const [avatar, setAvatar] = useState(profile?.avatar_url || null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const [sincronizando, setSincronizando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [msgGoogle, setMsgGoogle] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get('gcal');
    if (resultado === 'ok') setMsgGoogle('¡Conectado! Ya se importaron tus eventos.');
    else if (resultado === 'cancelado') setMsgGoogle('Cancelaste la conexión, no pasa nada.');
    else if (resultado === 'error') setMsgGoogle('Hubo un problema conectando. Probá de nuevo.');
    if (resultado) {
      // Limpiamos el ?gcal=... de la URL para que no quede pegado si recargás
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function sincronizarAhora() {
    setSincronizando(true);
    setMsgGoogle('');
    const res = await fetch('/api/google-calendar/sincronizar-yo', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const crudos = data.eventosCrudos ?? '?';
      const guardados = data.guardados ?? 0;
      if (data.errorGuardado) {
        setMsgGoogle('Google devolvió ' + crudos + ' eventos, pero falló al guardar: ' + data.errorGuardado);
      } else {
        setMsgGoogle(
          `Sincronizado. Google devolvió ${crudos} evento(s), se cargaron ${guardados} en tu grilla.`
        );
      }
      router.refresh();
    } else {
      setMsgGoogle('No se pudo sincronizar: ' + (data.detalle || 'error desconocido'));
    }
    setSincronizando(false);
  }

  async function desconectarGoogle() {
    if (!confirm('¿Desconectar Google Calendar? Se van a borrar los eventos que se importaron.')) return;
    setDesconectando(true);
    const res = await fetch('/api/google-calendar/desconectar', { method: 'POST' });
    if (res.ok) {
      setMsgGoogle('Desconectado.');
      router.refresh();
    } else {
      setMsgGoogle('No se pudo desconectar. Probá de nuevo.');
    }
    setDesconectando(false);
  }

  async function subirFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setMsg('');

    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: errUp } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (errUp) {
      setMsg('No se pudo subir la foto. ¿Activaste el bucket "avatars"?');
      setSubiendo(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatar(url);
    setSubiendo(false);
  }

  async function guardar() {
    setGuardando(true);
    setMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: nombre.trim() || 'Sin nombre',
        color_fondo: colorFondo,
        color_texto: colorTexto,
        avatar_url: avatar,
      })
      .eq('id', userId);

    if (error) {
      setMsg('No se pudo guardar. Probá de nuevo.');
      setGuardando(false);
      return;
    }
    setMsg('¡Guardado!');
    setGuardando(false);
    router.refresh();
  }

  return (
    <div style={{ background: colorFondo, color: colorTexto, minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 32px',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        }}
      >
        <a href="/" style={{ fontSize: '15px', opacity: 0.7 }}>← Volver</a>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '540px', margin: '0 auto', padding: '48px 32px' }}
      >
        <h1 style={{ fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '32px' }}>
          Tu perfil
        </h1>

        {/* Foto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
          {avatar ? (
            <img src={avatar} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#4a4d55,#2b2d33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 600, color: '#fff' }}>
              {(nombre || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '0.5px solid rgba(255,255,255,0.2)',
                color: 'inherit',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              {subiendo ? 'Subiendo…' : 'Cambiar foto'}
            </button>
          </div>
        </div>

        {/* Nombre */}
        <label style={labelStyle}>Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />

        {/* Colores */}
        <label style={labelStyle}>Color de fondo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <input type="color" value={colorFondo} onChange={(e) => setColorFondo(e.target.value)} style={colorInput} />
          <span style={{ opacity: 0.7, fontSize: '14px' }}>{colorFondo}</span>
        </div>

        <label style={labelStyle}>Color de texto</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <input type="color" value={colorTexto} onChange={(e) => setColorTexto(e.target.value)} style={colorInput} />
          <span style={{ opacity: 0.7, fontSize: '14px' }}>{colorTexto}</span>
        </div>

        {msg && <p style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.8 }}>{msg}</p>}

        <button
          onClick={guardar}
          disabled={guardando}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            background: 'var(--text)',
            color: 'var(--bg)',
            border: '1.5px solid var(--text)',
            fontSize: '16px',
            fontWeight: 500,
            opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {/* Google Calendar */}
        <div
          style={{
            marginTop: '36px',
            padding: '20px',
            borderRadius: '18px',
            border: '0.5px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>📅</span>
            <h3 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>Google Calendar</h3>
          </div>

          {conexionGoogle?.conectado ? (
            <>
              <p style={{ fontSize: '13px', opacity: 0.65, marginBottom: '16px' }}>
                Conectado ✅
                {conexionGoogle.ultima_sync && (
                  <> · última sincronización:{' '}
                    {new Date(conexionGoogle.ultima_sync).toLocaleString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={sincronizarAhora}
                  disabled={sincronizando}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '13px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    color: 'inherit',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
                <button
                  onClick={desconectarGoogle}
                  disabled={desconectando}
                  style={{
                    padding: '13px 16px',
                    borderRadius: '13px',
                    background: 'rgba(255,107,107,0.12)',
                    border: 'none',
                    color: '#ff6b6b',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  {desconectando ? '…' : 'Desconectar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', opacity: 0.65, marginBottom: '16px' }}>
                Traé tus eventos de Google Calendar a tu grilla automáticamente, con su nombre real.
              </p>
              <a
                href="/api/google-calendar/conectar"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  width: '100%',
                  padding: '13px',
                  borderRadius: '13px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '0.5px solid rgba(255,255,255,0.2)',
                  color: 'inherit',
                  fontWeight: 500,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                Conectar Google Calendar
              </a>
            </>
          )}

          {msgGoogle && (
            <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '12px' }}>{msgGoogle}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  opacity: 0.6,
  marginBottom: '8px',
  fontWeight: 500,
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '0.5px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.06)',
  color: 'inherit',
  fontSize: '16px',
  outline: 'none',
  marginBottom: '20px',
  boxSizing: 'border-box',
};

const colorInput = {
  width: '52px',
  height: '44px',
  borderRadius: '12px',
  border: '0.5px solid rgba(255,255,255,0.2)',
  background: 'transparent',
  cursor: 'pointer',
};

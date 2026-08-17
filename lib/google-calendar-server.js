// ⚠️ Este archivo SOLO se usa del lado del servidor (rutas /api).
// Nunca lo importes desde un componente 'use client'.

import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const WATCH_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch';
const STOP_URL = 'https://www.googleapis.com/calendar/v3/channels/stop';

// Nuestro dominio fijo (donde vive la app en producción)
const SITE_URL = 'https://freemates.app';

// Colores para diferenciar visualmente lo que viene de Google
const COLOR_EVENTO_GOOGLE = '#B4CFE8'; // Cielo
const COLOR_CUMPLE = '#E8C2D2'; // Rosa

// ---------- Intercambio de tokens ----------

export async function intercambiarCodigoPorTokens(code) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`No se pudo intercambiar el código: ${await res.text()}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

export async function refrescarAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    throw new Error(`No se pudo refrescar el token: ${await res.text()}`);
  }
  return res.json(); // { access_token, expires_in, ... }
}

async function obtenerAccessTokenValido(admin, conexion) {
  const vence = conexion.expira_en ? new Date(conexion.expira_en).getTime() : 0;
  if (vence > Date.now() + 60_000) {
    return conexion.access_token;
  }
  const nuevos = await refrescarAccessToken(conexion.refresh_token);
  const expira_en = new Date(Date.now() + nuevos.expires_in * 1000).toISOString();
  await admin
    .from('google_calendar_conexiones')
    .update({ access_token: nuevos.access_token, expira_en })
    .eq('perfil_id', conexion.perfil_id);
  return nuevos.access_token;
}

// ---------- Traer eventos ----------

async function pedirPaginaEventos(accessToken, params) {
  const url = `${EVENTS_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 410) {
    const err = new Error('sync_token_invalido');
    err.code = 410;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Error de Google Calendar (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function fueRechazado(evento) {
  const yo = (evento.attendees || []).find((a) => a.self);
  return yo?.responseStatus === 'declined';
}

function esDiaCompleto(evento) {
  return !evento.start?.dateTime; // si no tiene hora, es "todo el día"
}

// Convierte un evento de Google en una fila para la tabla "blocks".
// Devuelve null si hay que ignorarlo (rechazado, o día completo que no es cumpleaños).
function eventoABloque(evento, perfilId) {
  if (fueRechazado(evento)) return null;

  const esCumple = evento.eventType === 'birthday';
  const diaCompleto = esDiaCompleto(evento);

  if (diaCompleto && !esCumple) return null; // regla: día completo se carga a mano, EXCEPTO cumpleaños

  const fecha = diaCompleto ? evento.start.date : evento.start.dateTime.slice(0, 10);
  const desde = diaCompleto ? '00:00' : evento.start.dateTime.slice(11, 16);
  const hasta = diaCompleto ? '23:45' : evento.end.dateTime.slice(11, 16);

  return {
    perfil_id: perfilId,
    titulo: evento.summary || (esCumple ? 'Cumpleaños' : 'Evento de Google Calendar'),
    mostrar_detalle: true,
    tipo: 'unico',
    dia_semana: null,
    fecha,
    hora_desde: desde,
    hora_hasta: hasta,
    color: esCumple ? COLOR_CUMPLE : COLOR_EVENTO_GOOGLE,
    google_event_id: evento.id,
    origen: 'google',
  };
}

// Trae los grupos del usuario, para que los eventos importados se vean en todos ellos
async function gruposDelUsuario(admin, perfilId) {
  const { data } = await admin.from('group_members').select('grupo_id').eq('perfil_id', perfilId);
  return (data || []).map((r) => r.grupo_id);
}

// Función principal: trae los cambios de Google Calendar y actualiza la grilla del usuario.
export async function sincronizarUsuario(admin, perfilId, intentoDeNuevo = false) {
  const { data: conexion } = await admin
    .from('google_calendar_conexiones')
    .select('*')
    .eq('perfil_id', perfilId)
    .single();

  if (!conexion || !conexion.conectado) return;

  const accessToken = await obtenerAccessTokenValido(admin, conexion);

  const usaSyncToken = !!conexion.sync_token;
  let params = usaSyncToken
    ? { singleEvents: 'true', showDeleted: 'true', maxResults: '250', syncToken: conexion.sync_token }
    : {
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
        timeMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timeMax: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      };

  const filasParaGuardar = [];
  const idsParaBorrar = [];
  let siguienteSyncToken = null;
  let pageToken = null;
  let eventosCrudos = 0; // cuántos eventos devolvió Google en total (antes de filtrar)

  try {
    do {
      const pagina = await pedirPaginaEventos(accessToken, pageToken ? { ...params, pageToken } : params);
      eventosCrudos += (pagina.items || []).length;
      for (const evento of pagina.items || []) {
        if (evento.status === 'cancelled') {
          idsParaBorrar.push(evento.id);
          continue;
        }
        const fila = eventoABloque(evento, perfilId);
        if (fila) filasParaGuardar.push(fila);
        else idsParaBorrar.push(evento.id); // por si antes sí calificaba (ej. lo rechazaron ahora)
      }
      pageToken = pagina.nextPageToken || null;
      if (pagina.nextSyncToken) siguienteSyncToken = pagina.nextSyncToken;
    } while (pageToken);
  } catch (e) {
    if (e.code === 410 && !intentoDeNuevo) {
      // El token de sincronización quedó viejo: reseteamos y volvemos a traer todo de cero
      await admin.from('google_calendar_conexiones').update({ sync_token: null }).eq('perfil_id', perfilId);
      return sincronizarUsuario(admin, perfilId, true);
    }
    throw e;
  }

  if (idsParaBorrar.length > 0) {
    await admin
      .from('blocks')
      .delete()
      .eq('perfil_id', perfilId)
      .eq('origen', 'google')
      .in('google_event_id', idsParaBorrar);
  }

  let errorGuardado = null;
  if (filasParaGuardar.length > 0) {
    // Borramos primero los eventos de Google que estamos por reinsertar
    // (evita depender del onConflict, que no funciona con el índice parcial)
    const idsEventos = filasParaGuardar.map((f) => f.google_event_id);
    await admin
      .from('blocks')
      .delete()
      .eq('perfil_id', perfilId)
      .eq('origen', 'google')
      .in('google_event_id', idsEventos);

    const { data: guardados, error: errInsert } = await admin
      .from('blocks')
      .insert(filasParaGuardar)
      .select('id');

    if (errInsert) {
      errorGuardado = errInsert.message || String(errInsert);
    }

    const grupos = await gruposDelUsuario(admin, perfilId);
    if (guardados && grupos.length > 0) {
      const visibilidad = [];
      for (const b of guardados) {
        for (const gid of grupos) {
          visibilidad.push({ bloque_id: b.id, grupo_id: gid });
        }
      }
      const { error: errVis } = await admin
        .from('block_visibility')
        .upsert(visibilidad, { onConflict: 'bloque_id,grupo_id' });
      if (errVis && !errorGuardado) {
        errorGuardado = 'visibilidad: ' + (errVis.message || String(errVis));
      }
    }
  }

  await admin
    .from('google_calendar_conexiones')
    .update({
      sync_token: siguienteSyncToken || conexion.sync_token,
      ultima_sync: new Date().toISOString(),
    })
    .eq('perfil_id', perfilId);

  return {
    eventosCrudos,
    guardados: filasParaGuardar.length,
    borrados: idsParaBorrar.length,
    errorGuardado,
  };
}

// ---------- Notificaciones push (para actualizar "al toque") ----------

export async function registrarCanalWatch(admin, perfilId) {
  const { data: conexion } = await admin
    .from('google_calendar_conexiones')
    .select('*')
    .eq('perfil_id', perfilId)
    .single();
  if (!conexion) return;

  const accessToken = await obtenerAccessTokenValido(admin, conexion);
  const canalId = crypto.randomUUID();
  const canalToken = crypto.randomBytes(20).toString('hex');

  const res = await fetch(WATCH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: canalId,
      type: 'web_hook',
      address: `${SITE_URL}/api/google-calendar/webhook`,
      token: canalToken,
    }),
  });

  if (!res.ok) {
    // No es crítico: si falla, igual queda la sincronización manual y la del botón
    console.error('No se pudo registrar el canal de notificaciones', await res.text());
    return;
  }

  const data = await res.json();
  await admin
    .from('google_calendar_conexiones')
    .update({
      canal_id: canalId,
      recurso_id: data.resourceId,
      canal_token: canalToken,
      canal_expira: new Date(Number(data.expiration)).toISOString(),
    })
    .eq('perfil_id', perfilId);
}

export async function detenerCanalWatch(accessToken, canalId, recursoId) {
  try {
    await fetch(STOP_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: canalId, resourceId: recursoId }),
    });
  } catch {
    // best-effort, no pasa nada si falla
  }
}

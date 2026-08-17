import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { refrescarAccessToken, detenerCanalWatch, registrarCanalWatch } from '../../../../lib/google-calendar-server';

export async function GET(request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Los canales de Google vencen cada tantos días. Renovamos los que
  // vencen en menos de 48hs para que nunca se corte la actualización automática.
  const pronto = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: conexiones } = await admin
    .from('google_calendar_conexiones')
    .select('*')
    .eq('conectado', true)
    .lt('canal_expira', pronto);

  let renovados = 0;
  for (const conexion of conexiones || []) {
    try {
      if (conexion.canal_id && conexion.recurso_id) {
        const { access_token } = await refrescarAccessToken(conexion.refresh_token);
        await detenerCanalWatch(access_token, conexion.canal_id, conexion.recurso_id);
      }
      await registrarCanalWatch(admin, conexion.perfil_id);
      renovados++;
    } catch (e) {
      console.error('No se pudo renovar el canal de', conexion.perfil_id, e);
    }
  }

  return NextResponse.json({ ok: true, renovados });
}

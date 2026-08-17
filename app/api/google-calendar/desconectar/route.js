import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase-server';
import { refrescarAccessToken, detenerCanalWatch } from '../../../../lib/google-calendar-server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: conexion } = await admin
    .from('google_calendar_conexiones')
    .select('*')
    .eq('perfil_id', user.id)
    .single();

  if (conexion?.canal_id && conexion?.recurso_id) {
    try {
      const { access_token } = await refrescarAccessToken(conexion.refresh_token);
      await detenerCanalWatch(access_token, conexion.canal_id, conexion.recurso_id);
    } catch {
      // no pasa nada si esto falla, igual borramos todo abajo
    }
  }

  await admin.from('google_calendar_conexiones').delete().eq('perfil_id', user.id);
  await admin.from('blocks').delete().eq('perfil_id', user.id).eq('origen', 'google');

  return NextResponse.json({ ok: true });
}

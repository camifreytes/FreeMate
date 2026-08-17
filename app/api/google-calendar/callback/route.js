import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase-server';
import {
  intercambiarCodigoPorTokens,
  sincronizarUsuario,
  registrarCanalWatch,
} from '../../../../lib/google-calendar-server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorGoogle = searchParams.get('error');
  const cookieState = request.cookies.get('gcal_state')?.value;

  const volver = (resultado) =>
    NextResponse.redirect(`${origin}/perfil?gcal=${resultado}`);

  if (errorGoogle) return volver('cancelado');
  if (!code || !state || state !== cookieState) return volver('error');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const tokens = await intercambiarCodigoPorTokens(code);

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    await admin.from('google_calendar_conexiones').upsert(
      {
        perfil_id: user.id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expira_en: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        conectado: true,
      },
      { onConflict: 'perfil_id' }
    );

    await sincronizarUsuario(admin, user.id);
    await registrarCanalWatch(admin, user.id);
  } catch (e) {
    console.error('Error conectando Google Calendar:', e);
    return volver('error');
  }

  const res = volver('ok');
  res.cookies.delete('gcal_state');
  return res;
}

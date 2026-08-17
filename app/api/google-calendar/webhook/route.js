import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { sincronizarUsuario } from '../../../../lib/google-calendar-server';

// Google no manda qué cambió, solo avisa "algo cambió, andá a fijarte".
export async function POST(request) {
  const canalId = request.headers.get('x-goog-channel-id');
  const token = request.headers.get('x-goog-channel-token');
  const estado = request.headers.get('x-goog-resource-state');

  // El primer aviso al crear el canal es solo de confirmación, no hay cambios todavía
  if (!canalId || estado === 'sync') {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: conexion } = await admin
    .from('google_calendar_conexiones')
    .select('perfil_id, canal_token')
    .eq('canal_id', canalId)
    .single();

  // Si no lo reconocemos o el token no coincide, lo ignoramos en silencio
  if (!conexion || conexion.canal_token !== token) {
    return NextResponse.json({ ok: true });
  }

  try {
    await sincronizarUsuario(admin, conexion.perfil_id);
  } catch (e) {
    console.error('Error sincronizando desde el webhook:', e);
  }

  return NextResponse.json({ ok: true });
}

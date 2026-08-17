import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '../../../../lib/supabase-server';
import { sincronizarUsuario } from '../../../../lib/google-calendar-server';

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

  try {
    const resumen = await sincronizarUsuario(admin, user.id);
    return NextResponse.json({ ok: true, ...resumen });
  } catch (e) {
    console.error('Error sincronizando:', e);
    // Devolvemos el detalle para poder diagnosticar desde el navegador
    return NextResponse.json(
      { error: 'No se pudo sincronizar', detalle: String(e?.message || e) },
      { status: 500 }
    );
  }
}

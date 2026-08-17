import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '../../../../lib/supabase-server';

export async function GET(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // "state" evita que otra web nos mande a un callback falso
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline', // necesario para recibir un refresh_token
    prompt: 'consent', // fuerza a que Google nos dé refresh_token siempre, incluso si ya conectó antes
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  res.cookies.set('gcal_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}

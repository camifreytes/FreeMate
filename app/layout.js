import './globals.css';
import { createClient } from '../lib/supabase-server';
import TemaColor from '../components/TemaColor';

export const metadata = {
  title: 'FreeMate',
  description: 'Organizá juntadas con tus amigos',
};

export default async function RootLayout({ children }) {
  let colorFondo = null;
  let colorTexto = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('color_fondo, color_texto')
        .eq('id', user.id)
        .single();
      colorFondo = profile?.color_fondo || null;
      colorTexto = profile?.color_texto || null;
    }
  } catch {}

  const styleVars = {};
  if (colorFondo) styleVars['--bg'] = colorFondo;
  if (colorTexto) styleVars['--text'] = colorTexto;

  return (
    <html lang="es">
      <body style={styleVars}>
        <TemaColor colorFondo={colorFondo} colorTexto={colorTexto} />
        {children}
      </body>
    </html>
  );
}

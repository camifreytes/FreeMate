import { createClient } from '../../lib/supabase-server';
import PerfilClient from '../../components/PerfilClient';

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: conexionGoogle } = await supabase
    .from('google_calendar_conexiones')
    .select('conectado, ultima_sync')
    .eq('perfil_id', user.id)
    .single();

  return <PerfilClient profile={profile} userId={user.id} conexionGoogle={conexionGoogle} />;
}

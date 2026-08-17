import { createClient } from '../lib/supabase-server';
import HomeClient from '../components/HomeClient';
import Bienvenida from '../components/Bienvenida';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile && !profile.configurado) {
    return <Bienvenida userId={user.id} nombre={profile.nombre} />;
  }

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('grupo_id, groups(id, nombre, codigo)')
    .eq('perfil_id', user.id);

  const groups = [];
  if (memberRows) {
    for (const row of memberRows) {
      if (!row.groups) continue;
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('grupo_id', row.grupo_id);
      groups.push({
        id: row.groups.id,
        nombre: row.groups.nombre,
        codigo: row.groups.codigo,
        miembros: count || 1,
      });
    }
  }

  return <HomeClient profile={profile} user={user} groups={groups} />;
}

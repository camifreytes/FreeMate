import { createClient } from '../../../lib/supabase-server';
import GroupClient from '../../../components/GroupClient';

export default async function GrupoPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grupo } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();

  const { data: miembros } = await supabase
    .from('group_members')
    .select('perfil_id, rol, profiles(nombre, avatar_url)')
    .eq('grupo_id', id);

  const { data: misBloques } = await supabase
    .from('blocks')
    .select('*, block_visibility(grupo_id)')
    .eq('perfil_id', user.id);

  // Todos los grupos del usuario (para "aplicar a todos")
  const { data: misGruposRows } = await supabase
    .from('group_members')
    .select('grupo_id, groups(nombre)')
    .eq('perfil_id', user.id);
  const misGrupos = (misGruposRows || [])
    .filter((r) => r.groups)
    .map((r) => ({ id: r.grupo_id, nombre: r.groups.nombre }));

  // Bloques compartidos en este grupo (de todos los miembros), con su dueño
  const { data: visibles } = await supabase
    .from('block_visibility')
    .select('blocks(*, profiles(nombre, avatar_url)), grupo_id')
    .eq('grupo_id', id);

  const bloquesGrupo = (visibles || [])
    .map((v) => v.blocks)
    .filter(Boolean);

  // Agrupar bloques por persona, respetando el orden de miembros (yo primero)
  const bloquesPorPersona = [];
  const ordenMiembros = [
    user.id,
    ...(miembros || []).map((m) => m.perfil_id).filter((pid) => pid !== user.id),
  ];
  for (const pid of ordenMiembros) {
    const miembro = (miembros || []).find((m) => m.perfil_id === pid);
    if (!miembro) continue;
    const suyos = pid === user.id ? (misBloques || []) : bloquesGrupo.filter((b) => b.perfil_id === pid);
    // Última actualización = created_at más reciente entre sus bloques
    let ultima = null;
    for (const b of suyos) {
      if (b.created_at && (!ultima || b.created_at > ultima)) ultima = b.created_at;
    }
    bloquesPorPersona.push({
      perfilId: pid,
      nombre: miembro.profiles?.nombre || 'Sin nombre',
      avatar: miembro.profiles?.avatar_url || null,
      esYo: pid === user.id,
      bloques: suyos,
      ultimaActualizacion: ultima,
    });
  }

  // Juntadas del grupo (consulta base, siempre funciona)
  const { data: juntadasBase } = await supabase
    .from('meetups')
    .select('*, meetup_invitations(perfil_id, estado, profiles(nombre))')
    .eq('grupo_id', id)
    .order('fecha', { ascending: true });

  // Lugares propuestos + votos (en consulta aparte: si la tabla no existe todavía,
  // las juntadas igual se muestran, solo que sin lugares)
  let lugaresPorJuntada = {};
  const idsJuntadas = (juntadasBase || []).map((j) => j.id);
  if (idsJuntadas.length > 0) {
    const { data: lugares } = await supabase
      .from('meetup_lugares')
      .select('id, meetup_id, nombre, propuesto_por, creado_en, profiles(nombre), meetup_lugar_votos(perfil_id)')
      .in('meetup_id', idsJuntadas);
    for (const l of lugares || []) {
      (lugaresPorJuntada[l.meetup_id] ||= []).push(l);
    }
  }

  const juntadas = (juntadasBase || []).map((j) => ({
    ...j,
    meetup_lugares: lugaresPorJuntada[j.id] || [],
  }));

  return (
    <GroupClient
      grupo={grupo}
      miembros={miembros || []}
      userId={user.id}
      misBloques={misBloques || []}
      bloquesGrupo={bloquesGrupo}
      bloquesPorPersona={bloquesPorPersona}
      juntadas={juntadas || []}
      misGrupos={misGrupos}
    />
  );
}

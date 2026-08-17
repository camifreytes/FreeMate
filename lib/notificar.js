import { createClient } from './supabase-client';

// Crea una notificación para cada destinatario (lista de perfil_id)
export async function notificar(destinatarios, grupoId, tipo, texto) {
  if (!destinatarios || destinatarios.length === 0) return;
  const supabase = createClient();
  const filas = destinatarios.map((pid) => ({
    destinatario: pid,
    grupo_id: grupoId,
    tipo,
    texto,
  }));
  await supabase.from('notificaciones').insert(filas);
}

import { readDatabase } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Debe completar email y contraseña.' });
    }

    try {
      const supabase = getSupabaseClient();
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (user.password !== password) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (user.estado !== 'aprobado') {
        return res.status(403).json({ error: 'Tu cuenta aún no fue aprobada por administración.', user: { id: user.id, estado: user.estado } });
      }

      const { data: mascotas } = await supabase
        .from('mascotas')
        .select('*')
        .eq('usuario_id', user.id);

      return res.status(200).json({
        ok: true,
        user: {
          ...user,
          mascotas: Array.isArray(mascotas) ? mascotas : []
        }
      });
    } catch (supabaseError) {
      const db = await readDatabase();
      const user = db.users.find((item) => item.email.toLowerCase() === email && item.password === password);

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (user.estado !== 'aprobado') {
        return res.status(403).json({ error: 'Tu cuenta aún no fue aprobada por administración.', user: { id: user.id, estado: user.estado } });
      }

      return res.status(200).json({
        ok: true,
        user: {
          ...user,
          mascotas: Array.isArray(user.mascotas) ? user.mascotas : []
        }
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error validando credenciales.' });
  }
}

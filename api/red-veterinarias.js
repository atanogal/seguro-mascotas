import { readDatabase } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let redVaterinarias = [];
      let beneficios = [];

      try {
        const supabase = getSupabaseClient();

        const [redResponse, beneficiosResponse] = await Promise.all([
          supabase.from('red_veterinarias').select('*').order('nombre', { ascending: true }),
          supabase.from('beneficios').select('*').order('nombre', { ascending: true })
        ]);

        if (redResponse.error && redResponse.error.code !== 'PGRST116' && redResponse.error.code !== '42P01') {
          throw redResponse.error;
        }

        if (beneficiosResponse.error && beneficiosResponse.error.code !== 'PGRST116' && beneficiosResponse.error.code !== '42P01') {
          throw beneficiosResponse.error;
        }

        redVaterinarias = toArray(redResponse.data);
        beneficios = toArray(beneficiosResponse.data);
      } catch (supabaseError) {
        console.warn('Fallo de Supabase para red_veterinarias/beneficios:', supabaseError?.message || supabaseError);
      }

      const db = await readDatabase();

      return res.status(200).json({
        ok: true,
        red_veterinarias: redVaterinarias.length ? redVaterinarias : (db.red_veterinarias || []),
        beneficios: beneficios.length ? beneficios : (db.beneficios || [])
      });
    } catch (error) {
      return res.status(500).json({ error: 'No se pudo listar la red veterinaria.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const nombre = String(body.nombre || '').trim();
      const direccion = String(body.direccion || '').trim();
      const telefono = String(body.telefono || '').trim();
      const horario = String(body.horario || '').trim();
      const disponibilidad = String(body.disponibilidad_24hs || body.disponibilidad || '24 hs').trim();

      if (!nombre || !direccion || !telefono || !horario) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la clínica.' });
      }

      try {
        const supabase = getSupabaseClient();
        const clinicRecord = {
          nombre,
          direccion,
          telefono,
          horario,
          disponibilidad,
          disponibilidad_24hs: disponibilidad,
          servicios: Array.isArray(body.servicios) && body.servicios.length ? body.servicios : ['Urgencias', 'Consulta general'],
          created_at: new Date().toISOString()
        };

        const { data: inserted, error } = await supabase
          .from('red_veterinarias')
          .insert([clinicRecord])
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        return res.status(200).json({ ok: true, clinic: { ...inserted, disponibilidad: inserted.disponibilidad || inserted.disponibilidad_24hs || disponibilidad, disponibilidad_24hs: inserted.disponibilidad_24hs || inserted.disponibilidad || disponibilidad } });
      } catch (supabaseError) {
        const db = await readDatabase();
        const clinic = {
          id: `vet-${Date.now()}`,
          nombre,
          direccion,
          telefono,
          horario,
          disponibilidad,
          disponibilidad_24hs: disponibilidad,
          servicios: Array.isArray(body.servicios) && body.servicios.length ? body.servicios : ['Urgencias', 'Consulta general']
        };

        db.red_veterinarias = Array.isArray(db.red_veterinarias) ? db.red_veterinarias : [];
        db.red_veterinarias.unshift(clinic);
        await import('./_lib/store.js').then(({ writeDatabase }) => writeDatabase(db));

        return res.status(200).json({ ok: true, clinic, fallback: true });
      }
    } catch (error) {
      return res.status(500).json({ error: 'No se pudo registrar la clínica veterinaria.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido. Usa GET o POST.' });
}

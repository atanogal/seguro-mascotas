import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

function normalizeInvoiceForResponse(invoice = {}, user = {}) {
  const normalized = {
    ...invoice,
    id: invoice.id || invoice.numero || `fac-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    numero: invoice.numero || invoice.id || 'FC-C 0004-00000000',
    periodo: invoice.periodo || invoice.mes || 'Sin período',
    importe: Number(invoice.importe || invoice.monto || 0),
    vencimiento: invoice.vencimiento || invoice.fecha_vencimiento || 'Sin vencimiento',
    estado: invoice.estado || 'pendiente',
    barCode: invoice.barCode || invoice.bar_code || '',
    codigoPago: invoice.codigoPago || invoice.codigo_pago || '',
    fechaEmision: invoice.fechaEmision || invoice.fecha_emision || '',
    fechaAcreditacion: invoice.fechaAcreditacion || invoice.fecha_acreditacion || '',
    titular: invoice.titular || user.nombre || 'Titular',
    mascota: invoice.mascota || (Array.isArray(user.mascotas) && user.mascotas[0]?.nombre) || 'Mascota no registrada',
    plan: invoice.plan || user.plan || 'Plan',
    tipo: invoice.tipo || 'Rapipago / Pago Fácil',
    concepto: invoice.concepto || `Cobertura ${user.plan || 'Plan'} - Póliza #${user.poliza || 'PET-2026001'}`
  };

  normalized.usuario_id = invoice.usuario_id || user.id || null;
  return normalized;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      try {
        const supabase = getSupabaseClient();
        const [{ data: usuarios }, { data: mascotas }, { data: planes }, { data: red_veterinarias }, { data: beneficios }, { data: facturas }] = await Promise.all([
          supabase.from('usuarios').select('*'),
          supabase.from('mascotas').select('*'),
          supabase.from('planes').select('*'),
          supabase.from('red_veterinarias').select('*'),
          supabase.from('beneficios').select('*'),
          supabase.from('facturas').select('*')
        ]);

        if (Array.isArray(usuarios)) {
          const invoiceMap = new Map();
          (facturas || []).forEach((invoice) => {
            const key = invoice.usuario_id || invoice.usuarioId || 'sin-usuario';
            const list = invoiceMap.get(key) || [];
            list.push(normalizeInvoiceForResponse(invoice, { id: key }));
            invoiceMap.set(key, list);
          });

          const mappedUsers = usuarios.map((user) => ({
            ...user,
            plan_id: user.plan_id || user.plan || null,
            plan: user.plan || user.plan_id || 'Basico',
            facturas: invoiceMap.get(user.id) || [],
            mascotas: (mascotas || []).filter((pet) => pet.usuario_id === user.id)
          }));

          return res.status(200).json({ plans: planes || [], users: mappedUsers, red_veterinarias: red_veterinarias || [], beneficios: beneficios || [] });
        }
      } catch (supabaseError) {
        // Fallback to local JSON state below.
      }

      const db = await readDatabase();
      return res.status(200).json({
        ...db,
        red_veterinarias: db.red_veterinarias || [],
        beneficios: db.beneficios || []
      });
    } catch (error) {
      return res.status(500).json({ error: 'No se pudo leer la base de datos.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      const body = rawBody ? JSON.parse(rawBody) : {};

      if (body.action === 'replace') {
        const nextDb = await writeDatabase(body.payload || body.db || { plans: [], users: [] });
        return res.status(200).json(nextDb);
      }

      const current = await readDatabase();
      if (body.action === 'upsert-user') {
        const nextDb = normalizeDbState({
          plans: current.plans,
          users: current.users.filter((user) => user.id !== body.user.id).concat(body.user)
        });
        await writeDatabase(nextDb);
        return res.status(200).json(nextDb);
      }

      return res.status(400).json({ error: 'Acción no soportada en /api/usuarios.' });
    } catch (error) {
      return res.status(500).json({ error: 'Error procesando la solicitud.' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido.' });
}

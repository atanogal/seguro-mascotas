import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

function generatePolicyNumber() {
  return `PET-${new Date().getFullYear()}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function buildInvoiceForUser(user, plan, period, series, amount) {
  const number = Number(String(series).match(/(\d+)$/)?.[0] || '18493');
  const invoiceId = `fac-${String(number).padStart(8, '0')}`;
  const afipNumber = `FC-C 0004-${String(number).padStart(8, '0')}`;
  const paymentCode = `${String(number).padStart(14, '0')}`;

  return {
    id: invoiceId,
    numero: afipNumber,
    periodo: period,
    concepto: `Cobertura ${plan.nombre || user.plan || 'Plan'} - Póliza #${user.poliza || generatePolicyNumber()}`,
    vencimiento: `10/${period.includes('Noviembre') ? '11' : '10'}/${new Date().getFullYear()}`,
    importe: Number(amount || plan.precio || 0),
    estado: 'pendiente',
    cae: '74429183920194',
    barCode: `${paymentCode}2026101000450000071589421984210000184927`,
    fechaEmision: new Date().toISOString().slice(0, 10),
    codigoPago: paymentCode,
    titular: user.nombre,
    mascota: (user.mascotas || [])[0]?.nombre || 'Mascota no registrada',
    plan: plan.nombre || user.plan,
    tipo: 'Rapipago / Pago Fácil'
  };
}

function generateSeriesNumber(db) {
  const existing = db.users
    .flatMap((user) => user.facturas || [])
    .map((invoice) => Number((invoice.numero || '').match(/(\d+)$/)?.[0] || 0));
  const max = existing.length ? Math.max(...existing) : 18490;
  return max + 1;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    try {
      const supabase = getSupabaseClient();
      const userId = String(body.userId || '').trim();
      const { data: user, error: userError } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      if (body.action === 'approve') {
        const nextPolicy = user.poliza || generatePolicyNumber();
        const { data: updatedUser } = await supabase
          .from('usuarios')
          .update({ estado: 'aprobado', poliza: nextPolicy })
          .eq('id', user.id)
          .select('*')
          .single();

        const { data: mascotas } = await supabase.from('mascotas').select('*').eq('usuario_id', user.id);
        const firstInvoice = buildInvoiceForUser({ ...updatedUser, mascotas: mascotas || [] }, { nombre: updatedUser.plan || 'Plan Básico', precio: 15000 }, 'Octubre 2026', generateSeriesNumber({ users: [{ facturas: [] }] }), 15000);

        const { data: invoice } = await supabase
          .from('facturas')
          .insert([{ ...firstInvoice, usuario_id: user.id, fecha_emision: firstInvoice.fechaEmision, codigo_pago: firstInvoice.codigoPago, bar_code: firstInvoice.barCode }])
          .select('*')
          .single();

        return res.status(200).json({ ok: true, user: updatedUser, invoice, db: { users: [updatedUser], facturas: [invoice] } });
      }

      if (body.action === 'reject') {
        const { data: updatedUser } = await supabase
          .from('usuarios')
          .update({ estado: 'rechazado', poliza: null })
          .eq('id', user.id)
          .select('*')
          .single();

        return res.status(200).json({ ok: true, user: updatedUser, db: { users: [updatedUser] } });
      }
    } catch (supabaseError) {
      // fallback local JSON below
    }

    const db = await readDatabase();
    const user = db.users.find((item) => item.id === body.userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (body.action === 'approve') {
      user.estado = 'aprobado';
      user.poliza = user.poliza || generatePolicyNumber();
      user.facturas = Array.isArray(user.facturas) ? user.facturas : [];
      if (!user.facturas.length) {
        const plan = db.plans.find((item) => item.id === user.plan) || { id: 'Basico', nombre: 'Plan Básico', precio: 15000 };
        user.facturas.push(buildInvoiceForUser(user, plan, 'Octubre 2026', generateSeriesNumber(db), Number(plan.precio || 15000)));
      }
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, user, db: nextDb });
    }

    if (body.action === 'reject') {
      user.estado = 'rechazado';
      user.poliza = null;
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, user, db: nextDb });
    }

    return res.status(400).json({ error: 'Acción no soportada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar la aprobación del usuario.' });
  }
}

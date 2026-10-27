import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

function generatePolicyNumber() {
  return `PET-${new Date().getFullYear()}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function buildInvoicePayload(user, plan, period, amount, numberOverride) {
  const series = numberOverride || Date.now();
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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      try {
        const supabase = getSupabaseClient();
        const { data: facturas, error } = await supabase.from('facturas').select('*').order('fecha_emision', { ascending: false });
        if (!error && Array.isArray(facturas)) {
          const { data: usuarios } = await supabase.from('usuarios').select('id,nombre,email');
          const userMap = new Map((usuarios || []).map((user) => [user.id, user]));
          return res.status(200).json({ ok: true, facturas: facturas.map((invoice) => ({ ...invoice, titular: userMap.get(invoice.usuario_id)?.nombre || invoice.titular || 'Titular' })) });
        }
      } catch (supabaseError) {
        // fallback below
      }

      const db = await readDatabase();
      const facturas = db.users.flatMap((user) => (user.facturas || []).map((invoice) => ({ ...invoice, usuarioId: user.id, titular: user.nombre })));
      return res.status(200).json({ ok: true, facturas });
    } catch (error) {
      return res.status(500).json({ error: 'No se pudieron listar las facturas.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa GET o POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;

    try {
      const supabase = getSupabaseClient();

      if (action === 'mark-paid') {
        const { data: invoice, error } = await supabase
          .from('facturas')
          .update({ estado: 'pagada', fecha_acreditacion: new Date().toISOString() })
          .eq('id', body.invoiceId)
          .select('*')
          .single();

        if (error) throw error;
        return res.status(200).json({ ok: true, invoice, db: { facturas: [invoice] } });
      }

      if (action === 'mark-pending') {
        const { data: invoice, error } = await supabase
          .from('facturas')
          .update({ estado: 'pendiente', fecha_acreditacion: null })
          .eq('id', body.invoiceId)
          .select('*')
          .single();

        if (error) throw error;
        return res.status(200).json({ ok: true, invoice, db: { facturas: [invoice] } });
      }

      if (action === 'create-liquidation') {
        const { data: user } = await supabase.from('usuarios').select('*').eq('id', body.userId).maybeSingle();
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const { data: mascotas } = await supabase.from('mascotas').select('*').eq('usuario_id', user.id);
        const plan = { nombre: user.plan || 'Plan Básico', precio: 15000 };
        const invoice = buildInvoicePayload({ ...user, mascotas: mascotas || [] }, plan, 'Noviembre 2026', plan.precio, Date.now());

        const { data: insertedInvoice, error: insertError } = await supabase
          .from('facturas')
          .insert([{ ...invoice, usuario_id: user.id, fecha_emision: invoice.fechaEmision, codigo_pago: invoice.codigoPago, bar_code: invoice.barCode }])
          .select('*')
          .single();

        if (insertError) throw insertError;
        return res.status(200).json({ ok: true, invoice: insertedInvoice });
      }
    } catch (supabaseError) {
      // fallback local implementation below
    }

    const db = await readDatabase();
    const user = db.users.find((item) => item.id === body.userId) || db.users.find((item) => Array.isArray(item.facturas) && item.facturas.some((invoice) => invoice.id === body.invoiceId));

    if (action === 'mark-paid' || action === 'acreditar-pago') {
      const targetInvoice = (user?.facturas || []).find((invoice) => invoice.id === body.invoiceId);
      if (!targetInvoice) return res.status(404).json({ error: 'Factura no encontrada.' });
      targetInvoice.estado = 'pagada';
      targetInvoice.fechaAcreditacion = new Date().toISOString();
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, invoice: targetInvoice, db: nextDb });
    }

    if (action === 'mark-pending' || action === 'revertir-pago') {
      const targetInvoice = (user?.facturas || []).find((invoice) => invoice.id === body.invoiceId);
      if (!targetInvoice) return res.status(404).json({ error: 'Factura no encontrada.' });
      targetInvoice.estado = 'pendiente';
      delete targetInvoice.fechaAcreditacion;
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, invoice: targetInvoice, db: nextDb });
    }

    if (action === 'create-liquidation') {
      if (!user || user.rol !== 'usuario') {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      const plan = db.plans.find((item) => item.id === user.plan) || db.plans[0];
      const invoice = buildInvoicePayload(user, plan, 'Noviembre 2026', Number(plan.precio || 0), Date.now());
      user.facturas = Array.isArray(user.facturas) ? user.facturas : [];
      user.facturas.push(invoice);
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, invoice, db: nextDb });
    }

    return res.status(400).json({ error: 'Acción de cobranzas no soportada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error procesando la cobranza.' });
  }
}

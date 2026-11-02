import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

function generatePolicyNumber() {
  return `PET-${new Date().getFullYear()}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function buildInvoiceTemplate(user, plan, period, amount) {
  const number = Date.now();
  const paymentCode = `${String(number).slice(-12)}`;
  return {
    id: `fac-${String(number).slice(-8)}`,
    numero: `FC-C ${String(Math.floor(Math.random() * 9000) + 1000)}-${String(number).slice(-6)}`,
    periodo,
    concepto: `Cobertura ${plan.nombre || user.plan || 'Plan'} - Póliza #${user.poliza || 'PET-2026001'}`,
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

function normalizeInvoiceShape(invoice = {}, user = {}) {
  return {
    ...invoice,
    id: invoice.id || invoice.numero || `fac-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    numero: invoice.numero || invoice.id || 'FC-C 0004-00000000',
    importe: Number(invoice.importe || invoice.monto || 0),
    periodo: invoice.periodo || invoice.mes || 'Sin período',
    vencimiento: invoice.vencimiento || invoice.fecha_vencimiento || 'Sin vencimiento',
    concepto: invoice.concepto || `Cobertura ${user.plan || invoice.plan || 'Plan'} - Póliza #${user.poliza || 'PET-2026001'}`,
    estado: invoice.estado || 'pendiente',
    barCode: invoice.barCode || invoice.bar_code || '',
    codigoPago: invoice.codigoPago || invoice.codigo_pago || '',
    fechaEmision: invoice.fechaEmision || invoice.fecha_emision || '',
    fechaAcreditacion: invoice.fechaAcreditacion || invoice.fecha_acreditacion || '',
    titular: invoice.titular || user.nombre || 'Titular',
    mascota: invoice.mascota || (Array.isArray(user.mascotas) && user.mascotas[0]?.nombre) || 'Mascota no registrada',
    tipo: invoice.tipo || 'Rapipago / Pago Fácil',
    plan: invoice.plan || user.plan || 'Plan'
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const userId = req.query?.userId || req.query?.usuario_id || null;

      try {
        const supabase = getSupabaseClient();
        let query = supabase.from('facturas').select('*');
        if (userId) {
          query = query.eq('usuario_id', userId);
        }

        const { data: facturas, error } = await query.order('fecha_emision', { ascending: false });
        if (!error && Array.isArray(facturas)) {
          const { data: usuarios } = await supabase.from('usuarios').select('id,nombre,email,plan,poliza,mascotas');
          const userMap = new Map((usuarios || []).map((user) => [user.id, user]));
          return res.status(200).json({
            ok: true,
            facturas: facturas.map((invoice) => normalizeInvoiceShape(invoice, userMap.get(invoice.usuario_id) || {}))
          });
        }
      } catch (supabaseError) {
        // fallback below
      }

      const db = await readDatabase();
      const facturas = db.users
        .filter((user) => !userId || user.id === userId)
        .flatMap((user) => (user.facturas || []).map((invoice) => ({
          ...normalizeInvoiceShape(invoice, user),
          usuarioId: user.id,
          titular: user.nombre
        })));
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
    const db = await readDatabase();
    const user = db.users.find((item) => item.id === body.userId) || null;

    if (!user && body.action !== 'informar-pago' && body.action !== 'acreditar-pago' && body.action !== 'revertir-pago' && body.action !== 'create-liquidation') {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (body.action === 'informar-pago') {
      const targetUser = db.users.find((item) => Array.isArray(item.facturas) && item.facturas.some((invoice) => invoice.id === body.invoiceId));
      const invoice = targetUser?.facturas?.find((item) => item.id === body.invoiceId);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada.' });
      invoice.estado = 'en_revision';
      invoice.fechaRevision = new Date().toISOString();
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'acreditar-pago') {
      const targetUser = db.users.find((item) => Array.isArray(item.facturas) && item.facturas.some((invoice) => invoice.id === body.invoiceId));
      const invoice = targetUser?.facturas?.find((item) => item.id === body.invoiceId);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada.' });
      invoice.estado = 'pagada';
      invoice.fechaAcreditacion = new Date().toISOString();
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'revertir-pago') {
      const targetUser = db.users.find((item) => Array.isArray(item.facturas) && item.facturas.some((invoice) => invoice.id === body.invoiceId));
      const invoice = targetUser?.facturas?.find((item) => item.id === body.invoiceId);
      if (!invoice) return res.status(404).json({ error: 'Factura no encontrada.' });
      invoice.estado = 'pendiente';
      delete invoice.fechaAcreditacion;
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'create-liquidation') {
      if (!user || user.rol !== 'usuario') {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      const plan = db.plans.find((item) => item.id === user.plan) || db.plans[0];
      const nextInvoice = buildInvoiceTemplate(user, plan, 'Noviembre 2026', Number(plan.precio || 0));
      user.facturas = Array.isArray(user.facturas) ? user.facturas : [];
      user.facturas.push(nextInvoice);
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice: nextInvoice });
    }

    return res.status(400).json({ error: 'Acción de factura no soportada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error procesando la factura.' });
  }
}

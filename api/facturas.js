import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const db = await readDatabase();
    const user = db.users.find((item) => item.id === body.userId) || null;

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const invoice = (user.facturas || []).find((item) => item.id === body.invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    if (body.action === 'informar-pago') {
      invoice.estado = 'en_revision';
      invoice.fechaRevision = new Date().toISOString();
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'acreditar-pago') {
      invoice.estado = 'pagada';
      invoice.fechaAcreditacion = new Date().toISOString();
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'revertir-pago') {
      invoice.estado = 'pendiente';
      delete invoice.fechaAcreditacion;
      const nextDb = normalizeDbState({ plans: db.plans, users: db.users });
      await writeDatabase(nextDb);
      return res.status(200).json({ ok: true, db: nextDb, invoice });
    }

    if (body.action === 'create-liquidation') {
      const plan = db.plans.find((item) => item.id === user.plan) || db.plans[0];
      const nextInvoice = {
        id: `fac-${Date.now()}`,
        numero: `FC-C ${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Date.now()).slice(-6)}`,
        periodo: 'Noviembre 2026',
        concepto: `Cobertura ${plan.nombre || user.plan || 'Plan'} - Póliza #${user.poliza || 'PET-2026001'}`,
        vencimiento: '10/11/2026',
        importe: Number(plan.precio || 0),
        estado: 'pendiente',
        cae: '74429183920194',
        barCode: '0004000184922026101000450000071589421984210000184927',
        fechaEmision: new Date().toISOString().slice(0, 10),
        codigoPago: String(Date.now()).slice(-12),
        titular: user.nombre,
        mascota: (user.mascotas || [])[0]?.nombre || 'Mascota no registrada',
        plan: plan.nombre || user.plan,
        tipo: 'Rapipago / Pago Fácil'
      };
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

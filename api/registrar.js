import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const nombre = String(body.nombre || body.nombreCompleto || '').trim();
    const dni = String(body.dni || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const telefono = String(body.telefono || '').trim();
    const password = String(body.password || '').trim();
    const mascotaNombre = String(body.mascotaNombre || '').trim();
    const especie = String(body.especie || '').trim();
    const edad = Number(body.edad ?? 0);
    const plan = String(body.plan || '').trim();

    if (!nombre || !dni || !email || !telefono || !password || !mascotaNombre || !especie || !plan) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del alta del afiliado.' });
    }

    const db = await readDatabase();
    const emailExists = db.users.some((user) => user.email.toLowerCase() === email);
    if (emailExists) {
      return res.status(409).json({ error: 'Ya existe una cuenta asociada a ese correo electrónico.' });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      nombre,
      dni,
      email,
      password,
      telefono,
      rol: 'usuario',
      estado: 'pendiente',
      plan,
      poliza: null,
      facturas: [],
      mascotas: [{ id: `pet-${Date.now()}`, nombre: mascotaNombre, especie, edad: Number.isFinite(edad) ? edad : 0 }]
    };

    const nextDb = normalizeDbState({
      plans: db.plans,
      users: [...db.users, newUser]
    });

    await writeDatabase(nextDb);
    return res.status(201).json({ ok: true, user: newUser, db: nextDb });
  } catch (error) {
    return res.status(500).json({ error: 'Error creando el registro del usuario.' });
  }
}
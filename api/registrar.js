import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';
import { getSupabaseClient } from './supabaseClient.js';

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
    const mascotasPayload = Array.isArray(body.mascotas) ? body.mascotas : [];

    const normalizedMascotas = mascotasPayload.length
      ? mascotasPayload.map((pet) => ({
          nombre: String(pet?.nombre || mascotaNombre || '').trim(),
          especie: String(pet?.especie || especie || 'Perro').trim() || 'Perro',
          edad: Number(pet?.edad ?? edad ?? 0)
        }))
      : [{ nombre: mascotaNombre, especie: especie || 'Perro', edad: Number.isFinite(edad) ? edad : 0 }];

    if (!nombre || !dni || !email || !telefono || !password || !normalizedMascotas.length || !normalizedMascotas.every((pet) => pet.nombre && pet.especie) || !plan) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del alta del afiliado.' });
    }

    try {
      const supabase = getSupabaseClient();
      const { data: existingUser, error: existingError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existingUser) {
        return res.status(409).json({ error: 'Ya existe una cuenta asociada a ese correo electrónico.' });
      }

      const userId = crypto.randomUUID();
      const { data: newUser, error: userError } = await supabase
        .from('usuarios')
        .insert([{ id: userId, nombre, dni, email, password, telefono, rol: 'usuario', estado: 'pendiente', plan, plan_id: plan, poliza: null }])
        .select('*')
        .single();

      if (userError) throw userError;

      const petRows = normalizedMascotas.map((pet) => ({
        id: crypto.randomUUID(),
        usuario_id: newUser.id,
        nombre: pet.nombre,
        especie: pet.especie,
        edad: Number.isFinite(Number(pet.edad)) ? Number(pet.edad) : 0
      }));

      const { data: pets, error: petError } = await supabase
        .from('mascotas')
        .insert(petRows)
        .select('*');

      if (petError) throw petError;

      return res.status(201).json({ ok: true, user: { ...newUser, mascotas: pets || petRows }, db: { users: [newUser], plans: [] } });
    } catch (supabaseError) {
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
        plan_id: plan,
        poliza: null,
        facturas: [],
        mascotas: normalizedMascotas.map((pet, index) => ({ id: `pet-${Date.now()}-${index}`, nombre: pet.nombre, especie: pet.especie, edad: Number.isFinite(Number(pet.edad)) ? Number(pet.edad) : 0 }))
      };

      const nextDb = normalizeDbState({ plans: db.plans, users: [...db.users, newUser] });
      await writeDatabase(nextDb);
      return res.status(201).json({ ok: true, user: newUser, db: nextDb });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error creando el registro del usuario.' });
  }
}
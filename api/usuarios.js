import { readDatabase, writeDatabase, normalizeDbState } from './_lib/store.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const db = await readDatabase();
      return res.status(200).json(db);
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

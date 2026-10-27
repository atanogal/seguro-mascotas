import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultStorePath = process.env.PETSAFE_DB_PATH || path.join(__dirname, '..', 'data', 'petsafe-db.json');

export function createSeedData() {
  return {
    plans: [
      {
        id: 'Basico',
        nombre: 'Plan Básico',
        precio: 15000,
        descripcion: 'Cobertura esencial para vacunas y guardia veterinaria.',
        cobertura: ['Vacunas', 'Guardia veterinaria 24hs'],
        tope: 'Hasta $120.000',
        servicios: ['Vacunación', 'Hospitalización básica']
      },
      {
        id: 'Completo',
        nombre: 'Plan Completo',
        precio: 28000,
        descripcion: 'Cobertura ampliada para diagnósticos y cirugías.',
        cobertura: ['Cirugías', 'Estudios de diagnóstico'],
        tope: 'Hasta $250.000',
        servicios: ['Cirugías', 'Diagnósticos', 'Consultas']
      },
      {
        id: 'Premium',
        nombre: 'Plan Premium',
        precio: 42000,
        descripcion: 'Cobertura total con atención prioritaria.',
        cobertura: ['Internación', 'Farmacia', 'Atención prioritaria'],
        tope: 'Sin tope',
        servicios: ['Internación', 'Farmacia', 'Urgencias 24hs']
      }
    ],
    users: [
      {
        id: 'admin-1',
        nombre: 'Administrador PetSafe',
        email: 'admin@petsafe.com',
        password: 'admin123',
        telefono: '+54 11 4000-0000',
        rol: 'admin',
        estado: 'aprobado',
        plan: 'Premium',
        facturas: []
      },
      {
        id: 'user-1',
        nombre: 'María López',
        email: 'usuario@petsafe.com',
        password: 'user123',
        telefono: '+54 11 2233-3333',
        rol: 'usuario',
        estado: 'aprobado',
        plan: 'Premium',
        poliza: 'PET-2026001',
        dni: '20-12345678-9',
        mascotas: [{ id: 'pet-1', nombre: 'Luna', especie: 'Perro', edad: 3 }],
        facturas: [
          {
            id: 'fac-00018490',
            numero: 'FC-C 0004-00018490',
            periodo: 'Agosto 2026',
            concepto: 'Cobertura Plan Premium - Póliza #PET-2026001',
            vencimiento: '10/08/2026',
            importe: 42000,
            estado: 'pagada',
            cae: '74429183920194',
            barCode: '0004000184902026081000450000071589421984210000184927',
            fechaEmision: '2026-08-01',
            codigoPago: '000400018490',
            titular: 'María López',
            mascota: 'Luna',
            plan: 'Plan Premium',
            tipo: 'Rapipago / Pago Fácil',
            fechaAcreditacion: '2026-08-02'
          },
          {
            id: 'fac-00018491',
            numero: 'FC-C 0004-00018491',
            periodo: 'Septiembre 2026',
            concepto: 'Cobertura Plan Premium - Póliza #PET-2026001',
            vencimiento: '10/09/2026',
            importe: 42000,
            estado: 'pagada',
            cae: '74429183920195',
            barCode: '0004000184912026091000450000071589421984210000184927',
            fechaEmision: '2026-09-01',
            codigoPago: '000400018491',
            titular: 'María López',
            mascota: 'Luna',
            plan: 'Plan Premium',
            tipo: 'Rapipago / Pago Fácil',
            fechaAcreditacion: '2026-09-02'
          },
          {
            id: 'fac-00018492',
            numero: 'FC-C 0004-00018492',
            periodo: 'Octubre 2026',
            concepto: 'Cobertura Plan Premium - Póliza #PET-2026001',
            vencimiento: '10/10/2026',
            importe: 42000,
            estado: 'pendiente',
            cae: '74429183920196',
            barCode: '0004000184922026101000450000071589421984210000184927',
            fechaEmision: '2026-10-01',
            codigoPago: '000400018492',
            titular: 'María López',
            mascota: 'Luna',
            plan: 'Plan Premium',
            tipo: 'Rapipago / Pago Fácil'
          }
        ]
      }
    ]
  };
}

export function normalizeDbState(data = {}) {
  const plans = Array.isArray(data?.plans) ? data.plans : [];
  const users = Array.isArray(data?.users)
    ? data.users.map((user) => ({
        ...user,
        dni: user.dni || '',
        facturas: Array.isArray(user.facturas)
          ? user.facturas.map((invoice) => ({
              ...invoice,
              estado: invoice.estado || 'pendiente',
              importe: Number(invoice.importe || 0),
              apunte: invoice.apunte || 'Cobertura mensual'
            }))
          : [],
        mascotas: Array.isArray(user.mascotas) ? user.mascotas : []
      }))
    : [];

  return { plans, users };
}

async function ensureStoreFile() {
  try {
    await fs.mkdir(path.dirname(defaultStorePath), { recursive: true });
    await fs.access(defaultStorePath);
  } catch {
    const base = createSeedData();
    await fs.writeFile(defaultStorePath, JSON.stringify(base, null, 2), 'utf8');
  }
}

export async function readDatabase() {
  await ensureStoreFile();
  const raw = await fs.readFile(defaultStorePath, 'utf8');
  if (!raw || raw.trim() === '') {
    const base = createSeedData();
    await fs.writeFile(defaultStorePath, JSON.stringify(base, null, 2), 'utf8');
    return base;
  }

  try {
    return normalizeDbState(JSON.parse(raw));
  } catch {
    const base = createSeedData();
    await fs.writeFile(defaultStorePath, JSON.stringify(base, null, 2), 'utf8');
    return base;
  }
}

export async function writeDatabase(nextState) {
  const normalized = normalizeDbState(nextState);
  await ensureStoreFile();
  await fs.writeFile(defaultStorePath, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

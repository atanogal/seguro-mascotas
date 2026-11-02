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
        cobertura: ['Vacunas y desparasitación', 'Guardia veterinaria 24hs', 'Consulta médica general'],
        tope: 'Hasta $120.000',
        servicios: ['Vacunación', 'Hospitalización básica'],
        copago: '20% sobre estudios y cirugías',
        tipo: 'Mensual'
      },
      {
        id: 'Completo',
        nombre: 'Plan Completo',
        precio: 28000,
        descripcion: 'Cobertura ampliada para diagnósticos y cirugías.',
        cobertura: ['Cirugías y procedimientos quirúrgicos', 'Estudios de diagnóstico', 'Hospitalización clínica'],
        tope: 'Hasta $250.000',
        servicios: ['Cirugías', 'Diagnósticos', 'Consultas'],
        copago: '10% sobre procedimientos complejos',
        tipo: 'Mensual'
      },
      {
        id: 'Premium',
        nombre: 'Plan Premium',
        precio: 42000,
        descripcion: 'Cobertura total con atención prioritaria.',
        cobertura: ['Cobertura total 100%', 'Internación y cuidados intensivos', 'Farmacia y medicamentos'],
        tope: 'Sin tope',
        servicios: ['Internación', 'Farmacia', 'Urgencias 24hs'],
        copago: 'Sin copago',
        tipo: 'Mensual'
      },
      {
        id: 'Multimascota',
        nombre: 'Plan Multimascota',
        precio: 36000,
        descripcion: 'Ideal para hogares con más de una mascota y beneficios corporativos.',
        cobertura: ['Cobertura para 2 o más mascotas', 'Descuentos en alimentos y farmacia', 'Cobertura de urgencias 24hs'],
        tope: 'Hasta $400.000',
        servicios: ['Atención familiar', 'Urgencias 24hs', 'Beneficios de red'],
        copago: '15% en procedimientos con mayor complejidad',
        tipo: 'Mensual'
      }
    ],
    red_veterinarias: [
      {
        id: 'vet-1',
        nombre: 'Clínica Veterinaria del Sur',
        direccion: 'Av. Rivadavia 5500, CABA',
        disponibilidad: '24 hs',
        servicios: ['Urgencias', 'Hospitalización', 'Cirugías'],
        telefono: '+54 11 4300-9922'
      },
      {
        id: 'vet-2',
        nombre: 'Animal Care Las Flores',
        direccion: 'Calle 9 de Julio 1800, Buenos Aires',
        disponibilidad: '24 hs',
        servicios: ['Atención continua', 'Laboratorio', 'Farmacia'],
        telefono: '+54 11 4444-1231'
      },
      {
        id: 'vet-3',
        nombre: 'PetClinic Emergencias',
        direccion: 'Belgrano 4200, CABA',
        disponibilidad: '24 hs',
        servicios: ['Traumatología', 'Internación', 'Rehabilitación'],
        telefono: '+54 11 4831-5400'
      }
    ],
    beneficios: [
      { id: 'benef-1', nombre: 'Descuentos en alimentos', descripcion: 'Hasta 20% off en marcas líderes de alimentación.', tipo: 'Alimentos' },
      { id: 'benef-2', nombre: 'Farmacias asociadas', descripcion: 'Descuentos en medicamentos y atención veterinaria.', tipo: 'Farmacia' },
      { id: 'benef-3', nombre: 'Bancos aliados', descripcion: 'Financiación por cuotas y beneficios de pago.', tipo: 'Financiero' }
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
        plan_id: 'Premium',
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
        plan_id: 'Premium',
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
  const plans = Array.isArray(data?.plans)
    ? data.plans.map((plan) => ({
        ...plan,
        id: String(plan.id || plan.nombre || 'plan'),
        nombre: plan.nombre || plan.id || 'Plan',
        precio: Number(plan.precio || 0),
        cobertura: Array.isArray(plan.cobertura) ? plan.cobertura : Array.isArray(plan.servicios) ? plan.servicios : [],
        servicios: Array.isArray(plan.servicios) ? plan.servicios : Array.isArray(plan.cobertura) ? plan.cobertura : [],
        copago: plan.copago || plan.copagos || 'Sin copago'
      }))
    : [];

  const red_veterinarias = Array.isArray(data?.red_veterinarias) ? data.red_veterinarias : [];
  const beneficios = Array.isArray(data?.beneficios) ? data.beneficios : [];
  const users = Array.isArray(data?.users)
    ? data.users.map((user) => ({
        ...user,
        plan_id: user.plan_id || user.plan || null,
        plan: user.plan || user.plan_id || (plans[0] && plans[0].id) || 'Basico',
        dni: user.dni || '',
        facturas: Array.isArray(user.facturas)
          ? user.facturas.map((invoice) => {
              const normalizedInvoice = {
                ...invoice,
                id: invoice.id || invoice.numero || `fac-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
                numero: invoice.numero || invoice.id || 'FC-C 0004-00000000',
                periodo: invoice.periodo || 'Sin período',
                importe: Number(invoice.importe || 0),
                vencimiento: invoice.vencimiento || invoice.fecha_vencimiento || 'Sin vencimiento',
                estado: invoice.estado || 'pendiente',
                nota: invoice.nota || invoice.apunte || 'Cobertura mensual',
                barCode: invoice.barCode || invoice.bar_code || invoice.barcode || '',
                codigoPago: invoice.codigoPago || invoice.codigo_pago || invoice.codigo || '',
                fechaEmision: invoice.fechaEmision || invoice.fecha_emision || '',
                fechaAcreditacion: invoice.fechaAcreditacion || invoice.fecha_acreditacion || '',
                tipo: invoice.tipo || 'Rapipago / Pago Fácil',
                titular: invoice.titular || user.nombre || 'Titular',
                mascota: invoice.mascota || (Array.isArray(user.mascotas) && user.mascotas[0]?.nombre) || 'Mascota no registrada',
                concepto: invoice.concepto || `Cobertura ${invoice.plan || user.plan || 'Plan'} - Póliza #${user.poliza || 'PET-2026001'}`
              };

              if (!normalizedInvoice.barCode && normalizedInvoice.bar_code) {
                normalizedInvoice.barCode = normalizedInvoice.bar_code;
              }

              return normalizedInvoice;
            })
          : [],
        mascotas: Array.isArray(user.mascotas)
          ? user.mascotas.map((pet) => ({
              ...pet,
              nombre: pet.nombre || 'Mascota',
              especie: pet.especie || 'Perro',
              edad: Number(pet.edad || 0)
            }))
          : []
      }))
    : [];

  return { plans, users, red_veterinarias, beneficios };
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

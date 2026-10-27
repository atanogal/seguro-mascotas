const DB_KEY = 'petsafe_db';
const SESSION_KEY = 'petsafe_session';

const state = {
  authMode: 'login',
  authTab: 'login',
  adminTab: 'general',
  userTab: 'cuenta',
  activeSection: 'general',
  adminStateFilter: 'todos',
  adminPlanFilter: 'todos',
  flash: { type: '', text: '' }
};

document.addEventListener('DOMContentLoaded', async () => {
  await ensureSeedData();
  bindEvents();
  renderApp();
});

function bindEvents() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  document.getElementById('app').addEventListener('click', handleAppClick);
  document.getElementById('app').addEventListener('submit', handleAppSubmit);
  document.getElementById('app').addEventListener('change', handleAppChange);
}

async function ensureSeedData() {
  const existing = readDb();
  if (existing && Array.isArray(existing.users) && Array.isArray(existing.plans)) {
    const remoteDb = await refreshDbFromApi();
    return remoteDb || existing;
  }

  const remoteDb = await refreshDbFromApi();
  if (remoteDb) return remoteDb;

  try {
    const response = await fetch('/mockData.json');
    const data = await response.json();
    const normalized = normalizeDbState(data);
    writeDb(normalized);
    return normalized;
  } catch (error) {
    console.error('No se pudo cargar mockData.json:', error);
    const fallback = normalizeDbState({
      plans: [
        { id: 'Basico', nombre: 'Plan Básico', precio: 15000, descripcion: 'Vacunas y guardia 24hs.', cobertura: ['Vacunas', 'Guardia veterinaria 24hs'], tope: 'Hasta $120.000', servicios: ['Vacunación', 'Hospitalización básica'] },
        { id: 'Completo', nombre: 'Plan Completo', precio: 28000, descripcion: 'Cobertura ampliada.', cobertura: ['Cirugías', 'Estudios de diagnóstico'], tope: 'Hasta $250.000', servicios: ['Cirugías', 'Diagnósticos', 'Consultas'] },
        { id: 'Premium', nombre: 'Plan Premium', precio: 42000, descripcion: 'Cobertura total 100%.', cobertura: ['Internación', 'Farmacia', 'Atención prioritaria'], tope: 'Sin tope', servicios: ['Internación', 'Farmacia', 'Urgencias 24hs'] }
      ],
      users: [
        { id: 'admin-1', nombre: 'Administrador PetSafe', email: 'admin@petsafe.com', password: 'admin123', telefono: '+54 11 4000-0000', rol: 'admin', estado: 'aprobado', plan: 'Premium', facturas: [] },
        { id: 'user-1', nombre: 'María López', email: 'usuario@petsafe.com', password: 'user123', telefono: '+54 11 2233-3333', rol: 'usuario', estado: 'aprobado', plan: 'Premium', poliza: 'PET-2026001', dni: '20-12345678-9', mascotas: [{ id: 'pet-1', nombre: 'Luna', especie: 'Perro', edad: 3 }], facturas: [{ id: 'fac-00018490', numero: 'FC-C 0004-00018490', periodo: 'Agosto 2026', concepto: 'Cobertura Plan Premium - Póliza #PET-2026001', vencimiento: '10/08/2026', importe: 42000, estado: 'pagada', cae: '74429183920194', barCode: '0004000184902026081000450000071589421984210000184927', fechaEmision: '2026-08-01', codigoPago: '000400018490' }, { id: 'fac-00018491', numero: 'FC-C 0004-00018491', periodo: 'Septiembre 2026', concepto: 'Cobertura Plan Premium - Póliza #PET-2026001', vencimiento: '10/09/2026', importe: 42000, estado: 'pagada', cae: '74429183920195', barCode: '0004000184912026091000450000071589421984210000184927', fechaEmision: '2026-09-01', codigoPago: '000400018491' }, { id: 'fac-00018492', numero: 'FC-C 0004-00018492', periodo: 'Octubre 2026', concepto: 'Cobertura Plan Premium - Póliza #PET-2026001', vencimiento: '10/10/2026', importe: 42000, estado: 'pendiente', cae: '74429183920196', barCode: '0004000184922026101000450000071589421984210000184927', fechaEmision: '2026-10-01', codigoPago: '000400018492' }] }
      ]
    });
    writeDb(fallback);
    return fallback;
  }
}

function normalizeDbState(data) {
  const plans = Array.isArray(data?.plans) ? data.plans : [];
  const users = Array.isArray(data?.users) ? data.users.map((user) => ({
    ...user,
    dni: user.dni || '',
    facturas: Array.isArray(user.facturas) ? user.facturas.map((invoice) => ({
      ...invoice,
      estado: invoice.estado || 'pendiente',
      importe: Number(invoice.importe || 0),
      apunte: invoice.apunte || 'Cobertura mensual'
    })) : [],
    mascotas: Array.isArray(user.mascotas) ? user.mascotas : []
  })) : [];

  return { plans, users };
}

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error leyendo petsafe_db:', error);
    return null;
  }
}

function writeDb(stateData) {
  const normalized = normalizeDbState(stateData);
  localStorage.setItem(DB_KEY, JSON.stringify(normalized));

  if (typeof fetch === 'function') {
    fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'replace', payload: normalized })
    }).catch(() => {});
  }

  return normalized;
}

async function refreshDbFromApi() {
  try {
    const response = await fetch('/api/usuarios', { method: 'GET' });
    if (!response.ok) return null;
    const payload = await response.json();
    if (payload && Array.isArray(payload.users) && Array.isArray(payload.plans)) {
      const normalized = normalizeDbState(payload);
      localStorage.setItem(DB_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch (error) {
    console.warn('API no disponible. Se conserva la base local.', error);
  }
  return null;
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error leyendo sesión:', error);
    return null;
  }
}

function setSession(userId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const session = getSession();
  const db = readDb();
  if (!session || !db) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function getPlanById(planId) {
  const db = readDb();
  return db?.plans?.find((plan) => plan.id === planId) || null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'No se pudo completar la operación.');
  }

  return payload;
}

async function refreshStateFromApi() {
  try {
    const payload = await requestJson('/api/usuarios', { method: 'GET' });
    if (payload && Array.isArray(payload.users) && Array.isArray(payload.plans)) {
      writeDb(payload);
      return payload;
    }
  } catch (error) {
    console.warn('No se pudo sincronizar con la API:', error.message);
  }

  return readDb();
}

function setFlash(type, text) {
  state.flash = { type, text };
}

function generatePolicyNumber() {
  return `PET-${new Date().getFullYear()}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value || 0));
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    state.authMode = state.authMode || 'login';
    state.authTab = state.authMode;
    app.innerHTML = renderAuthScreen();
    return;
  }

  if (currentUser.rol === 'admin') {
    state.activeSection = state.adminTab;
    app.innerHTML = renderAdminApp();
  } else {
    state.activeSection = state.userTab;
    app.innerHTML = renderUserApp();
  }
}

function renderAuthScreen() {
  const db = readDb();
  const plans = db?.plans || [];
  const isRegister = state.authMode === 'register';
  const flashMarkup = state.flash.text ? `<div class="flash ${state.flash.type}">${state.flash.text}</div>` : '';

  return `
    <div class="auth-shell">
      <div class="auth-layout">
        <aside class="auth-hero">
          <div class="hero-inner">
            <span class="hero-badge">PETSAFE</span>
            <h1>Protección sin fricción para cada mascota.</h1>
            <p>Portal corporativo para gestión de pólizas, solicitudes de alta y facturación mensual con control operativo y trazabilidad.</p>
            <div class="hero-stats">
              <div class="stat-box"><strong>3</strong><span>planes</span></div>
              <div class="stat-box"><strong>24hs</strong><span>guardia</span></div>
              <div class="stat-box"><strong>96%</strong><span>retención</span></div>
            </div>
          </div>
        </aside>

        <main class="auth-card">
          <div class="form-shell">
            <div class="top-tabs" role="tablist">
              <button type="button" class="top-tab ${state.authMode === 'login' ? 'active' : ''}" data-action="switch-auth-mode" data-auth-tab="login">Iniciar sesión</button>
              <button type="button" class="top-tab ${isRegister ? 'active' : ''}" data-action="switch-auth-mode" data-auth-tab="register">Crear cuenta</button>
            </div>

            ${flashMarkup}

            <div>
              <h2 class="panel-title">${isRegister ? 'Solicitud de afiliación' : 'Acceso institucional'}</h2>
              <p class="subtle">${isRegister ? 'Ingresá tus datos para iniciar la solicitud de alta y revisión del asesor comercial.' : 'Ingresá tus credenciales para acceder al portal corporativo.'}</p>
            </div>

            ${isRegister ? `
              <form id="registerForm" class="signup-form">
                <div class="form-grid">
                  <div class="field"><label for="signupNombre">Nombre y Apellido</label><input id="signupNombre" name="nombreCompleto" type="text" required /></div>
                  <div class="field"><label for="signupDni">CUIL/DNI</label><input id="signupDni" name="dni" type="text" placeholder="20-12345678-9" required /></div>
                  <div class="field"><label for="signupEmail">Correo electrónico</label><input id="signupEmail" name="email" type="email" required /></div>
                  <div class="field"><label for="signupTelefono">Teléfono</label><input id="signupTelefono" name="telefono" type="tel" required /></div>
                  <div class="field"><label for="signupPassword">Contraseña</label><input id="signupPassword" name="password" type="password" required /></div>
                  <div class="field"><label for="signupPlan">Plan</label><select id="signupPlan" name="plan" required>
                    <option value="">Seleccioná plan</option>
                    ${plans.map((plan) => `<option value="${plan.id}">${plan.nombre}</option>`).join('')}
                  </select></div>
                  <div class="field"><label for="signupMascotaNombre">Nombre de la Mascota</label><input id="signupMascotaNombre" name="mascotaNombre" type="text" required /></div>
                  <div class="field"><label for="signupEspecie">Especie</label><select id="signupEspecie" name="especie" required>
                    <option value="">Seleccioná</option>
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                  </select></div>
                  <div class="field"><label for="signupEdad">Edad</label><input id="signupEdad" name="edad" type="number" min="0" max="25" required /></div>
                </div>
                <button type="submit" class="secondary-btn">Crear solicitud</button>
              </form>
            ` : `
              <form id="loginForm" class="login-form">
                <div class="field"><label for="loginEmail">Correo electrónico</label><input id="loginEmail" name="email" type="email" required /></div>
                <div class="field"><label for="loginPassword">Contraseña</label><input id="loginPassword" name="password" type="password" required /></div>
                <button type="submit" class="primary-btn">Ingresar</button>
              </form>
            `}
          </div>
        </main>
      </div>
    </div>
  `;
}

function renderAdminApp() {
  const db = readDb();
  const currentUser = getCurrentUser();
  const pendingUsers = db.users.filter((user) => user.rol === 'usuario' && user.estado === 'pendiente');
  const activeUsers = db.users.filter((user) => user.rol === 'usuario' && user.estado === 'aprobado');
  const rejectedUsers = db.users.filter((user) => user.rol === 'usuario' && user.estado === 'rechazado');
  const allRequests = db.users.filter((user) => user.rol === 'usuario');
  const filteredUsers = activeUsers.filter((user) => {
    if (state.adminStateFilter !== 'todos' && user.estado !== state.adminStateFilter) return false;
    if (state.adminPlanFilter !== 'todos' && user.plan !== state.adminPlanFilter) return false;
    return true;
  });

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">${brandSvg()}<div class="brand-copy"><strong>PETSAFE</strong><span>Seguros</span></div></div>
        <div class="nav-list">
          <button type="button" class="nav-item ${state.adminTab === 'general' ? 'active' : ''}" data-action="select-admin-tab" data-admin-tab="general">Panel general</button>
          <button type="button" class="nav-item ${state.adminTab === 'solicitudes' ? 'active' : ''}" data-action="select-admin-tab" data-admin-tab="solicitudes">Solicitudes</button>
          <button type="button" class="nav-item ${state.adminTab === 'coberturas' ? 'active' : ''}" data-action="select-admin-tab" data-admin-tab="coberturas">Coberturas</button>
          <button type="button" class="nav-item ${state.adminTab === 'cobranzas' ? 'active' : ''}" data-action="select-admin-tab" data-admin-tab="cobranzas">Cobranzas</button>
        </div>
        <div class="sidebar-footer">
          <div class="client-card">
            <strong>${currentUser?.nombre || 'Administrador'}</strong>
            <div>Rol: ADMIN</div>
            <button type="button" class="ghost-btn" data-action="logout" style="margin-top: 10px; width: 100%;">Cerrar sesión</button>
          </div>
        </div>
      </aside>

      <main class="content-panel">
        <header class="topbar">
          <div class="topbar-title"><small>Portal de gestión</small><h1>Panel institucional</h1></div>
          <div class="topbar-actions"><span class="role-pill">ADMIN</span></div>
        </header>

        ${renderAdminTabContent({ pendingUsers, activeUsers, rejectedUsers, allRequests, filteredUsers, db })}
      </main>
    </div>
  `;
}

function renderAdminTabContent({ pendingUsers, activeUsers, rejectedUsers, allRequests, filteredUsers, db }) {
  if (state.adminTab === 'general') {
    return `
      <section class="tab-panel active">
        <div class="metric-grid">
          <div class="metric-card"><small>Solicitudes</small><strong>${pendingUsers.length}</strong><span>Pendientes</span></div>
          <div class="metric-card"><small>Afiliados</small><strong>${activeUsers.length}</strong><span>Activos</span></div>
          <div class="metric-card"><small>Rechazos</small><strong>${rejectedUsers.length}</strong><span>En cartera</span></div>
        </div>
        <div class="content-grid">
          <div class="panel">
            <div class="panel-header"><h2>Últimas solicitudes</h2><span class="status-badge warning">${pendingUsers.length} total</span></div>
            <div class="table-wrap">
              ${pendingUsers.length ? `
                <table class="data-table">
                  <thead><tr><th>Solicitante</th><th>Plan</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    ${pendingUsers.slice(0, 5).map((user) => `
                      <tr>
                        <td><strong>${user.nombre}</strong><br /><span class="muted">${user.email}</span></td>
                        <td>${user.plan || 'Sin plan'}</td>
                        <td><span class="status-badge warning">Pendiente</span></td>
                        <td><div class="invoice-actions"><button type="button" class="approve-btn" data-action="approve-user" data-user-id="${user.id}">Aprobar</button><button type="button" class="reject-btn" data-action="reject-user" data-user-id="${user.id}">Rechazar</button></div></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<div class="empty-state">No hay solicitudes pendientes.</div>'}
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Resumen operacional</h3></div>
            <div class="summary-stack">
              <div class="info-box"><h3>Composición</h3><ul><li>Plan Premium: ${activeUsers.filter((user) => user.plan === 'Premium').length}</li><li>Plan Completo: ${activeUsers.filter((user) => user.plan === 'Completo').length}</li><li>Plan Básico: ${activeUsers.filter((user) => user.plan === 'Basico').length}</li></ul></div>
              <div class="info-box"><h3>Acciones rápidas</h3><ul><li>Revisar solicitudes</li><li>Emitir comprobantes</li><li>Actualizar coberturas</li></ul></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  if (state.adminTab === 'solicitudes') {
    return `
      <section class="tab-panel active">
        <div class="panel">
          <div class="panel-header"><h2>Solicitudes de alta</h2><span class="status-badge warning">${allRequests.length} registradas</span></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Solicitante</th><th>CUIL/DNI</th><th>Plan</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                ${allRequests.map((user) => `
                  <tr>
                    <td><strong>${user.nombre}</strong><br /><span class="muted">${user.email}</span></td>
                    <td class="number-cell">${user.dni || '—'}</td>
                    <td>${user.plan || 'Sin plan'}</td>
                    <td><span class="status-badge ${user.estado === 'aprobado' ? 'success' : user.estado === 'rechazado' ? 'warning' : 'warning'}">${user.estado === 'aprobado' ? 'Aprobado' : user.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}</span></td>
                    <td><div class="invoice-actions">${user.estado !== 'aprobado' ? `<button type="button" class="approve-btn" data-action="approve-user" data-user-id="${user.id}">Aprobar</button>` : ''}${user.estado !== 'rechazado' ? `<button type="button" class="reject-btn" data-action="reject-user" data-user-id="${user.id}">Rechazar</button>` : ''}</div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  if (state.adminTab === 'coberturas') {
    const allPlans = db.plans || [];
    const selectedPlan = state.adminPlanFilter === 'todos' ? null : state.adminPlanFilter;

    return `
      <section class="tab-panel active">
        <div class="panel">
          <div class="panel-header">
            <h2>Catálogo de coberturas</h2>
            <div class="field" style="min-width: 180px; margin:0;">
              <label for="adminPlanFilter" style="display:none;">Filtrar</label>
              <select id="adminPlanFilter" data-filter="admin-plan">
                <option value="todos" ${state.adminPlanFilter === 'todos' ? 'selected' : ''}>Todos</option>
                ${allPlans.map((plan) => `<option value="${plan.id}" ${state.adminPlanFilter === plan.id ? 'selected' : ''}>${plan.nombre}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="content-grid">
            ${(selectedPlan ? allPlans.filter((plan) => plan.id === selectedPlan) : allPlans).map((plan) => `
              <div class="plan-card ${selectedPlan ? 'active' : ''}">
                <strong>${plan.nombre}</strong>
                <div class="muted">${plan.descripcion}</div>
                <div class="price-tag">$ ${formatMoney(plan.precio)}</div>
                <div class="muted">Tope: ${plan.tope || 'Sin tope'}</div>
                <ul>${(plan.servicios || plan.cobertura || []).map((item) => `<li>${item}</li>`).join('')}</ul>
                <div class="muted" style="margin-top: 8px;">Cápitas activas: ${activeUsers.filter((user) => user.plan === plan.id).length}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="tab-panel active">
      <div class="panel">
        <div class="panel-header">
          <h2>Padrón de cobranzas</h2>
          <button type="button" class="primary-btn" data-action="create-liquidation">Emitir Nueva Liquidación</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Titular</th>
                <th>Póliza</th>
                <th>Período</th>
                <th>Comprobante</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${db.users.filter((user) => user.rol === 'usuario').flatMap((user) => (user.facturas || []).map((invoice) => `
                <tr>
                  <td><strong>${user.nombre}</strong><br /><span class="muted">${user.email}</span></td>
                  <td class="number-cell">${user.poliza || '—'}</td>
                  <td>${invoice.periodo || 'Sin período'}</td>
                  <td class="invoice-number">${invoice.numero || invoice.id}</td>
                  <td class="money-cell">$ ${formatMoney(invoice.importe || 0)}</td>
                  <td>
                    <span class="status-badge ${invoice.estado === 'pagada' ? 'success' : invoice.estado === 'en_revision' ? 'warning' : 'warning'}">
                      ${invoice.estado === 'pagada' ? 'Abonada' : invoice.estado === 'en_revision' ? 'En verificación' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div class="invoice-actions">
                      ${invoice.estado === 'pagada' ? `<button type="button" class="secondary-btn" data-action="revert-payment" data-invoice-id="${invoice.id}">Revertir a Pendiente</button>` : `<button type="button" class="primary-btn" data-action="accredit-payment" data-invoice-id="${invoice.id}">Acreditar Pago</button>`}
                      <button type="button" class="secondary-btn" data-action="open-invoice" data-user-id="${user.id}" data-invoice-id="${invoice.id}">Ver Cupón / PDF</button>
                    </div>
                  </td>
                </tr>
              `)).join('') || '<tr><td colspan="7"><div class="empty-state">No hay facturas registradas.</div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderUserApp() {
  const db = readDb();
  const currentUser = getCurrentUser();
  const user = currentUser || { nombre: 'Afiliado', rol: 'usuario', plan: 'Basico', facturas: [] };
  const plan = getPlanById(user.plan) || { id: 'Basico', nombre: 'Plan Básico', precio: 15000, descripcion: '', cobertura: [], servicios: [] };
  const invoices = Array.isArray(user.facturas) ? user.facturas : [];
  const pendingCount = invoices.filter((invoice) => invoice.estado === 'pendiente').length;

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-block">${brandSvg()}<div class="brand-copy"><strong>PETSAFE</strong><span>Seguros</span></div></div>
        <div class="nav-list">
          <button type="button" class="nav-item ${state.userTab === 'cuenta' ? 'active' : ''}" data-action="select-user-tab" data-user-tab="cuenta">Mi cuenta</button>
          <button type="button" class="nav-item ${state.userTab === 'cobertura' ? 'active' : ''}" data-action="select-user-tab" data-user-tab="cobertura">Cobertura</button>
          <button type="button" class="nav-item ${state.userTab === 'facturacion' ? 'active' : ''}" data-action="select-user-tab" data-user-tab="facturacion">Facturación</button>
          <button type="button" class="nav-item ${state.userTab === 'mascotas' ? 'active' : ''}" data-action="select-user-tab" data-user-tab="mascotas">Mascotas</button>
        </div>
        <div class="sidebar-footer">
          <div class="client-card">
            <strong>${user.nombre}</strong>
            <div>Rol: AFILIADO</div>
            <button type="button" class="ghost-btn" data-action="logout" style="margin-top: 10px; width: 100%;">Cerrar sesión</button>
          </div>
        </div>
      </aside>

      <main class="content-panel">
        <header class="topbar">
          <div class="topbar-title"><small>Portal cliente</small><h1>Estado de cuenta</h1></div>
          <div class="topbar-actions"><span class="role-pill">AFILIADO</span></div>
        </header>

        ${renderUserTabContent({ user, plan, invoices, pendingCount, db })}
      </main>
    </div>
  `;
}

function renderUserTabContent({ user, plan, invoices, pendingCount, db }) {
  if (state.userTab === 'cuenta') {
    return `
      <section class="tab-panel active">
        <div class="content-grid">
          <div class="panel">
            <div class="panel-header"><h2>Datos del titular</h2></div>
            <div class="summary-stack">
              <div class="info-box">
                <h3>Perfil</h3>
                <ul>
                  <li><strong>Nombre:</strong> ${user.nombre}</li>
                  <li><strong>CUIL/DNI:</strong> ${user.dni || 'Sin registro'}</li>
                  <li><strong>Email:</strong> ${user.email}</li>
                  <li><strong>Teléfono:</strong> ${user.telefono || 'Sin teléfono'}</li>
                  <li><strong>N° de Póliza:</strong> ${user.poliza || 'En trámite'}</li>
                  <li><strong>Estado:</strong> ${capitalize(user.estado || 'aprobado')}</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3>Actualizar datos</h3></div>
            <form id="profileForm" class="signup-form">
              <div class="field"><label for="profileTelefono">Teléfono</label><input id="profileTelefono" name="telefono" type="tel" value="${user.telefono || ''}" /></div>
              <div class="field"><label for="profileEmail">Email</label><input id="profileEmail" name="email" type="email" value="${user.email || ''}" /></div>
              <button type="submit" class="primary-btn">Guardar cambios</button>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  if (state.userTab === 'cobertura') {
    const otherPlans = (db.plans || []).filter((item) => item.id !== user.plan);
    return `
      <section class="tab-panel active">
        <div class="panel">
          <div class="panel-header"><h2>Detalle de cobertura</h2></div>
          <div class="summary-stack">
            <div class="plan-card active">
              <strong>${plan.nombre}</strong>
              <div class="muted">${plan.descripcion || 'Cobertura mensual'}</div>
              <div class="price-tag">$ ${formatMoney(plan.precio || 0)}</div>
              <ul>${(plan.cobertura || []).map((item) => `<li>${item}</li>`).join('')}</ul>
            </div>
            <div class="content-grid">
              ${otherPlans.map((planOption) => `
                <div class="plan-card">
                  <strong>${planOption.nombre}</strong>
                  <div class="muted">${planOption.descripcion}</div>
                  <div class="price-tag">$ ${formatMoney(planOption.precio)}</div>
                  <button type="button" class="secondary-btn" data-action="change-plan" data-plan-id="${planOption.id}">Solicitar Cambio de Plan</button>
                  <ul>${(planOption.cobertura || []).map((item) => `<li>${item}</li>`).join('')}</ul>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  if (state.userTab === 'facturacion') {
    return `
      <section class="tab-panel active">
        <div class="panel">
          <div class="panel-header"><h2>Facturación y pagos</h2></div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Comprobante</th><th>Periodo</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                ${(invoices.length ? invoices : []).map((invoice) => `
                  <tr>
                    <td class="invoice-number">${invoice.numero || invoice.id}</td>
                    <td>${invoice.periodo || 'Sin período'}</td>
                    <td class="number-cell">${invoice.vencimiento || '—'}</td>
                    <td class="money-cell">$ ${formatMoney(invoice.importe || 0)}</td>
                    <td>
                      <span class="status-badge ${invoice.estado === 'pagada' ? 'success' : invoice.estado === 'en_revision' ? 'warning' : 'warning'}">
                        ${invoice.estado === 'pagada' ? 'Abonada' : invoice.estado === 'en_revision' ? 'En verificación' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <div class="invoice-actions">
                        ${invoice.estado === 'pagada'
                          ? `<button type="button" class="primary-btn" data-action="open-invoice" data-user-id="${user.id}" data-invoice-id="${invoice.id}">Ver Comprobante (PDF)</button>`
                          : `<button type="button" class="primary-btn" data-action="open-invoice" data-user-id="${user.id}" data-invoice-id="${invoice.id}">Descargar Cupón de Pago (PDF)</button>
                            <button type="button" class="secondary-btn" data-action="inform-payment" data-invoice-id="${invoice.id}">Informar Pago Realizado</button>`}
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6"><div class="empty-state">No hay comprobantes para mostrar.</div></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="tab-panel active">
      <div class="panel">
        <div class="panel-header"><h2>Mascotas aseguradas</h2></div>
        <div class="summary-stack">
          ${(user.mascotas || []).length ? user.mascotas.map((pet) => `
            <div class="pet-card">
              <strong>${pet.nombre}</strong>
              <div class="muted">Especie: ${pet.especie}</div>
              <div class="muted">Edad: ${pet.edad} años</div>
              <div class="muted">N° de Credencial: ${pet.id || 'N/A'}</div>
            </div>
          `).join('') : '<div class="empty-state">No hay mascotas registradas.</div>'}
          <form id="addPetForm" class="add-pet-form" style="margin-top: 12px;">
            <div class="form-grid">
              <div class="field"><label for="petNombre">Nombre de la Mascota</label><input id="petNombre" name="petNombre" type="text" required /></div>
              <div class="field"><label for="petEspecie">Especie</label><select id="petEspecie" name="petEspecie" required><option value="">Seleccioná</option><option value="Perro">Perro</option><option value="Gato">Gato</option></select></div>
              <div class="field"><label for="petEdad">Edad</label><input id="petEdad" name="petEdad" type="number" min="0" max="25" required /></div>
            </div>
            <button type="submit" class="primary-btn">Agregar Mascota Adicional</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function handleAppClick(event) {
  const authButton = event.target.closest('[data-action="switch-auth-mode"]');
  if (authButton) {
    state.authMode = authButton.dataset.authTab === 'register' ? 'register' : 'login';
    state.authTab = state.authMode;
    state.flash = { type: '', text: '' };
    renderApp();
    return;
  }

  const adminTabButton = event.target.closest('[data-action="select-admin-tab"]');
  if (adminTabButton) {
    state.adminTab = adminTabButton.dataset.adminTab;
    state.activeSection = state.adminTab;
    renderApp();
    return;
  }

  const userTabButton = event.target.closest('[data-action="select-user-tab"]');
  if (userTabButton) {
    state.userTab = userTabButton.dataset.userTab;
    state.activeSection = state.userTab;
    renderApp();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  const { action, userId, planId, invoiceId } = actionButton.dataset;

  switch (action) {
    case 'logout':
      clearSession();
      state.authMode = 'login';
      state.authTab = 'login';
      state.flash = { type: '', text: '' };
      renderApp();
      break;
    case 'approve-user':
      approveUser(userId);
      break;
    case 'reject-user':
      rejectUser(userId);
      break;
    case 'change-plan':
      updateUserPlan(planId);
      break;
    case 'open-invoice':
      openInvoiceWindow(invoiceId, userId);
      break;
    case 'register-payment':
    case 'acreditar-pago':
    case 'accredit-payment':
      if (getCurrentUser()?.rol !== 'admin') {
        setFlash('error', 'Solo el administrador puede acreditar pagos.');
        renderApp();
        return;
      }
      accredInvoicePayment(invoiceId);
      break;
    case 'revert-payment':
    case 'revertir-pago':
      if (getCurrentUser()?.rol !== 'admin') {
        setFlash('error', 'Solo el administrador puede revertir pagos.');
        renderApp();
        return;
      }
      revertInvoiceToPending(invoiceId);
      break;
    case 'inform-payment':
    case 'informar-pago':
      informPaymentToReview(invoiceId);
      break;
    case 'create-liquidation':
      createNewLiquidation(userId);
      break;
    default:
      break;
  }
}

async function handleAppSubmit(event) {
  if (event.target.matches('#loginForm')) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '').trim();

    if (!email || !password) {
      setFlash('error', 'Completá email y contraseña para continuar.');
      renderApp();
      return;
    }

    try {
      const payload = await requestJson('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const user = payload.user;
      if (!user) {
        throw new Error('La API no devolvió usuario válido.');
      }

      setSession(user.id);
      state.flash = { type: '', text: '' };
      await refreshStateFromApi();
      renderApp();
      return;
    } catch (error) {
      setFlash('error', error.message || 'Las credenciales ingresadas no coinciden con ningún usuario.');
      renderApp();
      return;
    }
  }

  if (event.target.matches('#registerForm')) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const nombreCompleto = String(formData.get('nombreCompleto') || '').trim();
    const dni = String(formData.get('dni') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const telefono = String(formData.get('telefono') || '').trim();
    const password = String(formData.get('password') || '').trim();
    const mascotaNombre = String(formData.get('mascotaNombre') || '').trim();
    const especie = String(formData.get('especie') || '').trim();
    const edad = Number(formData.get('edad'));
    const plan = String(formData.get('plan') || '').trim();

    if (!nombreCompleto || !dni || !email || !telefono || !password || !mascotaNombre || !especie || !plan || !Number.isFinite(edad)) {
      setFlash('error', 'Completá todos los campos del alta para continuar.');
      renderApp();
      return;
    }

    try {
      const payload = await requestJson('/api/registrar', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombreCompleto,
          dni,
          email,
          telefono,
          password,
          mascotaNombre,
          especie,
          edad,
          plan
        })
      });

      await refreshStateFromApi();
      state.authMode = 'login';
      state.authTab = 'login';
      setFlash('success', 'Solicitud de afiliación registrada. Pendiente de aprobación por auditoría.');
      renderApp();
      return;
    } catch (error) {
      setFlash('error', error.message || 'No se pudo registrar la solicitud.');
      renderApp();
      return;
    }
  }

  if (event.target.matches('#addPetForm')) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const petNombre = String(formData.get('petNombre') || '').trim();
    const petEspecie = String(formData.get('petEspecie') || '').trim();
    const petEdad = Number(formData.get('petEdad'));
    const session = getSession();
    const db = readDb();
    const user = db.users.find((item) => item.id === session?.userId);

    if (!user) return;
    if (!petNombre || !petEspecie || !Number.isFinite(petEdad)) {
      setFlash('error', 'Completá nombre, especie y edad para agregar la mascota.');
      renderApp();
      return;
    }

    user.mascotas = user.mascotas || [];
    user.mascotas.push({ id: `pet-${Date.now()}`, nombre: petNombre, especie: petEspecie, edad: petEdad });
    writeDb(db);
    setFlash('success', 'La mascota fue registrada correctamente.');
    renderApp();
  }

  if (event.target.matches('#profileForm')) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = String(formData.get('email') || '').trim();
    const telefono = String(formData.get('telefono') || '').trim();
    const session = getSession();
    const db = readDb();
    const user = db.users.find((item) => item.id === session?.userId);

    if (!user) return;
    if (!email || !telefono) {
      setFlash('error', 'Completá email y teléfono para actualizar los datos.');
      renderApp();
      return;
    }

    user.email = email;
    user.telefono = telefono;
    writeDb(db);
    setFlash('success', 'Los datos de contacto fueron actualizados correctamente.');
    renderApp();
  }
}

function handleAppChange(event) {
  if (event.target.matches('#adminPlanFilter') || event.target.matches('[data-filter="admin-plan"]')) {
    state.adminPlanFilter = event.target.value;
    renderApp();
  }
}

async function approveUser(userId) {
  try {
    const payload = await requestJson('/api/aprobar', {
      method: 'POST',
      body: JSON.stringify({ userId, action: 'approve' })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('success', `La solicitud fue aprobada correctamente.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo aprobar la solicitud.');
    renderApp();
  }
}

async function rejectUser(userId) {
  try {
    const payload = await requestJson('/api/aprobar', {
      method: 'POST',
      body: JSON.stringify({ userId, action: 'reject' })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('error', `La solicitud fue rechazada.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo rechazar la solicitud.');
    renderApp();
  }
}

function updateUserPlan(planId) {
  const session = getSession();
  const db = readDb();
  const user = db.users.find((item) => item.id === session?.userId);
  if (!user) return;

  user.plan = planId;
  user.estado = user.estado === 'pendiente' ? 'aprobado' : user.estado;
  user.poliza = user.poliza || generatePolicyNumber();
  const plan = getPlanById(planId) || { nombre: 'Plan Básico', precio: 15000 };
  const nextInvoice = buildInvoiceForUser(user, plan, 'Noviembre 2026', generateSeriesNumber(), Number(plan.precio || 15000));
  user.facturas = Array.isArray(user.facturas) ? user.facturas : [];
  user.facturas.push(nextInvoice);
  writeDb(db);
  setFlash('success', `Se actualizó tu plan a ${plan.nombre || planId}.`);
  renderApp();
}

async function accredInvoicePayment(invoiceId) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.rol !== 'admin') {
    setFlash('error', 'Solo el administrador puede acreditar pagos.');
    renderApp();
    return;
  }

  try {
    const payload = await requestJson('/api/cobranzas', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark-paid', invoiceId })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('success', `Pago acreditado para la factura ${invoiceId}.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo acreditar el pago.');
    renderApp();
  }
}

async function revertInvoiceToPending(invoiceId) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.rol !== 'admin') {
    setFlash('error', 'Solo el administrador puede revertir pagos.');
    renderApp();
    return;
  }

  try {
    const payload = await requestJson('/api/cobranzas', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark-pending', invoiceId })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('success', `La factura volvió a estar pendiente.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo revertir el pago.');
    renderApp();
  }
}

async function informPaymentToReview(invoiceId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  try {
    const payload = await requestJson('/api/facturas', {
      method: 'POST',
      body: JSON.stringify({ action: 'informar-pago', invoiceId, userId: currentUser.id })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('success', `Se informó el pago de la factura y quedó en revisión.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo informar el pago.');
    renderApp();
  }
}

async function createNewLiquidation(userId) {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.rol !== 'admin') {
    setFlash('error', 'Solo el administrador puede generar nuevas liquidaciones.');
    renderApp();
    return;
  }

  try {
    const payload = await requestJson('/api/cobranzas', {
      method: 'POST',
      body: JSON.stringify({ action: 'create-liquidation', userId: userId || currentUser.id })
    });

    const db = payload.db && Array.isArray(payload.db.users) && Array.isArray(payload.db.plans)
      ? payload.db
      : await refreshStateFromApi();

    writeDb(db || readDb());
    setFlash('success', `Se emitió una nueva liquidación.`);
    renderApp();
  } catch (error) {
    setFlash('error', error.message || 'No se pudo emitir la liquidación.');
    renderApp();
  }
}

function openInvoiceWindow(invoiceId, userId) {
  const resolvedUserId = userId || getCurrentUser()?.id;
  if (!resolvedUserId || !invoiceId) return;
  const url = `/factura.html?id=${encodeURIComponent(invoiceId)}&userId=${encodeURIComponent(resolvedUserId)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
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

function generateSeriesNumber() {
  const db = readDb();
  const existing = db.users
    .flatMap((user) => user.facturas || [])
    .map((invoice) => Number((invoice.numero || '').match(/(\d+)$/)?.[0] || 0));
  const max = existing.length ? Math.max(...existing) : 18490;
  return max + 1;
}

function brandSvg() {
  return `
    <div class="brand-mark">
      <svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 5 52 13v15c0 12.7-7.7 24.6-20 31-12.3-6.4-20-18.3-20-31V13L32 5Z" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M22 28h20v8H22zm-4 12h28v6H18zm10-22h8v10h-8z" fill="currentColor"/>
      </svg>
    </div>
  `;
}


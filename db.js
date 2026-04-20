const API_BASE = 'http://localhost:3333/api';
const USE_MOCK = true;



async function _request(method, path, body = null) {
  if (USE_MOCK) return _mock(method, path, body);

  const token = sessionStorage.getItem('econato_token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  try {
    const res  = await fetch(`${API_BASE}${path}`, opts);
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.message || 'Error del servidor' };
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: 'Sin conexión al servidor' };
  }
}

const GET    = (path)        => _request('GET',    path);
const POST   = (path, body)  => _request('POST',   path, body);
const PUT    = (path, body)  => _request('PUT',    path, body);
const DELETE = (path)        => _request('DELETE', path);




const DEMO_USER = {
  id_empresa: 1,
  nombre: 'Empresa Demo S.A.S',
  nit: '900.123.456-7',
  email: 'demo@econato.co',
  sector: 'Tecnología'
};

const DEMO_INV = [
  { id_equipo:1, id_empresa:1, nombre:'Laptop HP EliteBook 840',      tipo:'Laptop',     marca:'HP',      anio:2018, id_estado:1, estado:'Reciclable', materiales:'Cobre, Oro, Plástico, Aluminio', tiene_material_peligroso:0, notas:'Pantalla rota, HDD funcional', registrado_en:'2025-01-15' },
  { id_equipo:2, id_empresa:1, nombre:'Monitor Dell 24"',             tipo:'Monitor',    marca:'Dell',    anio:2016, id_estado:3, estado:'Donable',    materiales:'Cobre, Plástico',                tiene_material_peligroso:0, notas:'En buen estado, sin cable',    registrado_en:'2025-01-20' },
  { id_equipo:3, id_empresa:1, nombre:'Servidor Dell PowerEdge',      tipo:'Servidor',   marca:'Dell',    anio:2015, id_estado:1, estado:'Reciclable', materiales:'Aluminio, Cobre, Oro, Plata',    tiene_material_peligroso:0, notas:'Fuera de soporte',              registrado_en:'2025-02-03' },
  { id_equipo:4, id_empresa:1, nombre:'Smartphone Samsung Galaxy S8', tipo:'Smartphone', marca:'Samsung', anio:2017, id_estado:2, estado:'Reparable',  materiales:'Cobre, Litio, Oro',              tiene_material_peligroso:0, notas:'Batería dañada',               registrado_en:'2025-02-10' },
  { id_equipo:5, id_empresa:1, nombre:'Impresora HP LaserJet',        tipo:'Impresora',  marca:'HP',      anio:2014, id_estado:4, estado:'Procesado',  materiales:'Cobre, Plástico',                tiene_material_peligroso:0, notas:'Reciclada correctamente',       registrado_en:'2025-02-18' },
  { id_equipo:6, id_empresa:1, nombre:'Desktop Lenovo ThinkCentre',   tipo:'Desktop',    marca:'Lenovo',  anio:2013, id_estado:1, estado:'Reciclable', materiales:'Cobre, Plástico, Plomo',         tiene_material_peligroso:1, notas:'Contiene plomo - manejo especial', registrado_en:'2025-03-01' },
];

function _getInv(id_empresa) {
  const key = `econato_inv_${id_empresa}`;
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(
    id_empresa === 1 ? DEMO_INV : []
  ));
}
function _saveInv(id_empresa, inv) {
  localStorage.setItem(`econato_inv_${id_empresa}`, JSON.stringify(inv));
}
function _getUsers() {
  return JSON.parse(localStorage.getItem('econato_users') || '[]');
}
function _saveUsers(users) {
  localStorage.setItem('econato_users', JSON.stringify(users));
}

async function _mock(method, path, body) {
  await new Promise(r => setTimeout(r, 80));

  const user = JSON.parse(sessionStorage.getItem('econato_current_user') || 'null');
  const eid  = user?.id_empresa;


  if (path === '/auth/login' && method === 'POST') {
    const users = _getUsers();
    const found = users.find(u => u.email === body.email && u.pass === body.pass)
                || (body.email === DEMO_USER.email && body.pass === 'demo1234' ? DEMO_USER : null);
    if (!found) return { ok: false, error: 'Credenciales incorrectas' };
    const token = `mock-token-${Date.now()}`;
    sessionStorage.setItem('econato_token', token);
    sessionStorage.setItem('econato_current_user', JSON.stringify(found));
    return { ok: true, data: { usuario: found, token } };
  }

  if (path === '/auth/logout' && method === 'POST') {
    sessionStorage.clear();
    return { ok: true, data: {} };
  }

  if (path === '/auth/register' && method === 'POST') {
    const users = _getUsers();
    if (users.find(u => u.email === body.email))
      return { ok: false, error: 'El correo ya está registrado' };
    const nuevo = { id_empresa: Date.now(), ...body };
    users.push(nuevo);
    _saveUsers(users);
    return { ok: true, data: { mensaje: 'Empresa registrada exitosamente' } };
  }

  if (path === '/auth/me' && method === 'GET') {
    if (!user) return { ok: false, error: 'No autenticado' };
    return { ok: true, data: user };
  }


  if (path === '/catalogos/sectores' && method === 'GET')
    return { ok: true, data: ['Tecnología','Manufactura','Comercio','Salud','Educación','Otro'] };

  if (path === '/catalogos/tipos' && method === 'GET')
    return { ok: true, data: ['Laptop','Desktop','Monitor','Smartphone','Impresora','Servidor','Tablet','Otro'] };

  if (path === '/catalogos/estados' && method === 'GET')
    return { ok: true, data: [
      { id_estado:1, nombre:'Reciclable' }, { id_estado:2, nombre:'Reparable' },
      { id_estado:3, nombre:'Donable' },   { id_estado:4, nombre:'Procesado' }
    ]};

  if (path === '/catalogos/materiales' && method === 'GET')
    return { ok: true, data: [
      { id_material:1, nombre:'Cobre',    es_peligroso:0 },
      { id_material:2, nombre:'Oro',      es_peligroso:0 },
      { id_material:3, nombre:'Plata',    es_peligroso:0 },
      { id_material:4, nombre:'Plástico', es_peligroso:0 },
      { id_material:5, nombre:'Aluminio', es_peligroso:0 },
      { id_material:6, nombre:'Plomo',    es_peligroso:1 },
      { id_material:7, nombre:'Mercurio', es_peligroso:1 },
      { id_material:8, nombre:'Litio',    es_peligroso:0 },
    ]};


  if (path === '/equipos' && method === 'GET') {
    if (!eid) return { ok: false, error: 'No autenticado' };
    return { ok: true, data: _getInv(eid) };
  }

  if (path === '/equipos' && method === 'POST') {
    if (!eid) return { ok: false, error: 'No autenticado' };
    const inv = _getInv(eid);
    const nuevo = {
      id_equipo:    Date.now(),
      id_empresa:   eid,
      nombre:       body.nombre,
      tipo:         body.tipo,
      marca:        body.marca,
      anio:         body.anio,
      id_estado:    body.id_estado || 1,
      estado:       body.estado,
      materiales:   (body.materiales || []).join(', '),
      tiene_material_peligroso: (body.materiales || []).some(m => ['Plomo','Mercurio'].includes(m)) ? 1 : 0,
      notas:        body.notas || '',
      registrado_en: new Date().toISOString().split('T')[0],
      procesado_en: null
    };
    inv.unshift(nuevo);
    _saveInv(eid, inv);
    return { ok: true, data: nuevo };
  }


  const matchPut = path.match(/^\/equipos\/(\d+)$/) && method === 'PUT';
  if (matchPut) {
    const id  = parseInt(path.split('/')[2]);
    const inv = _getInv(eid);
    const idx = inv.findIndex(i => i.id_equipo === id);
    if (idx === -1) return { ok: false, error: 'Equipo no encontrado' };
    inv[idx] = { ...inv[idx], ...body };
    _saveInv(eid, inv);
    return { ok: true, data: inv[idx] };
  }


  const matchDel = path.match(/^\/equipos\/(\d+)$/) && method === 'DELETE';
  if (matchDel) {
    const id  = parseInt(path.split('/')[2]);
    const inv = _getInv(eid).filter(i => i.id_equipo !== id);
    _saveInv(eid, inv);
    return { ok: true, data: { mensaje: 'Equipo eliminado' } };
  }


  if (path.match(/^\/equipos\/\d+\/procesar$/) && method === 'PUT') {
    const id  = parseInt(path.split('/')[2]);
    const inv = _getInv(eid);
    const idx = inv.findIndex(i => i.id_equipo === id);
    if (idx === -1) return { ok: false, error: 'Equipo no encontrado' };
    inv[idx].id_estado    = 4;
    inv[idx].estado       = 'Procesado';
    inv[idx].procesado_en = new Date().toISOString().split('T')[0];
    _saveInv(eid, inv);
    return { ok: true, data: inv[idx] };
  }


  if (path === '/equipos/kpis' && method === 'GET') {
    const inv   = _getInv(eid);
    const total = inv.length;
    return { ok: true, data: {
      total_equipos:   total,
      reciclables:     inv.filter(i => i.id_estado === 1).length,
      reparables:      inv.filter(i => i.id_estado === 2).length,
      donables:        inv.filter(i => i.id_estado === 3).length,
      procesados:      inv.filter(i => i.id_estado === 4).length,
      kg_estimados:    +(total * 2.3).toFixed(1),
      co2_estimado_kg: +(total * 15).toFixed(0),
      litros_agua:     total * 120,
      kwh_ahorrados:   total * 45,
    }};
  }


  if (path === '/equipos/stats/materiales' && method === 'GET') {
    const inv = _getInv(eid);
    const acc = {};
    inv.forEach(i => (i.materiales || '').split(', ').forEach(m => {
      if (m) acc[m] = (acc[m] || 0) + +(Math.random() * .5 + .1).toFixed(2);
    }));
    return { ok: true, data: acc };
  }

  if (path === '/equipos/stats/tendencia' && method === 'GET') {
    const inv = _getInv(eid);
    return { ok: true, data: {
      labels: ['Sep','Oct','Nov','Dic','Ene','Feb','Mar'],
      valores: [2, 3, 1, 4, 3, 5, inv.length]
    }};
  }


  if (path === '/reportes' && method === 'POST') {
    const inv     = _getInv(eid);
    const total   = inv.length;
    const proc    = inv.filter(i => i.id_estado === 4).length;
    const reporte = {
      id_reporte:      Date.now(),
      id_empresa:      eid,
      tipo:            body.tipo,
      generado_en:     new Date().toISOString(),
      total_equipos:   total,
      total_procesados: proc,
      kg_recuperados:  +(total * 2.3).toFixed(1),
      co2_evitado_kg:  +(total * 15).toFixed(0),
    };

    const hist = JSON.parse(localStorage.getItem(`econato_reportes_${eid}`) || '[]');
    hist.unshift(reporte);
    localStorage.setItem(`econato_reportes_${eid}`, JSON.stringify(hist));
    return { ok: true, data: reporte };
  }

  if (path === '/reportes' && method === 'GET') {
    const hist = JSON.parse(localStorage.getItem(`econato_reportes_${eid}`) || '[]');
    return { ok: true, data: hist };
  }


  if (path === '/certificados' && method === 'POST') {
    const inv   = _getInv(eid);
    const cert  = {
      id_cert:       Date.now(),
      id_empresa:    eid,
      folio:         `ECO-${String(Date.now()).slice(-6)}`,
      emitido_en:    new Date().toISOString(),
      total_equipos: inv.length,
    };
    const certs = JSON.parse(localStorage.getItem(`econato_certs_${eid}`) || '[]');
    certs.unshift(cert);
    localStorage.setItem(`econato_certs_${eid}`, JSON.stringify(certs));
    return { ok: true, data: cert };
  }

  if (path === '/certificados' && method === 'GET') {
    const certs = JSON.parse(localStorage.getItem(`econato_certs_${eid}`) || '[]');
    return { ok: true, data: certs };
  }

  return { ok: false, error: `Ruta mock no implementada: ${method} ${path}` };
}


/**
 * Iniciar sesión.
 * @param {string} email
 * @param {string} pass - contraseña en texto plano (el backend hace el hash)
 * @returns {Promise<{ok, data: {usuario, token}}>}
 */
export async function login(email, pass) {
  return POST('/auth/login', { email, pass });
}

/**
 * Registrar nueva empresa.
 * @param {{nombre, nit, sector, email, pass}} datos
 */
export async function register(datos) {
  return POST('/auth/register', datos);
}

/** Cerrar sesión en el servidor y limpiar storage local. */
export async function logout() {
  await POST('/auth/logout', {});
  sessionStorage.clear();
}

/** Obtener el usuario activo desde el servidor (valida token). */
export async function getMe() {
  return GET('/auth/me');
}



/** Retorna lista de sectores empresariales. */
export const getSectores   = () => GET('/catalogos/sectores');
/** Retorna lista de tipos de equipo. */
export const getTipos      = () => GET('/catalogos/tipos');
/** Retorna lista de estados con id_estado. */
export const getEstados    = () => GET('/catalogos/estados');
/** Retorna lista de materiales con flag es_peligroso. */
export const getMateriales = () => GET('/catalogos/materiales');


export async function getEquipos(filtros = {}) {
  const qs = new URLSearchParams(filtros).toString();
  return GET(`/equipos${qs ? '?' + qs : ''}`);
}

/**
 * Registrar un nuevo equipo.
 * @param {{nombre, tipo, marca, anio, estado, materiales[], notas}} datos
 */
export async function crearEquipo(datos) {
  return POST('/equipos', datos);
}

/**
 * Actualizar datos de un equipo.
 * @param {number} id_equipo
 * @param {object} cambios  - solo los campos a modificar
 */
export async function actualizarEquipo(id_equipo, cambios) {
  return PUT(`/equipos/${id_equipo}`, cambios);
}

/**
 * Eliminar un equipo del inventario.
 * @param {number} id_equipo
 */
export async function eliminarEquipo(id_equipo) {
  return DELETE(`/equipos/${id_equipo}`);
}

/**
 * Marcar un equipo como "Procesado" (cierra su ciclo de vida).
 * @param {number} id_equipo
 */
export async function procesarEquipo(id_equipo) {
  return PUT(`/equipos/${id_equipo}/procesar`, {});
}


export const getKpis = () => GET('/equipos/kpis');



/** Materiales recuperados (kg estimados por material). */
export const getStatsMateriales = () => GET('/equipos/stats/materiales');

/** Tendencia de equipos registrados por mes. */
export const getStatsTendencia  = () => GET('/equipos/stats/tendencia');



/**
 * Generar y persistir un reporte.
 * @param {'mensual'|'anual'|'certificado'} tipo
 */
export async function generarReporte(tipo) {
  return POST('/reportes', { tipo });
}

/** Historial de reportes generados por la empresa. */
export const getReportes = () => GET('/reportes');



/** Generar nuevo certificado de disposición responsable. */
export async function generarCertificado() {
  return POST('/certificados', {});
}

/** Historial de certificados de la empresa. */
export const getCertificados = () => GET('/certificados');



export function sesionActiva() {
  return !!sessionStorage.getItem('econato_token');
}

export function usuarioActual() {
  return JSON.parse(sessionStorage.getItem('econato_current_user') || 'null');
}

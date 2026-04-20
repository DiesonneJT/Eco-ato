import {
  login, logout, register,
  getEquipos, crearEquipo, actualizarEquipo, eliminarEquipo, procesarEquipo,
  getKpis, getStatsMateriales, getStatsTendencia,
  generarReporte, generarCertificado,
  getTipos, getEstados, getMateriales,
  sesionActiva, usuarioActual
} from './db.js';


if (!sesionActiva()) {
  window.location.href = 'login.html';
}

const user = usuarioActual();
document.getElementById('sidebar-name').textContent  = user?.nombre  || '';
document.getElementById('sidebar-email').textContent = user?.email   || '';


let chartStatus, chartTrend, chartMaterials, chartCircular;


window.showTab = function(id) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id.replace('tab-', ''));
  if (navEl) navEl.classList.add('active');

  if (id === 'tab-dashboard') renderDashboard();
  if (id === 'tab-inventory') renderInventory();
  if (id === 'tab-stats')     renderStats();
};

showTab('tab-dashboard');


window.doLogout = async function() {
  await logout();
  window.location.href = 'landing.html';
};


function notify(msg) {
  const n = document.getElementById('notif');
  document.getElementById('notif-msg').textContent = msg;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}


async function renderDashboard() {
  const [kpisRes, tendRes, invRes] = await Promise.all([
    getKpis(),
    getStatsTendencia(),
    getEquipos()
  ]);

  if (!kpisRes.ok) return notify('Error cargando KPIs');
  const k = kpisRes.data;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi"><div class="kpi-icon" style="background:#d8f3dc"><i class="fa fa-boxes-stacked" style="color:#2d6a4f"></i></div><div class="kpi-info"><div class="num">${k.total_equipos}</div><div class="lbl">Equipos registrados</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#f8d7da"><i class="fa fa-recycle" style="color:#842029"></i></div><div class="kpi-info"><div class="num">${k.reciclables}</div><div class="lbl">Por reciclar</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#fff3cd"><i class="fa fa-screwdriver-wrench" style="color:#856404"></i></div><div class="kpi-info"><div class="num">${k.reparables}</div><div class="lbl">Reparables</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#cfe2ff"><i class="fa fa-handshake" style="color:#084298"></i></div><div class="kpi-info"><div class="num">${k.donables}</div><div class="lbl">Donables</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#d8f3dc"><i class="fa fa-check-circle" style="color:#1b4332"></i></div><div class="kpi-info"><div class="num">${k.procesados}</div><div class="lbl">Procesados</div></div></div>
  `;

  if (chartStatus) chartStatus.destroy();
  if (chartTrend)  chartTrend.destroy();

  chartStatus = new Chart(document.getElementById('chartStatus').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Reciclable','Reparable','Donable','Procesado'],
      datasets: [{ data:[k.reciclables,k.reparables,k.donables,k.procesados], backgroundColor:['#e63946','#f77f00','#457b9d','#2d6a4f'], borderWidth:0 }]
    },
    options: { plugins:{ legend:{ position:'bottom' } }, cutout:'65%' }
  });

  if (tendRes.ok) {
    chartTrend = new Chart(document.getElementById('chartTrend').getContext('2d'), {
      type: 'line',
      data: {
        labels: tendRes.data.labels,
        datasets: [{ label:'Equipos', data:tendRes.data.valores, borderColor:'#40916c', backgroundColor:'rgba(64,145,108,.15)', tension:.4, fill:true, pointRadius:5 }]
      },
      options: { scales:{ y:{ beginAtZero:true, grid:{ color:'#eee' } } }, plugins:{ legend:{ display:false } } }
    });
  }

  if (invRes.ok) {
    const recent = [...invRes.data].sort((a,b) => new Date(b.registrado_en) - new Date(a.registrado_en)).slice(0,6);
    document.getElementById('recent-tbody').innerHTML = recent.map(i => `
      <tr><td><strong>${i.nombre}</strong></td><td>${i.tipo}</td><td>${badgeHtml(i.estado)}</td><td>${i.registrado_en}</td></tr>
    `).join('');
  }
}


let _inventoryCache = [];

async function renderInventory() {
  const res = await getEquipos();
  if (!res.ok) { notify('Error cargando inventario'); return; }
  _inventoryCache = res.data;
  filtrarYMostrar();
}

function filtrarYMostrar() {
  const q  = (document.getElementById('search-inv')?.value || '').toLowerCase();
  const fs = document.getElementById('filter-status')?.value || '';

  const filtered = _inventoryCache.filter(i => {
    const match   = i.nombre.toLowerCase().includes(q) || i.tipo.toLowerCase().includes(q) || i.marca.toLowerCase().includes(q);
    const stMatch = !fs || i.estado === fs;
    return match && stMatch;
  });

  const tbody = document.getElementById('inv-tbody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:30px">Sin resultados</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(i => `
    <tr>
      <td><strong>${i.nombre}</strong>${i.tiene_material_peligroso ? ' ⚠️' : ''}<br><small style="color:#888">${i.notas || ''}</small></td>
      <td>${i.tipo}</td><td>${i.marca}</td>
      <td>${badgeHtml(i.estado)}</td>
      <td style="font-size:.8rem">${i.materiales || ''}</td>
      <td>${i.registrado_en}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="window._procesarEquipo(${i.id_equipo})" ${i.id_estado===4?'disabled':''}>✓</button>
        <button class="btn btn-sm btn-danger"  onclick="window._eliminarEquipo(${i.id_equipo})"><i class="fa fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}


window._procesarEquipo = async function(id) {
  const res = await procesarEquipo(id);
  if (res.ok) { notify('Equipo marcado como procesado ✓'); renderInventory(); }
  else notify('Error: ' + res.error);
};

window._eliminarEquipo = async function(id) {
  const res = await eliminarEquipo(id);
  if (res.ok) { notify('Equipo eliminado'); renderInventory(); }
  else notify('Error: ' + res.error);
};


document.getElementById('search-inv')?.addEventListener('input', filtrarYMostrar);
document.getElementById('filter-status')?.addEventListener('change', filtrarYMostrar);


window.openModal  = () => document.getElementById('modal').classList.add('open');
window.closeModal = () => document.getElementById('modal').classList.remove('open');

window.saveEquipment = async function() {
  const nombre = document.getElementById('m-name').value.trim();
  const marca  = document.getElementById('m-brand').value.trim();
  if (!nombre || !marca) { notify('Completa nombre y marca'); return; }

  const matEl     = document.getElementById('m-materials');
  const materiales = Array.from(matEl.selectedOptions).map(o => o.value);
  const estadoNombre = document.getElementById('m-status').value;
  const estadoMap  = { Reciclable:1, Reparable:2, Donable:3, Procesado:4 };

  const res = await crearEquipo({
    nombre,
    tipo:      document.getElementById('m-type').value,
    marca,
    anio:      parseInt(document.getElementById('m-year').value) || null,
    id_estado: estadoMap[estadoNombre] || 1,
    estado:    estadoNombre,
    materiales,
    notas:     document.getElementById('m-notes').value
  });

  if (res.ok) {
    closeModal();
    renderInventory();
    notify('Equipo registrado correctamente 🎉');
    ['m-name','m-brand','m-year','m-notes'].forEach(id => document.getElementById(id).value = '');
  } else {
    notify('Error: ' + res.error);
  }
};

window.addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});


async function renderStats() {
  const [kpisRes, matRes, invRes] = await Promise.all([
    getKpis(), getStatsMateriales(), getEquipos()
  ]);
  if (!kpisRes.ok) return;
  const k = kpisRes.data;

  document.getElementById('stats-kpi').innerHTML = `
    <div class="kpi"><div class="kpi-icon" style="background:#d8f3dc"><i class="fa fa-weight-hanging" style="color:#2d6a4f"></i></div><div class="kpi-info"><div class="num">${k.kg_estimados} kg</div><div class="lbl">Materiales recuperados</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#fff3cd"><i class="fa fa-cloud" style="color:#856404"></i></div><div class="kpi-info"><div class="num">${k.co2_estimado_kg} kg</div><div class="lbl">CO₂ evitado</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#cfe2ff"><i class="fa fa-droplet" style="color:#084298"></i></div><div class="kpi-info"><div class="num">${k.litros_agua} L</div><div class="lbl">Agua preservada</div></div></div>
    <div class="kpi"><div class="kpi-icon" style="background:#f8d7da"><i class="fa fa-bolt" style="color:#842029"></i></div><div class="kpi-info"><div class="num">${k.kwh_ahorrados} kWh</div><div class="lbl">Energía ahorrada</div></div></div>
  `;

  if (chartMaterials) chartMaterials.destroy();
  if (chartCircular)  chartCircular.destroy();

  if (matRes.ok) {
    chartMaterials = new Chart(document.getElementById('chartMaterials').getContext('2d'), {
      type: 'bar',
      data: { labels: Object.keys(matRes.data), datasets:[{ label:'kg recuperados', data:Object.values(matRes.data), backgroundColor:'rgba(64,145,108,.7)', borderColor:'#2d6a4f', borderWidth:1 }] },
      options: { scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ display:false } } }
    });
  }

  chartCircular = new Chart(document.getElementById('chartCircular').getContext('2d'), {
    type: 'polarArea',
    data: { labels:['Reciclable','Reparable','Donable','Procesado'], datasets:[{ data:[k.reciclables,k.reparables,k.donables,k.procesados], backgroundColor:['rgba(230,57,70,.6)','rgba(247,127,0,.6)','rgba(69,123,157,.6)','rgba(45,106,79,.6)'] }] },
    options: { plugins:{ legend:{ position:'bottom' } } }
  });

  const total = k.total_equipos;
  const cats  = [
    { lbl:'Reducción huella total',     pct: Math.min(100, total * 8) },
    { lbl:'Equipos con ciclo cerrado',  pct: Math.min(100, k.procesados / Math.max(1,total) * 100) },
    { lbl:'Meta mensual ODS 12.5',      pct: Math.min(100, total * 10) },
    { lbl:'Materiales peligrosos gestionados', pct: invRes.ok ? Math.min(100, invRes.data.filter(i=>i.tiene_material_peligroso).length / Math.max(1,total) * 100) : 0 }
  ];
  document.getElementById('huella-bars').innerHTML = cats.map(c => `
    <div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.9rem">${c.lbl}</span>
        <strong style="color:var(--g2)">${c.pct.toFixed(0)}%</strong>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${c.pct}%"></div></div>
    </div>
  `).join('');
}


window.genReport = async function(tipo) {
  let res;
  if (tipo === 'cert') {
    res = await generarCertificado();
  } else {
    res = await generarReporte(tipo === 'mensual' ? 'mensual' : 'anual');
  }

  if (!res.ok) { notify('Error generando reporte'); return; }

  const d    = res.data;
  const out  = document.getElementById('report-output');
  const date = new Date(d.emitido_en || d.generado_en).toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });

  if (tipo === 'cert') {
    out.innerHTML = `
      <div class="cert-preview">
        <h3>🌱 CERTIFICADO DE DISPOSICIÓN RESPONSABLE</h3>
        <p style="margin:10px 0;font-size:1rem">Otorgado a: <strong>${user.nombre}</strong></p>
        <p>Se certifica que ha gestionado <strong>${d.total_equipos} equipos electrónicos</strong> de manera sostenible a través de Ecoñato, cumpliendo la meta 12.5 del ODS 12.</p>
        <p style="margin-top:12px;opacity:.7">Emitido el ${date} · Folio: ${d.folio}</p>
      </div>`;
  } else if (tipo === 'mensual') {
    out.innerHTML = `
      <div class="widget" style="margin-top:16px">
        <h3><i class="fa fa-file-lines"></i> Informe Mensual — ${date}</h3>
        <p>Empresa: <strong>${user.nombre}</strong></p><br>
        <p>✅ Equipos registrados: <strong>${d.total_equipos}</strong></p>
        <p>✅ Procesados correctamente: <strong>${d.total_procesados}</strong></p>
        <p>✅ Materiales recuperados: <strong>${d.kg_recuperados} kg</strong></p>
        <p>✅ CO₂ evitado: <strong>${d.co2_evitado_kg} kg</strong></p>
        <p style="margin-top:12px;color:var(--g3);font-weight:600">Cumplimiento meta 12.5: ${Math.min(100, d.total_equipos * 10)}%</p>
      </div>`;
  } else {
    out.innerHTML = `
      <div class="widget" style="margin-top:16px">
        <h3><i class="fa fa-globe"></i> Reporte Anual ODS 12 — ${user.nombre}</h3>
        <p><strong>META 12.4:</strong> Registro de equipos con materiales peligrosos gestionados correctamente.</p><br>
        <p><strong>META 12.5:</strong> ${d.total_equipos} equipos gestionados. ${d.total_procesados} con ciclo de vida cerrado.</p><br>
        <p><strong>META 12.6:</strong> Informes automáticos generados para memoria de sostenibilidad corporativa.</p><br>
        <p><strong>META 12.8:</strong> Centro educativo con 6 artículos sobre e-waste disponible para empleados.</p>
      </div>`;
  }
  notify('Reporte generado exitosamente');
};


function badgeHtml(estado) {
  const map = { Reciclable:'badge-red', Reparable:'badge-yellow', Donable:'badge-blue', Procesado:'badge-green' };
  return `<span class="badge ${map[estado] || 'badge-green'}">${estado}</span>`;
}

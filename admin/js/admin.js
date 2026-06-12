if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const API = '/api';

let token       = null;
let slug        = null;
let rol         = null;
let puedeEditar = false;
let selectedFile = null;

// ── Init ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const resetToken = new URLSearchParams(location.search).get('reset');
  if (resetToken) {
    document.getElementById('reset-token').value = resetToken;
    showReset();
    return;
  }
  token       = localStorage.getItem('aetm_token');
  slug        = localStorage.getItem('aetm_slug');
  rol         = localStorage.getItem('aetm_rol');
  puedeEditar = localStorage.getItem('aetm_puede_editar') === '1';
  token ? showDashboard() : showLogin();
});

// ── Screens ───────────────────────────────────────

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('forgot-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showForgot() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('forgot-screen').classList.remove('hidden');
  document.getElementById('reset-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showReset() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('forgot-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('forgot-screen').classList.add('hidden');
  document.getElementById('reset-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('header-slug').textContent = slug;

  const canEdit = rol === 'SUPER_ADMIN' || puedeEditar;
  ['section-upload', 'section-anuncio', 'section-evento-form'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', !canEdit);
  });

  loadAnuncio();
  loadPerfil();
  loadMedia();
  loadEventos();
  if (rol === 'SUPER_ADMIN') {
    document.getElementById('section-super-admin').classList.remove('hidden');
    document.getElementById('section-newsletter').classList.remove('hidden');
    document.getElementById('section-tienda').classList.remove('hidden');
    loadSiteMediaAdmin();
    loadArtesanos();
    loadNewsletter();
    loadPedidos();
    loadProductosAdmin();
  }
}

// ── Login ─────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario  = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;
  const btnLogin = document.getElementById('btn-login');
  const errBox   = document.getElementById('login-error');

  errBox.classList.add('hidden');
  btnLogin.disabled = true;
  btnLogin.textContent = 'Entrando…';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errBox.textContent = data.error || 'Credenciales incorrectas';
      errBox.classList.remove('hidden');
      return;
    }

    token       = data.token;
    slug        = data.slug;
    rol         = data.rol;
    puedeEditar = !!data.puedeEditar;
    localStorage.setItem('aetm_token',        token);
    localStorage.setItem('aetm_slug',         slug);
    localStorage.setItem('aetm_rol',          rol);
    localStorage.setItem('aetm_puede_editar', puedeEditar ? '1' : '0');
    showDashboard();

  } catch {
    errBox.textContent = 'Error de conexión con el servidor';
    errBox.classList.remove('hidden');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
  }
});


// ── Forgot / Reset password ───────────────────────────────────────────────

document.getElementById('link-forgot').addEventListener('click', e => { e.preventDefault(); showForgot(); });
document.getElementById('link-back-login').addEventListener('click', e => { e.preventDefault(); showLogin(); });

document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email  = document.getElementById('forgot-email').value.trim();
  const btn    = document.getElementById('btn-forgot');
  const status = document.getElementById('forgot-status');

  if (!email) { status.textContent = 'Introduce tu email'; status.classList.remove('hidden'); return; }

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  status.classList.add('hidden');

  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    status.textContent = res.ok
      ? 'Si el email está registrado, recibirás un enlace en breve.'
      : ((await res.json().catch(() => ({}))).error || 'Error al enviar');
    status.style.color = res.ok ? '#2e7d32' : '#c0392b';
    status.classList.remove('hidden');
  } catch {
    status.textContent = 'Error de conexión';
    status.style.color = '#c0392b';
    status.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar enlace';
  }
});

document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token    = document.getElementById('reset-token').value;
  const password = document.getElementById('reset-password').value;
  const btn      = document.getElementById('btn-reset');
  const status   = document.getElementById('reset-status');

  if (password.length < 4) {
    status.textContent = 'La contraseña debe tener al menos 4 caracteres';
    status.style.color = '#c0392b';
    status.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando…';
  status.classList.add('hidden');

  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      status.textContent = 'Contraseña actualizada. Ya puedes iniciar sesión.';
      status.style.color = '#2e7d32';
      status.classList.remove('hidden');
      document.getElementById('reset-form').reset();
      setTimeout(() => { history.replaceState({}, '', location.pathname); showLogin(); }, 2500);
    } else {
      status.textContent = data.error || 'Error al restablecer la contraseña';
      status.style.color = '#c0392b';
      status.classList.remove('hidden');
    }
  } catch {
    status.textContent = 'Error de conexión';
    status.style.color = '#c0392b';
    status.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar contraseña';
  }
});
// ── Logout ────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('aetm_token');
  localStorage.removeItem('aetm_slug');
  localStorage.removeItem('aetm_rol');
  localStorage.removeItem('aetm_puede_editar');
  token       = null;
  slug        = null;
  rol         = null;
  puedeEditar = false;
  document.getElementById('usuario').value  = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').classList.add('hidden');
  showLogin();
});

// ── Anuncio ───────────────────────────────────────

async function loadAnuncio() {
  const res = await fetch(`${API}/config/anuncio`);
  if (!res.ok) return;
  const { texto } = await res.json();
  document.getElementById('anuncio-texto').value = texto || '';
}

document.getElementById('btn-guardar-anuncio').addEventListener('click', async () => {
  const texto = document.getElementById('anuncio-texto').value.trim();
  const res = await authFetch(`${API}/config/anuncio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  if (res && res.ok) setAnuncioStatus('Guardado', 'ok');
  else setAnuncioStatus('Error al guardar', 'err');
  setTimeout(() => setAnuncioStatus('', ''), 3000);
});

document.getElementById('btn-borrar-anuncio').addEventListener('click', async () => {
  document.getElementById('anuncio-texto').value = '';
  const res = await authFetch(`${API}/config/anuncio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: '' }),
  });
  if (res && res.ok) setAnuncioStatus('Borrado — se usará el automático', 'ok');
  setTimeout(() => setAnuncioStatus('', ''), 3000);
});

function setAnuncioStatus(msg, type) {
  const el = document.getElementById('anuncio-status');
  el.textContent = msg;
  el.className   = type;
}

// ── Perfil: load ──────────────────────────────────

async function loadPerfil() {
  const res = await fetch(`${API}/artesano/${slug}`);
  if (!res.ok) return;
  fillPerfil(await res.json());
}

function fillPerfil(a) {
  document.getElementById('perfil-nombre').value       = a.nombre        || '';
  document.getElementById('p-especialidad').value = a.especialidad  || '';
  document.getElementById('p-localidad').value    = a.localidad     || '';
  document.getElementById('p-provincia').value    = a.provincia     || '';
  document.getElementById('p-anos').value         = a.anosExperiencia || '';
  document.getElementById('p-bio').value          = a.biografia     || '';
  document.getElementById('p-email').value         = a.email         || '';
  document.getElementById('p-instagram').value    = a.instagram     || '';
  document.getElementById('p-facebook').value     = a.facebook      || '';
  document.getElementById('p-twitter').value      = a.twitter       || '';
  document.getElementById('p-tiktok').value       = a.tiktok        || '';
  document.getElementById('p-web').value          = a.web           || '';

  const preview     = document.getElementById('perfil-foto-preview');
  const placeholder = document.getElementById('perfil-foto-placeholder');
  if (a.foto_perfil) {
    preview.src = a.foto_perfil;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  }
}

// ── Perfil: foto input ─────────────────────────────

document.getElementById('foto-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('foto-selected').textContent = file.name;
  document.getElementById('foto-selected').classList.remove('hidden');
  const preview = document.getElementById('perfil-foto-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('perfil-foto-placeholder').classList.add('hidden');
});

// ── Perfil: guardar ───────────────────────────────

document.getElementById('perfil-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('btn-guardar-perfil');
  btn.disabled = true;
  setPerfilStatus('Guardando…', '');

  const formData = new FormData();
  formData.append('nombre',          document.getElementById('perfil-nombre').value.trim());
  formData.append('especialidad',    document.getElementById('p-especialidad').value.trim());
  formData.append('localidad',       document.getElementById('p-localidad').value.trim());
  formData.append('provincia',       document.getElementById('p-provincia').value.trim());
  formData.append('anosExperiencia', document.getElementById('p-anos').value.trim());
  formData.append('biografia',       document.getElementById('p-bio').value.trim());
  formData.append('email',           document.getElementById('p-email').value.trim());
  formData.append('instagram',       document.getElementById('p-instagram').value.trim());
  formData.append('facebook',        document.getElementById('p-facebook').value.trim());
  formData.append('twitter',         document.getElementById('p-twitter').value.trim());
  formData.append('tiktok',          document.getElementById('p-tiktok').value.trim());
  formData.append('web',             document.getElementById('p-web').value.trim());

  const fotoRaw = document.getElementById('foto-input').files[0];
  if (fotoRaw) formData.append('foto', await convertirHeicSiNecesario(fotoRaw));

  const res = await authFetch(`${API}/artesano/${slug}/perfil`, { method: 'POST', body: formData });

  btn.disabled = false;

  if (!res) return;

  if (res.ok) {
    const updated = await res.json().catch(() => null);
    if (updated) fillPerfil(updated);
    setPerfilStatus('Perfil guardado correctamente', 'ok');
    document.getElementById('foto-input').value = '';
    document.getElementById('foto-selected').classList.add('hidden');
    setTimeout(() => setPerfilStatus('', ''), 3000);
  } else {
    const data = await res.json().catch(() => ({}));
    setPerfilStatus(data.error || 'Error al guardar', 'err');
  }
});

function setPerfilStatus(msg, type) {
  const el = document.getElementById('perfil-status');
  el.textContent = msg;
  el.className   = type;
}

// ── Media: load ───────────────────────────────────

async function loadMedia() {
  const grid = document.getElementById('media-grid');
  grid.innerHTML = '<p class="empty">Cargando…</p>';

  try {
    const res = await fetch(`${API}/artesano/${slug}/media`);
    if (!res.ok) { grid.innerHTML = '<p class="empty">Error al cargar los archivos.</p>'; return; }
    renderGrid(await res.json());
  } catch {
    grid.innerHTML = '<p class="empty">Error de conexión.</p>';
  }
}

document.getElementById('btn-refresh').addEventListener('click', loadMedia);

// ── Media: render ─────────────────────────────────

function renderGrid(items) {
  const grid = document.getElementById('media-grid');

  if (!items.length) {
    grid.innerHTML = '<p class="empty">No hay archivos subidos todavía.</p>';
    return;
  }

  const canDelete = rol === 'SUPER_ADMIN' || puedeEditar;
  grid.innerHTML = items.map(item => `
    <div class="media-item">
      ${item.tipo === 'VIDEO'
        ? `<video class="media-thumb" src="${item.url}" muted preload="metadata"></video>`
        : `<img  class="media-thumb" src="${item.url}" alt="${item.nombreOriginal}" loading="lazy">`
      }
      <div class="media-info">
        <span class="media-name" title="${item.nombreOriginal}">${item.nombreOriginal}</span>
        <span class="badge">${item.tipo}</span>
      </div>
      ${canDelete ? `<button class="btn-delete" onclick="confirmDelete(${item.id}, '${item.nombreOriginal}')">Eliminar</button>` : ''}
    </div>
  `).join('');
}

// ── Media: delete ─────────────────────────────────

async function confirmDelete(id, nombre) {
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;

  const res = await authFetch(`${API}/artesano/${slug}/media/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadMedia();
}

// ── File selection ────────────────────────────────

const fileInput = document.getElementById('file-input');
const dropZone  = document.getElementById('drop-zone');

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) selectFile(e.target.files[0]);
});

dropZone.addEventListener('click', (e) => {
  if (!e.target.matches('.btn-file, label')) fileInput.click();
});

dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]);
});

document.getElementById('btn-clear-file').addEventListener('click', clearFile);

function selectFile(file) {
  selectedFile = file;
  document.getElementById('selected-name').textContent = file.name;
  document.getElementById('selected-file').classList.remove('hidden');
  document.getElementById('btn-upload').disabled = false;
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  document.getElementById('selected-file').classList.add('hidden');
  document.getElementById('btn-upload').disabled = true;
  setStatus('', '');
}

// ── Upload ────────────────────────────────────────

document.getElementById('btn-upload').addEventListener('click', async () => {
  if (!selectedFile) return;

  setStatus('Procesando…', 'loading');
  const fileSubir = await convertirHeicSiNecesario(selectedFile);
  const formData = new FormData();
  formData.append('file', fileSubir);

  const btn = document.getElementById('btn-upload');
  btn.disabled = true;
  setStatus('Subiendo…', 'loading');

  try {
    const res = await authFetch(`${API}/artesano/${slug}/media`, { method: 'POST', body: formData });

    if (!res) return;

    if (res.ok) {
      setStatus('Archivo subido correctamente', 'ok');
      clearFile();
      loadMedia();
      setTimeout(() => setStatus('', ''), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || `Error al subir (HTTP ${res.status})`, 'err');
      btn.disabled = false;
    }
  } catch {
    setStatus('Error de red al subir el archivo', 'err');
    btn.disabled = false;
  }
});

// ── Imágenes del sitio (SUPER_ADMIN) ─────────────

let _siteGaleria = [];

async function loadSiteMediaAdmin() {
  _siteGaleria = Array.from({ length: 8 }, () => ({ url: null, etiqueta: '' }));
  renderGaleriaAdmin(_siteGaleria);
  renderHeroAdmin([null, null, null]);

  try {
    const res = await fetch(`${API}/config/site-media`);
    if (!res.ok) return;
    const data = await res.json();
    _siteGaleria = data.galeria || _siteGaleria;

    if (data.asociacion) {
      const img = document.getElementById('asociacion-preview');
      img.src = data.asociacion;
      img.classList.remove('hidden');
      document.getElementById('asociacion-placeholder').classList.add('hidden');
      document.getElementById('btn-borrar-asociacion').classList.remove('hidden');
    }

    renderGaleriaAdmin(_siteGaleria);
    renderHeroAdmin(data.hero || [null, null, null]);
  } catch {}
}

const _heroFiles = {};

function renderHeroAdmin(hero) {
  const labels = ['Imagen izquierda (grande)', 'Imagen derecha superior', 'Imagen derecha inferior'];
  document.getElementById('hero-admin-grid').innerHTML = hero.map((url, i) => {
    const pos = i + 1;
    return `<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fafafa">
      <div style="aspect-ratio:1;background:#f4ede6;position:relative;display:flex;align-items:center;justify-content:center" id="hero-preview-wrap-${pos}">
        ${url
          ? `<img id="hero-preview-img-${pos}" src="${url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.remove()">
             <button onclick="borrarHero(${pos})" style="position:absolute;top:.3rem;right:.3rem;background:rgba(192,57,43,.85);color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:.75rem;cursor:pointer;z-index:1">✕</button>`
          : `<span id="hero-icon-${pos}" style="font-size:2rem;opacity:.3">🖼</span>`}
      </div>
      <div style="padding:.6rem;font-size:.75rem;color:#888;text-align:center">${labels[i]}</div>
      <div style="padding:0 .6rem .5rem;display:flex;flex-direction:column;gap:.35rem">
        <div style="display:flex;gap:.4rem">
          <label for="hero-input-${pos}" class="btn-file" style="margin-top:0;flex:1;text-align:center;font-size:.78rem">Seleccionar</label>
          <input type="file" id="hero-input-${pos}" accept="image/*" style="display:none" onchange="seleccionarFotoHero(${pos})">
          <button id="hero-btn-subir-${pos}" onclick="subirFotoHero(${pos})"
            style="display:none;flex:1;padding:.4rem;background:#4a3221;color:white;border:none;border-radius:6px;font-size:.78rem;font-weight:700;cursor:pointer">
            Subir ↑
          </button>
        </div>
        <div id="hero-status-${pos}" style="font-size:.78rem;min-height:1em;text-align:center"></div>
      </div>
    </div>`;
  }).join('');
}

async function seleccionarFotoHero(pos) {
  const input  = document.getElementById(`hero-input-${pos}`);
  const status = document.getElementById(`hero-status-${pos}`);
  const raw    = input.files[0];
  if (!raw) return;

  status.textContent = 'Procesando…'; status.style.color = '#888';
  const file = await convertirHeicSiNecesario(raw);
  _heroFiles[pos] = file;

  // Mostrar preview local
  const reader = new FileReader();
  reader.onload = e => {
    const wrap = document.getElementById(`hero-preview-wrap-${pos}`);
    let img = document.getElementById(`hero-preview-img-${pos}`);
    if (!img) {
      img = document.createElement('img');
      img.id = `hero-preview-img-${pos}`;
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      wrap.appendChild(img);
      const icon = document.getElementById(`hero-icon-${pos}`);
      if (icon) icon.style.display = 'none';
    }
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  document.getElementById(`hero-btn-subir-${pos}`).style.display = '';
  status.textContent = 'Lista para subir'; status.style.color = '#e67e22';
}

async function subirFotoHero(pos) {
  const file   = _heroFiles[pos];
  const status = document.getElementById(`hero-status-${pos}`);
  const btnSubir = document.getElementById(`hero-btn-subir-${pos}`);
  if (!file) return;
  status.textContent = 'Subiendo…'; status.style.color = '#888';
  if (btnSubir) btnSubir.disabled = true;
  const fd = new FormData();
  fd.append('foto', file);
  try {
    const res  = await authFetch(`${API}/config/hero/${pos}`, { method: 'POST', body: fd });
    if (!res) return;
    const data = await res.json();
    if (res.ok) {
      status.textContent = '✓ Imagen guardada correctamente'; status.style.color = '#27ae60';
      _heroFiles[pos] = null;
      if (btnSubir) btnSubir.style.display = 'none';
      loadSiteMediaAdmin();
      setTimeout(() => { status.textContent = ''; }, 3000);
    } else {
      status.textContent = data.error || 'Error al subir'; status.style.color = '#c0392b';
      if (btnSubir) btnSubir.disabled = false;
    }
  } catch {
    status.textContent = 'Error de red'; status.style.color = '#c0392b';
    if (btnSubir) btnSubir.disabled = false;
  }
}

async function borrarHero(pos) {
  if (!confirm('¿Borrar esta imagen del hero?')) return;
  const res = await authFetch(`${API}/config/hero/${pos}`, { method: 'DELETE' });
  if (res && (res.ok || res.status === 204)) loadSiteMediaAdmin();
}

const _galeriaFiles = {}; // archivo pendiente por posición

function renderGaleriaAdmin(galeria) {
  const labels = ['Cuenco de nogal','Taller en proceso','Colección olivo','Herramientas del oficio',
                  'Encuentro Nacional','Virutas y madera','Piezas funcionales','Detalle de veta'];
  document.getElementById('galeria-admin-grid').innerHTML = galeria.map((item, i) => {
    const pos      = i + 1;
    const etiqueta = item.etiqueta || labels[i] || `Foto ${pos}`;
    return `
      <div class="galeria-slot" id="slot-${pos}">
        <div class="galeria-slot-img" id="slot-img-${pos}">
          ${item.url ? `<img src="${item.url}" onerror="this.remove()">` : '🪵'}
        </div>
        <div class="galeria-slot-body">
          <input type="text" value="${etiqueta}" id="etiqueta-${pos}" onblur="guardarEtiqueta(${pos})">
          <div class="galeria-slot-actions" id="slot-acc-${pos}">
            ${accionesSlot(pos, !!item.url)}
          </div>
          <span id="galeria-status-${pos}" style="font-size:.78rem;min-height:1em;display:block;font-weight:600"></span>
        </div>
      </div>`;
  }).join('');
}

function accionesSlot(pos, tieneUrl) {
  return `
    <label for="galeria-input-${pos}" class="btn-file" style="font-size:.78rem;padding:.32rem .75rem;margin:0">
      ${tieneUrl ? 'Cambiar' : 'Seleccionar foto'}
    </label>
    <input type="file" id="galeria-input-${pos}" accept="image/*" onchange="seleccionarFotoGaleria(${pos},this)">
    ${tieneUrl ? `<button class="btn-del-evento" style="font-size:.78rem;padding:.32rem .6rem" onclick="borrarFotoGaleria(${pos})">Borrar</button>` : ''}`;
}

async function seleccionarFotoGaleria(pos, input) {
  const raw = input.files[0];
  if (!raw) return;
  document.getElementById(`galeria-status-${pos}`).textContent = 'Procesando…';
  const file = await convertirHeicSiNecesario(raw);
  _galeriaFiles[pos] = file;

  // Previsualizar localmente
  const reader = new FileReader();
  reader.onload = e => {
    const wrap = document.getElementById(`slot-img-${pos}`);
    wrap.innerHTML = `<img src="${e.target.result}" onerror="this.remove()">`;
  };
  reader.readAsDataURL(file);

  document.getElementById(`galeria-status-${pos}`).textContent = '';
  // Mostrar botones Guardar / Cancelar
  document.getElementById(`slot-acc-${pos}`).innerHTML = `
    <button class="btn-edit-evento" style="font-size:.78rem;padding:.32rem .75rem"
            onclick="subirFotoGaleria(${pos})">Guardar foto</button>
    <button class="btn-ghost-small"  style="font-size:.78rem"
            onclick="cancelarFotoGaleria(${pos})">Cancelar</button>`;
}

function cancelarFotoGaleria(pos) {
  delete _galeriaFiles[pos];
  const item = _siteGaleria[pos - 1] || { url: null };
  document.getElementById(`slot-img-${pos}`).innerHTML =
    item.url ? `<img src="${item.url}" onerror="this.remove()">` : '🪵';
  document.getElementById(`slot-acc-${pos}`).innerHTML = accionesSlot(pos, !!item.url);
  document.getElementById(`galeria-status-${pos}`).textContent = '';
}

// Imagen La Asociación — subir
document.getElementById('asociacion-input').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  const status = document.getElementById('asociacion-status');
  status.textContent = 'Procesando…';
  status.style.color = '';
  const fileSubir = await convertirHeicSiNecesario(file);
  const fd = new FormData();
  fd.append('foto', fileSubir);
  status.textContent = 'Subiendo…';
  const res = await authFetch(`${API}/config/asociacion`, { method: 'POST', body: fd });
  if (res && res.ok) {
    const { url } = await res.json();
    const img = document.getElementById('asociacion-preview');
    img.src = url + '?t=' + Date.now();
    img.classList.remove('hidden');
    document.getElementById('asociacion-placeholder').classList.add('hidden');
    document.getElementById('btn-borrar-asociacion').classList.remove('hidden');
    status.textContent = '✓ Guardada';
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    status.textContent = data.error || `Error al subir (HTTP ${res?.status})`;
    status.style.color = '#c0392b';
  }
  setTimeout(() => { status.textContent = ''; status.style.color = ''; }, 4000);
  this.value = '';
});

// Imagen La Asociación — borrar
document.getElementById('btn-borrar-asociacion').addEventListener('click', async () => {
  if (!confirm('¿Eliminar la imagen de La Asociación?')) return;
  const res = await authFetch(`${API}/config/asociacion`, { method: 'DELETE' });
  if (res && res.ok) {
    const img = document.getElementById('asociacion-preview');
    img.src = '';
    img.classList.add('hidden');
    document.getElementById('asociacion-placeholder').classList.remove('hidden');
    document.getElementById('btn-borrar-asociacion').classList.add('hidden');
  }
});

async function borrarFotoGaleria(pos) {
  if (!confirm(`¿Eliminar la foto ${pos} de la galería?`)) return;
  const res = await authFetch(`${API}/config/galeria/${pos}`, { method: 'DELETE' });
  if (res && res.ok) {
    _siteGaleria[pos - 1].url = null;
    document.getElementById(`slot-img-${pos}`).innerHTML = '🪵';
    document.getElementById(`slot-acc-${pos}`).innerHTML = accionesSlot(pos, false);
    document.getElementById(`galeria-status-${pos}`).textContent = '';
  } else {
    document.getElementById(`galeria-status-${pos}`).textContent = 'Error al borrar';
  }
}

async function subirFotoGaleria(pos) {
  const file = _galeriaFiles[pos];
  if (!file) return;

  const status = document.getElementById(`galeria-status-${pos}`);
  status.textContent = 'Subiendo…';
  status.style.color = '#888';

  const fd = new FormData();
  fd.append('foto', file);
  const res = await authFetch(`${API}/config/galeria/${pos}`, { method: 'POST', body: fd });

  if (res && res.ok) {
    const { url } = await res.json();
    delete _galeriaFiles[pos];
    _siteGaleria[pos - 1].url = url;
    // Actualizar solo las acciones de este slot sin re-renderizar todo
    document.getElementById(`slot-acc-${pos}`).innerHTML = accionesSlot(pos, true);
    status.textContent = '✓ Guardada';
    status.style.color = '#2e7d32';
    setTimeout(() => { status.textContent = ''; }, 2500);
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    status.textContent = data.error || 'Error al subir';
    status.style.color = '#c0392b';
  }
}

async function guardarEtiqueta(pos) {
  const etiqueta = document.getElementById(`etiqueta-${pos}`).value.trim();
  if (etiqueta === (_siteGaleria[pos - 1]?.etiqueta || '')) return;
  await authFetch(`${API}/config/galeria/${pos}/etiqueta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etiqueta }),
  });
  if (_siteGaleria[pos - 1]) _siteGaleria[pos - 1].etiqueta = etiqueta;
}

// ── Lista de artesanos (SUPER_ADMIN) ─────────────

document.getElementById('btn-refresh-artesanos').addEventListener('click', loadArtesanos);

async function loadArtesanos() {
  const el = document.getElementById('artesanos-list');
  el.innerHTML = '<p class="empty">Cargando…</p>';
  try {
    const res = await authFetch(`${API}/admin/artesanos`);
    if (!res) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      el.innerHTML = `<p class="empty" style="color:red">Error ${res.status}: ${data.error || 'sin detalle'}</p>`;
      return;
    }
    renderArtesanos(await res.json());
  } catch (err) {
    el.innerHTML = `<p class="empty" style="color:red">Error de conexión: ${err.message}</p>`;
  }
}

let _artesanosData = [];
let _artesanosPage = 0;
const ARTESANOS_PER_PAGE = 8;

function renderArtesanos(items) {
  _artesanosData = [...items].sort((a, b) => {
    if (a.rol === 'SUPER_ADMIN' && b.rol !== 'SUPER_ADMIN') return -1;
    if (b.rol === 'SUPER_ADMIN' && a.rol !== 'SUPER_ADMIN') return 1;
    return (a.nombre || a.slug).localeCompare(b.nombre || b.slug, 'es');
  });
  _renderArtesanosPage(0);
}

function _renderArtesanosPage(page) {
  _artesanosPage = page;
  const el = document.getElementById('artesanos-list');
  if (!_artesanosData.length) {
    el.innerHTML = '<p class="empty">No hay artesanos registrados.</p>';
    return;
  }
  const totalPages = Math.ceil(_artesanosData.length / ARTESANOS_PER_PAGE);
  const slice = _artesanosData.slice(page * ARTESANOS_PER_PAGE, (page + 1) * ARTESANOS_PER_PAGE);
  const pager = totalPages > 1 ? `
    <div class="artesanos-pager">
      <button class="btn-ghost-small" onclick="_renderArtesanosPage(${page - 1})" ${page === 0 ? 'disabled' : ''}>← Anterior</button>
      <span>${page + 1} / ${totalPages}</span>
      <button class="btn-ghost-small" onclick="_renderArtesanosPage(${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}>Siguiente →</button>
    </div>` : '';
  el.innerHTML = `
    <table class="eventos-table">
      <thead>
        <tr><th>Nombre</th><th>Usuario</th><th>Slug</th><th>Email</th><th></th></tr>
      </thead>
      <tbody>
        ${slice.map(a => `
          <tr>
            <td>${a.nombre || '—'}</td>
            <td>${a.usuario}</td>
            <td>${a.slug}</td>
            <td>${a.email || '<span style="color:#bbb">—</span>'}</td>
            <td class="eventos-actions" id="acc-${a.id}">
              ${a.rol === 'SUPER_ADMIN'
                ? `<span class="badge">SUPER ADMIN</span>
                   <button class="btn-edit-evento" onclick="mostrarFormEmail(${a.id},'${(a.email||'').replace(/'/g,"\\'")}')" >Email</button>`
                : `<button class="btn-edit-evento" onclick="mostrarFormSlug(${a.id},'${a.slug}')">Slug</button>
                   <button class="btn-edit-evento" onclick="mostrarFormPassword(${a.id})">Contraseña</button>
                   <button class="btn-edit-evento" onclick="mostrarFormEmail(${a.id},'${(a.email||'').replace(/'/g,"\\'")}')" >Email</button>
                   <button class="${a.puedeEditar ? 'btn-del-evento' : 'btn-edit-evento'}" onclick="confirmarTogglePermisos(${a.id},${a.puedeEditar},'${(a.nombre||a.slug).replace(/'/g,"\\'")}')">
                     ${a.puedeEditar ? 'Quitar permisos' : 'Dar permisos'}
                   </button>
                   <button class="btn-del-evento"  onclick="confirmarEliminarArtesano(${a.id},'${(a.nombre||a.slug).replace(/'/g,"\\'")}')" >Eliminar</button>`
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${pager}`;
}

function mostrarFormEmail(id, emailActual) {
  document.getElementById(`acc-${id}`).innerHTML = `
    <input type="email" id="ne-${id}" value="${emailActual}" placeholder="correo@ejemplo.com" style="width:200px;padding:.3rem .5rem">
    <button class="btn-edit-evento" onclick="enviarEmail(${id})">Guardar</button>
    <button class="btn-ghost-small" onclick="loadArtesanos()">Cancelar</button>
    <span id="ne-status-${id}" style="margin-left:.5rem;font-size:.85rem"></span>`;
  document.getElementById(`ne-${id}`).focus();
}

async function enviarEmail(id) {
  const input  = document.getElementById(`ne-${id}`);
  const status = document.getElementById(`ne-status-${id}`);
  const email  = input.value.trim();

  const res = await authFetch(`${API}/admin/artesanos/${id}/email`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (res && res.ok) {
    status.textContent = '✓ Guardado';
    setTimeout(loadArtesanos, 1200);
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    status.textContent = data.error || 'Error';
  }
}


function mostrarFormSlug(id, slugActual) {
  document.getElementById(`acc-${id}`).innerHTML = `
    <input type="text" id="ns-${id}" value="${slugActual}" placeholder="nuevo-slug" style="width:150px;padding:.3rem .5rem">
    <button class="btn-edit-evento" onclick="enviarSlug(${id})">Guardar</button>
    <button class="btn-ghost-small" onclick="loadArtesanos()">Cancelar</button>
    <span id="ns-status-${id}" style="margin-left:.5rem;font-size:.85rem"></span>`;
  document.getElementById(`ns-${id}`).focus();
}

async function enviarSlug(id) {
  const input  = document.getElementById(`ns-${id}`);
  const status = document.getElementById(`ns-status-${id}`);
  const slug   = input.value.trim();
  if (!slug) { status.textContent = 'El slug no puede estar vacío'; return; }
  if (!confirm(`⚠️ Cambiar el slug a "${slug}" modificará la URL pública del artesano y renombrará su carpeta de archivos en el servidor.\n\n¿Estás seguro?`)) return;

  const res = await authFetch(`${API}/admin/artesanos/${id}/slug`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  if (res && res.ok) {
    status.textContent = '✓ Cambiado';
    setTimeout(loadArtesanos, 1200);
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    status.textContent = data.error || 'Error';
  }
}

function mostrarFormPassword(id) {
  document.getElementById(`acc-${id}`).innerHTML = `
    <input type="password" id="np-${id}" placeholder="Nueva contraseña" style="width:150px;padding:.3rem .5rem">
    <button class="btn-edit-evento" onclick="enviarPassword(${id})">Guardar</button>
    <button class="btn-ghost-small" onclick="loadArtesanos()">Cancelar</button>
    <span id="np-status-${id}" style="margin-left:.5rem;font-size:.85rem"></span>`;
  document.getElementById(`np-${id}`).focus();
}

async function enviarPassword(id) {
  const input  = document.getElementById(`np-${id}`);
  const status = document.getElementById(`np-status-${id}`);
  const pass   = input.value;
  if (pass.length < 4) { status.textContent = 'Mínimo 4 caracteres'; return; }

  const res = await authFetch(`${API}/admin/artesanos/${id}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pass }),
  });
  if (res && res.ok) {
    status.textContent = '✓ Cambiada';
    setTimeout(loadArtesanos, 1200);
  } else {
    status.textContent = 'Error';
  }
}

async function confirmarTogglePermisos(id, tienePermisos, nombre) {
  const msg = tienePermisos
    ? `¿Quitar permisos de edición a "${nombre}"?\n\nSólo podrá editar su perfil básico (nombre, bio, foto, redes sociales). No podrá subir ni eliminar archivos.`
    : `¿Dar permisos de edición completa a "${nombre}"?\n\nPodrá subir y eliminar archivos de sus proyectos.`;
  if (!confirm(msg)) return;

  const res = await authFetch(`${API}/admin/artesanos/${id}/permisos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puede_editar: !tienePermisos }),
  });

  if (res && res.ok) {
    loadArtesanos();
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    alert(data.error || 'Error al cambiar permisos');
  }
}

async function confirmarEliminarArtesano(id, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"?\nSe borrarán todos sus archivos y medios.`)) return;
  const res = await authFetch(`${API}/admin/artesanos/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    loadArtesanos();
  } else {
    const data = res ? await res.json().catch(() => ({})) : {};
    alert(data.error || 'Error al eliminar');
  }
}

// ── Newsletter (SUPER_ADMIN) ──────────────────────

async function loadNewsletter() {
  const list = document.getElementById('newsletter-list');
  list.innerHTML = '<p class="empty">Cargando…</p>';
  try {
    const res  = await authFetch(`${API}/newsletter/suscriptores`);
    if (!res || !res.ok) { list.innerHTML = '<p class="empty">Error al cargar suscriptores.</p>'; return; }
    const rows   = await res.json();
    const activos = rows.filter(r => r.activo).length;
    const bajas   = rows.length - activos;
    list.innerHTML = `
      <div style="display:flex;gap:2rem;flex-wrap:wrap;margin:.25rem 0 .5rem">
        <div style="text-align:center">
          <div style="font-size:2rem;font-weight:700;color:#4a3221;line-height:1">${activos}</div>
          <div style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem">Activos</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:2rem;font-weight:700;color:#4a3221;line-height:1">${bajas}</div>
          <div style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem">Bajas</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:2rem;font-weight:700;color:#4a3221;line-height:1">${rows.length}</div>
          <div style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-top:.2rem">Total</div>
        </div>
      </div>`;
  } catch {
    list.innerHTML = '<p class="empty">Error de conexión.</p>';
  }
}

document.getElementById('btn-refresh-newsletter').addEventListener('click', loadNewsletter);

document.getElementById('newsletter-enviar-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn    = document.getElementById('btn-enviar-newsletter');
  const status = document.getElementById('newsletter-status');
  const asunto  = document.getElementById('nl-asunto').value.trim();
  const mensaje = document.getElementById('nl-mensaje').value.trim();

  if (!asunto || !mensaje) {
    status.textContent = 'Rellena el asunto y el mensaje';
    status.className   = 'err';
    return;
  }
  if (!confirm(`¿Enviar la newsletter a todos los suscriptores activos?\n\nAsunto: ${asunto}`)) return;

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  status.textContent = '';

  try {
    const res  = await authFetch(`${API}/newsletter/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asunto, texto: mensaje }),
    });
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res && res.ok) {
      status.textContent = `✓ Enviado a ${data.enviados} suscriptor${data.enviados !== 1 ? 'es' : ''}${data.errores ? ` (${data.errores} errores)` : ''}`;
      status.className   = 'ok';
      document.getElementById('newsletter-enviar-form').reset();
    } else {
      status.textContent = data.error || 'Error al enviar';
      status.className   = 'err';
    }
  } catch {
    status.textContent = 'Error de conexión';
    status.className   = 'err';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar a todos los suscriptores';
  }
});

// ── Registro artesano (SUPER_ADMIN) ──────────────

document.getElementById('registro-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn      = document.getElementById('btn-registrar');
  const statusEl = document.getElementById('registro-status');

  const payload = {
    nombre:   document.getElementById('r-nombre').value.trim(),
    slug:     document.getElementById('r-slug').value.trim(),
    usuario:  document.getElementById('r-usuario').value.trim(),
    password: document.getElementById('r-password').value,
    email:    document.getElementById('r-email').value.trim() || null,
  };

  if (!payload.nombre || !payload.slug || !payload.usuario || !payload.password) {
    statusEl.textContent = 'Rellena todos los campos';
    statusEl.className   = 'err';
    return;
  }

  btn.disabled = true;
  statusEl.textContent = '';

  try {
    const res = await authFetch(`${API}/admin/artesanos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res) return;

    if (res.ok) {
      statusEl.textContent = `Artesano "${payload.nombre}" registrado correctamente`;
      statusEl.className   = 'ok';
      document.getElementById('registro-form').reset();
      loadArtesanos();
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      statusEl.textContent = data.error || 'Error al registrar el artesano';
      statusEl.className   = 'err';
    }
  } catch {
    statusEl.textContent = 'Error de red';
    statusEl.className   = 'err';
  } finally {
    btn.disabled = false;
  }
});

// ── Geocoding (Nominatim) ─────────────────────────

let _geocodeTimer = null;

document.getElementById('ev-direccion').addEventListener('input', (e) => {
  clearTimeout(_geocodeTimer);
  clearCoords();
  const q = e.target.value.trim();
  if (q.length < 3) { hideSuggestions(); return; }
  _geocodeTimer = setTimeout(() => fetchSuggestions(q), 400);
});

document.getElementById('btn-clear-coords').addEventListener('click', () => {
  document.getElementById('ev-direccion').value = '';
  clearCoords();
  hideSuggestions();
  document.getElementById('ev-direccion').focus();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.address-search-wrap')) hideSuggestions();
});

async function fetchSuggestions(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&accept-language=es`;
    const res = await fetch(url);
    if (!res.ok) return;
    showSuggestions(await res.json());
  } catch {}
}

function showSuggestions(results) {
  const ul = document.getElementById('address-suggestions');
  if (!results.length) { hideSuggestions(); return; }

  ul.innerHTML = results.map(r => {
    const addr   = r.address || {};
    const ciudad = addr.city || addr.town || addr.village || addr.municipality || '';
    const estado = addr.state || addr.county || '';
    const sub    = [ciudad, estado, addr.country].filter(Boolean).join(', ');
    const main   = r.display_name.split(', ').slice(0, 2).join(', ');
    return `<li class="suggestion-item"
               data-lat="${r.lat}" data-lon="${r.lon}"
               data-localidad="${ciudad}" data-provincia="${estado}"
               data-pais="${addr.country || ''}" data-display="${r.display_name}">
              <strong>${main}</strong>
              <span>${sub}</span>
            </li>`;
  }).join('');

  ul.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => selectAddress(item));
  });

  ul.classList.remove('hidden');
}

function selectAddress(item) {
  const { lat, lon, localidad, provincia, pais, display } = item.dataset;

  document.getElementById('ev-latitud').value  = lat;
  document.getElementById('ev-longitud').value = lon;
  document.getElementById('ev-direccion').value = display;

  if (localidad) document.getElementById('ev-localidad').value = localidad;
  if (provincia) document.getElementById('ev-provincia').value = provincia;
  if (pais)      document.getElementById('ev-pais').value      = pais;

  document.getElementById('coords-text').textContent =
    `📍 ${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}`;
  document.getElementById('coords-preview').classList.remove('hidden');

  hideSuggestions();
}

function clearCoords() {
  document.getElementById('ev-latitud').value  = '';
  document.getElementById('ev-longitud').value = '';
  document.getElementById('coords-preview').classList.add('hidden');
}

function hideSuggestions() {
  document.getElementById('address-suggestions').classList.add('hidden');
}

// ── Eventos: load ─────────────────────────────────

let eventosCache     = [];
let editingEventoId  = null;

async function loadEventos() {
  const list = document.getElementById('eventos-list');
  list.innerHTML = '<p class="empty">Cargando…</p>';
  try {
    const res = await fetch(`${API}/eventos`);
    if (!res.ok) { list.innerHTML = '<p class="empty">Error al cargar eventos.</p>'; return; }
    eventosCache = await res.json();
    renderEventos(eventosCache);
  } catch {
    list.innerHTML = '<p class="empty">Error de conexión.</p>';
  }
}

document.getElementById('btn-refresh-eventos').addEventListener('click', loadEventos);

function renderEventos(items) {
  const list = document.getElementById('eventos-list');

  if (!items.length) {
    list.innerHTML = '<p class="empty">No hay eventos todavía.</p>';
    return;
  }

  const fmt = (d) => new Date(d).toLocaleDateString('es-ES');

  const tipoLabel = { feria: 'Feria', taller: 'Taller', curso: 'Curso' };

  list.innerHTML = `
    <table class="eventos-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Localidad</th>
          <th>Inicio</th>
          <th>Fin</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(ev => `
          <tr>
            <td>${ev.titulo || '<em style="opacity:.5">Sin título</em>'}</td>
            <td>${tipoLabel[ev.tipo] || ev.tipo}</td>
            <td>${ev.localidad}, ${ev.provincia}</td>
            <td>${fmt(ev.fechaInicio)}</td>
            <td>${fmt(ev.fechaFin)}</td>
            <td class="eventos-actions">
              ${(rol === 'SUPER_ADMIN' || puedeEditar) ? `
              <button class="btn-edit-evento" onclick="editEvento(${ev.id})">Editar</button>
              <button class="btn-del-evento"  onclick="confirmDeleteEvento(${ev.id}, '${ev.titulo || ev.localidad}')">Eliminar</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function editEvento(id) {
  const ev = eventosCache.find(e => e.id === id);
  if (!ev) return;

  editingEventoId = id;

  document.getElementById('ev-titulo').value       = ev.titulo      || '';
  document.getElementById('ev-tipo').value         = ev.tipo        || 'feria';
  document.getElementById('ev-descripcion').value  = ev.descripcion || '';
  document.getElementById('ev-url-imagen').value   = ev.urlImagen   || '';
  document.getElementById('ev-url-externa').value  = ev.urlExterna  || '';
  document.getElementById('ev-localidad').value    = ev.localidad   || '';
  document.getElementById('ev-provincia').value    = ev.provincia   || '';
  document.getElementById('ev-pais').value         = ev.pais        || 'España';
  document.getElementById('ev-inicio').value       = toInputDate(ev.fechaInicio);
  document.getElementById('ev-fin').value          = toInputDate(ev.fechaFin);
  document.getElementById('ev-latitud').value      = ev.latitud;
  document.getElementById('ev-longitud').value     = ev.longitud;

  document.getElementById('coords-text').textContent =
    `📍 ${parseFloat(ev.latitud).toFixed(5)}, ${parseFloat(ev.longitud).toFixed(5)}`;
  document.getElementById('coords-preview').classList.remove('hidden');

  document.getElementById('ev-direccion').value = 'Cargando dirección…';
  const addr = await reverseGeocode(ev.latitud, ev.longitud);
  document.getElementById('ev-direccion').value = addr || `${ev.localidad}, ${ev.provincia}`;

  document.getElementById('btn-crear-evento').textContent = 'Actualizar evento';
  document.getElementById('btn-cancelar-evento').classList.remove('hidden');

  document.getElementById('evento-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`;
    const res = await fetch(url);
    if (res.ok) return (await res.json()).display_name || '';
  } catch {}
  return '';
}

function toInputDate(fecha) {
  if (!fecha) return '';
  if (Array.isArray(fecha)) {
    const [y, m, d] = fecha;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return String(fecha).slice(0, 10);
}

function resetEventoForm() {
  editingEventoId = null;
  document.getElementById('evento-form').reset();
  document.getElementById('ev-pais').value  = 'España';
  document.getElementById('ev-tipo').value  = 'feria';
  document.getElementById('ev-direccion').value = '';
  clearCoords();
  document.getElementById('btn-crear-evento').textContent = 'Añadir evento';
  document.getElementById('btn-cancelar-evento').classList.add('hidden');
  setEventoStatus('', '');
}

document.getElementById('btn-cancelar-evento').addEventListener('click', resetEventoForm);

// ── Eventos: crear ────────────────────────────────

document.getElementById('evento-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const lat = document.getElementById('ev-latitud').value;
  const lon = document.getElementById('ev-longitud').value;

  if (!lat || !lon) {
    setEventoStatus('Selecciona una dirección de las sugerencias', 'err');
    document.getElementById('ev-direccion').focus();
    return;
  }

  const btn = document.getElementById('btn-crear-evento');
  btn.disabled = true;
  setEventoStatus('Guardando…', '');

  const body = {
    titulo:      document.getElementById('ev-titulo').value.trim(),
    tipo:        document.getElementById('ev-tipo').value,
    descripcion: document.getElementById('ev-descripcion').value.trim() || null,
    urlImagen:   document.getElementById('ev-url-imagen').value.trim()  || null,
    urlExterna:  document.getElementById('ev-url-externa').value.trim() || null,
    localidad:   document.getElementById('ev-localidad').value.trim(),
    provincia:   document.getElementById('ev-provincia').value.trim(),
    pais:        document.getElementById('ev-pais').value.trim(),
    latitud:     parseFloat(lat),
    longitud:    parseFloat(lon),
    fechaInicio: document.getElementById('ev-inicio').value,
    fechaFin:    document.getElementById('ev-fin').value,
  };

  const url    = editingEventoId ? `${API}/eventos/${editingEventoId}` : `${API}/eventos`;
  const method = editingEventoId ? 'PUT' : 'POST';

  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  btn.disabled = false;
  if (!res) return;

  if (res.ok) {
    setEventoStatus(editingEventoId ? 'Evento actualizado' : 'Evento añadido', 'ok');
    resetEventoForm();
    loadEventos();
    setTimeout(() => setEventoStatus('', ''), 3000);
  } else {
    const data = await res.json().catch(() => ({}));
    setEventoStatus(data.error || 'Error al guardar el evento', 'err');
  }
});

// ── Eventos: borrar ───────────────────────────────

async function confirmDeleteEvento(id, localidad) {
  if (!confirm(`¿Eliminar el evento en "${localidad}"?`)) return;

  const res = await authFetch(`${API}/eventos/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadEventos();
}

function setEventoStatus(msg, type) {
  const el = document.getElementById('evento-status');
  el.textContent = msg;
  el.className   = type;
}

// ── Conversión HEIC ───────────────────────────────

async function convertirHeicSiNecesario(file) {
  const nombre = file.name.toLowerCase();
  const esHeic = nombre.endsWith('.heic') || nombre.endsWith('.heif')
               || file.type === 'image/heic' || file.type === 'image/heif';
  if (!esHeic) return file;
  try {
    const resultado = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const blob = Array.isArray(resultado) ? resultado[0] : resultado;
    const nuevoNombre = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], nuevoNombre, { type: 'image/jpeg' });
  } catch {
    return file; // si falla, devolver el original
  }
}

// ── Helpers ───────────────────────────────────────

function setStatus(msg, type) {
  const el = document.getElementById('upload-status');
  el.textContent = msg;
  el.className   = type;
}

// ── TIENDA ────────────────────────────────────────

const TIENDA_API = 'https://girandomadera.artesanosdeltorno.es/api';

async function tiendaFetch(path, options = {}) {
  const res = await fetch(TIENDA_API + path, {
    ...options,
    headers: { ...options.headers, 'Authorization': `Bearer ${token}` },
  });
  return res;
}

// ── Pedidos ───────────────────────────────────────

document.getElementById('btn-refresh-pedidos').addEventListener('click', loadPedidos);

const TRANSICIONES = {
  pendiente:  ['pagado', 'cancelado'],
  pagado:     ['enviado', 'cancelado'],
  enviado:    ['entregado', 'cancelado'],
  entregado:  [],
  cancelado:  [],
};

function estadoSelect(id, estadoActual) {
  const siguientes = TRANSICIONES[estadoActual] || [];
  if (siguientes.length === 0) {
    const label = estadoActual === 'entregado' ? '✓ Entregado' : '✗ Cancelado';
    const color = estadoActual === 'entregado' ? '#27ae60' : '#c0392b';
    return `<span style="font-size:.8rem;font-weight:700;color:${color}">${label}</span>`;
  }
  const opciones = [estadoActual, ...siguientes].map(e =>
    `<option value="${e}" ${e === estadoActual ? 'selected' : ''}>${e.charAt(0).toUpperCase() + e.slice(1)}</option>`
  ).join('');
  return `<select onchange="cambiarEstadoPedido(${id}, this.value, this)" data-prev="${estadoActual}" style="font-size:.8rem;padding:.3rem;border-radius:4px;border:1px solid #ddd">${opciones}</select>`;
}

let _pedidosFiltro = 'pagado';

const _filtrosHtml = `
  <div id="pedidos-filtros" style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem">
    ${['todos','pendiente','pagado','enviado','entregado','cancelado'].map(f =>
      `<button onclick="filtrarPedidos('${f}')" id="filtro-${f}"
        style="padding:.3rem .85rem;border-radius:20px;border:1.5px solid #e0d5c4;font-size:.78rem;font-weight:700;cursor:pointer;background:${f==='pagado'?'#2d1f14':'white'};color:${f==='pagado'?'white':'#7a6652'}">
        ${f.charAt(0).toUpperCase()+f.slice(1)}
      </button>`
    ).join('')}
  </div>`;

async function loadPedidos() {
  const el = document.getElementById('pedidos-list');
  el.innerHTML = '<p style="color:#888;font-size:.9rem">Cargando pedidos…</p>';
  try {
    const res  = await tiendaFetch('/admin/pedidos');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p style="color:#888;font-size:.9rem">No hay pedidos todavía.</p>';
      return;
    }
    window._todosLosPedidos = data;
    renderPedidos(data);
  } catch (e) {
    el.innerHTML = '<p style="color:#c0392b;font-size:.9rem">Error al cargar pedidos.</p>';
  }
}

function filtrarPedidos(filtro) {
  _pedidosFiltro = filtro;
  document.querySelectorAll('[id^="filtro-"]').forEach(btn => {
    const active = btn.id === `filtro-${filtro}`;
    btn.style.background = active ? '#2d1f14' : 'white';
    btn.style.color = active ? 'white' : '#7a6652';
  });
  const datos = filtro === 'todos' ? window._todosLosPedidos : window._todosLosPedidos.filter(p => p.estado === filtro);
  renderTabla(datos);
}

function renderPedidos(data) {
  const el = document.getElementById('pedidos-list');
  el.innerHTML = _filtrosHtml + '<div id="pedidos-tabla"></div>';
  const filtrados = _pedidosFiltro === 'todos' ? data : data.filter(p => p.estado === _pedidosFiltro);
  renderTabla(filtrados);
}

function renderTabla(data) {
  const el = document.getElementById('pedidos-tabla');
  if (!data || data.length === 0) {
    el.innerHTML = '<p style="color:#888;font-size:.9rem;padding:.5rem 0">No hay pedidos con este estado.</p>';
    return;
  }
  const colorEstado = { pendiente:'#e67e22', pagado:'#27ae60', enviado:'#2980b9', entregado:'#27ae60', cancelado:'#c0392b' };
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.88rem">
    <thead><tr style="background:#f4ede6;text-align:left">
      <th style="padding:.6rem .8rem">#</th>
      <th style="padding:.6rem .8rem">Cliente</th>
      <th style="padding:.6rem .8rem">Total</th>
      <th style="padding:.6rem .8rem">Zona</th>
      <th style="padding:.6rem .8rem">Estado</th>
      <th style="padding:.6rem .8rem">Fecha</th>
      <th style="padding:.6rem .8rem">Acciones</th>
    </tr></thead>
    <tbody>${data.map(p => {
      const fecha = new Date(p.createdAt).toLocaleDateString('es-ES');
      const color = colorEstado[p.estado] || '#888';
      return `<tr style="border-bottom:1px solid #f0e8e0">
        <td style="padding:.6rem .8rem;font-weight:700">#${p.id}</td>
        <td style="padding:.6rem .8rem">${p.nombre}<br><small style="color:#888">${p.email}</small></td>
        <td style="padding:.6rem .8rem;font-weight:700">${p.total.toFixed(2)} €</td>
        <td style="padding:.6rem .8rem">${p.zona === 'baleares' ? 'Baleares' : 'Península'}</td>
        <td style="padding:.6rem .8rem"><span style="color:${color};font-weight:700;text-transform:capitalize">${p.estado}</span></td>
        <td style="padding:.6rem .8rem;color:#888">${fecha}</td>
        <td style="padding:.6rem .8rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
          ${estadoSelect(p.id, p.estado)}
          <a href="https://girandomadera.artesanosdeltorno.es/albaran.html?pedido=${p.id}&token=${encodeURIComponent(token)}" target="_blank"
            style="font-size:.78rem;padding:.25rem .6rem;border-radius:4px;background:#f4ede6;border:1px solid #ddd;text-decoration:none;color:#2d1f14;white-space:nowrap">
            🖨 Albarán
          </a>
          <button onclick="enviarAlbaran(${p.id},'${p.email}',this)"
            style="font-size:.78rem;padding:.25rem .6rem;border-radius:4px;background:#e8f4fd;border:1px solid #ddd;cursor:pointer;white-space:nowrap">
            📧 Enviar
          </button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

async function enviarAlbaran(id, email, btn) {
  if (!confirm(`¿Enviar el albarán del pedido #${id} a ${email}?`)) return;
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
  const res = await tiendaFetch(`/admin/pedidos/${id}/albaran`, { method: 'POST' });
  if (btn) { btn.disabled = false; btn.textContent = '📧 Albarán'; }
  if (res.ok) {
    alert(`✓ Albarán enviado a ${email}`);
  } else {
    alert('Error al enviar el albarán. Inténtalo de nuevo.');
  }
}

async function cambiarEstadoPedido(id, estado, selectEl) {
  const mensajes = {
    enviado:   '📦 Esto marcará el pedido como enviado y el cliente recibirá un email automático diciéndole que su pedido está en camino.\n\n¿Ya has llevado el paquete a correos?',
    cancelado: '⚠️ Esto cancelará el pedido de forma IRREVERSIBLE.\n\nEl dinero NO se devuelve automáticamente — tendrás que hacerlo manualmente desde Stripe.\n\n¿Estás seguro?',
    entregado: '¿Marcar este pedido como entregado?',
    pagado:    '¿Confirmar este cambio de estado?',
  };
  const msg = mensajes[estado] || '¿Confirmar este cambio de estado?';
  if (!confirm(msg)) {
    selectEl.value = selectEl.dataset.prev || selectEl.value;
    return;
  }
  selectEl.disabled = true;
  const res = await tiendaFetch(`/admin/pedidos/${id}/estado`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  selectEl.disabled = false;
  if (res.ok) {
    loadPedidos();
  } else {
    selectEl.value = selectEl.dataset.prev || selectEl.value;
    alert('Error al cambiar el estado. Inténtalo de nuevo.');
  }
}

// ── Productos admin ───────────────────────────────

let _productoEditando = null;

document.getElementById('btn-refresh-productos').addEventListener('click', loadProductosAdmin);

async function loadProductosAdmin() {
  const el = document.getElementById('productos-admin-list');
  el.innerHTML = '<p style="color:#888;font-size:.9rem">Cargando productos…</p>';
  try {
    const res  = await tiendaFetch('/admin/productos');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p style="color:#888;font-size:.9rem">No hay productos. Crea el primero abajo.</p>';
      return;
    }
    el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.88rem">
      <thead><tr style="background:#f4ede6;text-align:left">
        <th style="padding:.6rem .8rem">Nombre</th>
        <th style="padding:.6rem .8rem">Precio</th>
        <th style="padding:.6rem .8rem">Stock</th>
        <th style="padding:.6rem .8rem">Estado</th>
        <th style="padding:.6rem .8rem">Acciones</th>
      </tr></thead>
      <tbody>${data.map(p => `<tr style="border-bottom:1px solid #f0e8e0;${!p.activo ? 'opacity:.55;' : ''}">
        <td style="padding:.6rem .8rem;font-weight:600">${p.nombre}</td>
        <td style="padding:.6rem .8rem">${p.precio.toFixed(2)} €</td>
        <td style="padding:.6rem .8rem">${p.stock === 0 ? '<span style="color:#c0392b">Agotado</span>' : p.stock}</td>
        <td style="padding:.6rem .8rem">${p.activo ? '<span style="color:#27ae60">✓ Visible</span>' : '<span style="color:#999">✗ Oculto</span>'}${p.destacado?' ⭐':''}</td>
        <td style="padding:.6rem .8rem;display:flex;gap:.4rem;flex-wrap:wrap">
          <button onclick="abrirFotosModal(${p.id},'${p.nombre.replace(/'/g,"\\'")}',${JSON.stringify(p.fotos).replace(/"/g,'&quot;')})" style="font-size:.78rem;padding:.25rem .6rem;border-radius:4px;background:#f0e8e0;border:1px solid #ddd;cursor:pointer">📷 Fotos (${p.fotos.length})</button>
          <button onclick="abrirEditModal(${JSON.stringify(p).replace(/"/g,'&quot;')})" style="font-size:.78rem;padding:.25rem .6rem;border-radius:4px;background:#e8f4fd;border:1px solid #ddd;cursor:pointer">✏️ Editar</button>
          <button onclick="eliminarProducto(${p.id},'${p.nombre.replace(/'/g,"\\'")}')" style="font-size:.78rem;padding:.25rem .6rem;border-radius:4px;background:#fde8e8;border:1px solid #ddd;cursor:pointer;color:#c0392b">🗑 Borrar</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch {
    el.innerHTML = '<p style="color:#c0392b;font-size:.9rem">Error al cargar productos.</p>';
  }
}

// Crear producto
document.getElementById('producto-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn    = document.getElementById('btn-crear-producto');
  const status = document.getElementById('producto-status');
  btn.disabled = true;
  status.textContent = '';

  const payload = {
    nombre:      document.getElementById('p-nombre').value.trim(),
    precio:      parseFloat(document.getElementById('p-precio').value),
    stock:       parseInt(document.getElementById('p-stock').value),

    descripcion: document.getElementById('p-descripcion').value.trim(),
    destacado:   document.getElementById('p-destacado').checked,
    activo:      document.getElementById('p-activo').checked,
  };

  try {
    const res  = await tiendaFetch('/admin/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      status.textContent = `✓ "${data.nombre}" creado correctamente`;
      status.style.color = '#27ae60';
      document.getElementById('producto-form').reset();
      document.getElementById('p-activo').checked = true;
      loadProductosAdmin();
      setTimeout(() => { status.textContent = ''; }, 3000);
    } else {
      status.textContent = data.error || 'Error al crear el producto';
      status.style.color = '#c0392b';
    }
  } catch {
    status.textContent = 'Error de conexión';
    status.style.color = '#c0392b';
  } finally {
    btn.disabled = false;
  }
});

// Eliminar producto
async function eliminarProducto(id, nombre) {
  if (!confirm(`¿Eliminar "${nombre}"? Las fotos se moverán al backup.`)) return;
  const res = await tiendaFetch(`/admin/productos/${id}`, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    loadProductosAdmin();
  }
}

// ── Modal de edición ──────────────────────────────

function abrirEditModal(producto) {
  _productoEditando = producto;
  document.getElementById('edit-id').value          = producto.id;
  document.getElementById('edit-nombre').value      = producto.nombre;
  document.getElementById('edit-precio').value      = producto.precio;
  document.getElementById('edit-stock').value       = producto.stock;
  document.getElementById('edit-descripcion').value = producto.descripcion || '';
  document.getElementById('edit-destacado').checked = producto.destacado;
  document.getElementById('edit-activo').checked    = producto.activo;
  document.getElementById('edit-status').textContent = '';
  document.getElementById('edit-modal').style.display = 'block';
}

function cerrarEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  _productoEditando = null;
}

async function guardarEdicion() {
  const id     = parseInt(document.getElementById('edit-id').value);
  const status = document.getElementById('edit-status');
  const payload = {
    nombre:      document.getElementById('edit-nombre').value.trim(),
    precio:      parseFloat(document.getElementById('edit-precio').value),
    stock:       parseInt(document.getElementById('edit-stock').value),
    descripcion: document.getElementById('edit-descripcion').value.trim(),
    destacado:   document.getElementById('edit-destacado').checked,
    activo:      document.getElementById('edit-activo').checked,
  };
  try {
    const res  = await tiendaFetch(`/admin/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      cerrarEditModal();
      loadProductosAdmin();
    } else {
      status.textContent = data.error || 'Error al guardar';
      status.style.color = '#c0392b';
    }
  } catch {
    status.textContent = 'Error de conexión';
    status.style.color = '#c0392b';
  }
}

// ── Modal de fotos ────────────────────────────────

let _fotoProductoId = null;

function abrirFotosModal(id, nombre, fotos) {
  _fotoProductoId = id;
  document.getElementById('fotos-modal-title').textContent = `Fotos — ${nombre}`;
  document.getElementById('foto-upload-status').textContent = '';
  renderFotosModal(fotos);
  document.getElementById('fotos-modal').style.display = 'block';
}

function cerrarFotosModal() {
  document.getElementById('fotos-modal').style.display = 'none';
  _fotoProductoId = null;
}

function renderFotosModal(fotos) {
  const grid = document.getElementById('fotos-modal-grid');
  if (!fotos || fotos.length === 0) {
    grid.innerHTML = '<p style="color:#888;font-size:.88rem;grid-column:1/-1">Sin fotos todavía.</p>';
    return;
  }
  grid.innerHTML = fotos.map(f => `
    <div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:#f4ede6">
      ${f.tipo === 'video'
        ? `<video src="${f.url}" style="width:100%;height:100%;object-fit:cover" muted></video>`
        : `<img src="${f.url}" style="width:100%;height:100%;object-fit:cover">`}
      <button onclick="eliminarFotoProducto(${f.id})"
        style="position:absolute;top:.3rem;right:.3rem;background:rgba(192,57,43,.9);color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">✕</button>
    </div>`).join('');
}

async function subirFotoProducto() {
  if (!_fotoProductoId) return;
  const input  = document.getElementById('foto-producto-input');
  const status = document.getElementById('foto-upload-status');
  const raw    = input.files[0];
  if (!raw) return;

  status.textContent = 'Procesando…';
  status.style.color = '#888';

  const file = await convertirHeicSiNecesario(raw);

  status.textContent = 'Subiendo…';

  const fd = new FormData();
  fd.append('foto', file);

  try {
    const res  = await tiendaFetch(`/admin/productos/${_fotoProductoId}/fotos`, { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      status.textContent = '✓ Subida correctamente';
      status.style.color = '#27ae60';
      input.value = '';
      // Recargar fotos del modal
      const res2  = await tiendaFetch('/admin/productos');
      const prods = await res2.json();
      const prod  = prods.find(p => p.id === _fotoProductoId);
      if (prod) renderFotosModal(prod.fotos);
      loadProductosAdmin();
      setTimeout(() => { status.textContent = ''; }, 2500);
    } else {
      status.textContent = data.error || 'Error al subir';
      status.style.color = '#c0392b';
    }
  } catch {
    status.textContent = 'Error de conexión';
    status.style.color = '#c0392b';
  }
}

async function eliminarFotoProducto(fotoId) {
  if (!_fotoProductoId || !confirm('¿Eliminar esta foto?')) return;
  const res = await tiendaFetch(`/admin/productos/${_fotoProductoId}/fotos/${fotoId}`, { method: 'DELETE' });
  if (res.ok || res.status === 204) {
    const res2  = await tiendaFetch('/admin/productos');
    const prods = await res2.json();
    const prod  = prods.find(p => p.id === _fotoProductoId);
    if (prod) { renderFotosModal(prod.fotos); loadProductosAdmin(); }
  }
}

// Cerrar modales al hacer clic fuera
document.getElementById('fotos-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('fotos-modal')) cerrarFotosModal();
});
document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('edit-modal')) cerrarEditModal();
});

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('aetm_token');
    localStorage.removeItem('aetm_slug');
    showLogin();
    return null;
  }

  return res;
}

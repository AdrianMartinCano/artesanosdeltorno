// ── Artesanos ─────────────────────────────────────
let todosLosArtesanos  = [];
let _mapInstance       = null;
let _mapInitialized    = false;
const ARTISANS_PER_PAGE = 6;
let artisansPage = 0;

async function loadArtisans() {
  const grid = document.getElementById('artisans-grid');
  try {
    const res = await fetch(`${API_BASE}/artesano`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    todosLosArtesanos = await res.json();
    if (todosLosArtesanos.length <= ARTISANS_PER_PAGE) {
      document.getElementById('btn-ver-artesanos').style.display = 'none';
      renderArtisans(todosLosArtesanos);
    } else {
      document.getElementById('artisans-pagination').style.display = 'flex';
      renderArtisansPage(0);
    }
    preGeocodeAll(todosLosArtesanos);
  } catch (err) {
    console.error('Error cargando artesanos', err);
    grid.innerHTML = `
      <div class="events-error">
        <div class="events-error__icon">⚠️</div>
        <div class="events-error__title">No se pudieron cargar los artesanos</div>
      </div>`;
  }
}

function renderArtisansPage(page) {
  artisansPage = page;
  const totalPages = Math.ceil(todosLosArtesanos.length / ARTISANS_PER_PAGE);
  renderArtisans(todosLosArtesanos.slice(page * ARTISANS_PER_PAGE, (page + 1) * ARTISANS_PER_PAGE));
  document.getElementById('artisans-page-info').textContent = `${page + 1} / ${totalPages}`;
  document.getElementById('btn-artisans-prev').disabled = page === 0;
  document.getElementById('btn-artisans-next').disabled = page >= totalPages - 1;
}

document.getElementById('btn-artisans-prev').addEventListener('click', () => {
  if (artisansPage > 0) renderArtisansPage(artisansPage - 1);
});

document.getElementById('btn-artisans-next').addEventListener('click', () => {
  const totalPages = Math.ceil(todosLosArtesanos.length / ARTISANS_PER_PAGE);
  if (artisansPage < totalPages - 1) renderArtisansPage(artisansPage + 1);
});

document.getElementById('btn-ver-artesanos').addEventListener('click', () => {
  renderArtisans(todosLosArtesanos);
  document.getElementById('btn-ver-artesanos').style.display = 'none';
  document.getElementById('artisans-pagination').style.display = 'none';
});

// Swipe táctil para móvil
(function () {
  let swipeStartX = 0;
  const grid = document.getElementById('artisans-grid');
  grid.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  grid.addEventListener('touchend', e => {
    const diff = swipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (document.getElementById('artisans-pagination').style.display === 'none') return;
    const totalPages = Math.ceil(todosLosArtesanos.length / ARTISANS_PER_PAGE);
    if (diff > 0 && artisansPage < totalPages - 1) renderArtisansPage(artisansPage + 1);
    if (diff < 0 && artisansPage > 0) renderArtisansPage(artisansPage - 1);
  }, { passive: true });
})();

function renderArtisans(artisans) {
  const grid   = document.getElementById('artisans-grid');
  const emojis = ['🎨', '🔩', '🌿', '🎪', '🏺', '✨'];

  grid.innerHTML = artisans.map((a, i) => `
    <article class="artisan-card reveal">
      <div class="artisan-card__photo">
        <div class="img-placeholder"><div class="img-icon">${emojis[i % emojis.length]}</div></div>
        ${a.foto_perfil
          ? `<img src="${mediaUrl(a.foto_perfil)}" alt="${a.nombre}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;" onerror="this.style.display='none'">`
          : ''}
        <div class="artisan-card__photo-overlay"></div>
        <span class="artisan-card__specialty">${(a.especialidad||'').toUpperCase()}</span>
      </div>
      <div class="artisan-card__body">
        <h3 class="artisan-card__name">${a.nombre}</h3>
        <p class="artisan-card__location">📍 ${a.localidad} (${a.provincia})</p>
        <p class="artisan-card__bio">${a.biografia}</p>
        <div class="artisan-card__footer">
          <div class="artisan-card__years"><strong>${a.anosExperiencia}</strong> años de oficio</div>
          <a class="btn btn-outline" href="artesano.html?slug=${a.slug}" style="padding:9px 20px;font-size:11px;">Ver perfil →</a>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  if (window._adt_translate_el) window._adt_translate_el(grid);
}

// ── Eventos ───────────────────────────────────────
async function loadEvents() {
  const container = document.getElementById('events-container');
  try {
    const res = await fetch(`${API_BASE}/eventos/futuros`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const eventos = await res.json();
    if (!eventos.length) throw new Error('Sin eventos');
    renderEvents(eventos);
  } catch {
    container.innerHTML = `
      <div class="events-error">
        <div class="events-error__icon">⚠️</div>
        <div class="events-error__title">No hay eventos futuros disponibles :(</div>
      </div>`;
  }
}

async function loadAllEvents() {
  const container = document.getElementById('events-container');
  container.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE}/eventos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const eventos = await res.json();
    if (!eventos.length) throw new Error('Sin eventos');
    renderEvents(eventos);
  } catch {
    container.innerHTML = `
      <div class="events-error">
        <div class="events-error__icon">⚠️</div>
        <div class="events-error__title">No se pudo cargar la agenda</div>
      </div>`;
  }
}

// "Ver agenda completa" ahora es un enlace a eventos.html

function renderEvents(eventos) {
  injectEventStructuredData(eventos);
  const container = document.getElementById('events-container');
  const grid = document.createElement('div');
  grid.className = 'events-grid';
  grid.innerHTML = eventos.map(renderEventCard).join('');
  container.innerHTML = '';
  container.appendChild(grid);

  grid.querySelectorAll('.event-card').forEach((card, i) => {
    card.style.opacity    = '0';
    card.style.transform  = 'translateY(24px)';
    card.style.transition = `opacity .5s ease ${i * .12}s, transform .5s ease ${i * .12}s`;
    requestAnimationFrame(() => {
      card.style.opacity   = '1';
      card.style.transform = 'none';
    });
  });
  if (window._adt_translate_el) window._adt_translate_el(container);
}

function renderEventCard(ev) {
  const inicio     = new Date(ev.fechaInicio);
  const fin        = new Date(ev.fechaFin);
  const diaInicio  = inicio.getDate();
  const _locale    = localStorage.getItem(window._adt_lang_key || 'adt_lang') === 'en' ? 'en-US' : 'es-ES';
  const mesInicio  = inicio.toLocaleString(_locale, { month: 'short' });
  const anioInicio = inicio.getFullYear();
  const diaFin     = fin.getDate();
  const mesFin     = fin.toLocaleString(_locale, { month: 'short' });

  return `
    <article class="event-card">
      <div class="event-card__image">
        <iframe width="100%" height="100%" style="border:0;" loading="lazy" allowfullscreen
          src="https://www.google.com/maps?q=${ev.latitud},${ev.longitud}&output=embed"></iframe>
      </div>
      <div class="event-card__body">
        <div class="event-card__date">
          <div class="event-card__date-badge">
            <div class="event-date-day">${diaInicio}</div>
            <div class="event-date-month">${mesInicio}</div>
          </div>
          <div class="event-card__date-badge">
            <div class="event-date-day">${diaFin}</div>
            <div class="event-date-month">${mesFin}</div>
          </div>
          <div>
            <div class="event-card__date-year">${anioInicio}</div>
            <div class="event-card__date-place">${ev.localidad}, ${ev.provincia}</div>
          </div>
        </div>
        <h3 class="event-card__title">Evento en ${ev.localidad}</h3>
      </div>
    </article>`;
}

// ── Scroll reveal ─────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Imágenes del sitio ────────────────────────────

async function loadSiteMedia() {
  try {
    const res = await fetch(`${API_BASE}/config/site-media`);
    if (!res.ok) return;
    const data = await res.json();

    // Imagen La Asociación
    const srcAsociacion = mediaUrl(data.asociacion);
    if (srcAsociacion) {
      const wrap = document.getElementById('img-about-wrap');
      if (wrap) {
        const img = document.createElement('img');
        img.src = srcAsociacion;
        img.alt = 'La Asociación';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;';
        img.onerror = () => img.remove();
        wrap.style.position = 'relative';
        wrap.appendChild(img);
      }
    }

    // Imágenes hero
    if (Array.isArray(data.hero)) {
      data.hero.forEach((url, i) => {
        const src = mediaUrl(url);
        if (!src) return;
        const wrap = document.getElementById(`hero-img-${i + 1}-wrap`);
        if (!wrap) return;
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;';
        img.onerror = () => img.remove();
        wrap.style.position = 'relative';
        wrap.appendChild(img);
      });
    }

    // Galería
    if (Array.isArray(data.galeria)) {
      data.galeria.forEach((item, i) => {
        const el = document.querySelector(`[data-src="img-gallery-${i + 1}"]`);
        if (!el) return;
        const srcGaleria = mediaUrl(item.url);
        if (srcGaleria) {
          el.dataset.realSrc = srcGaleria;
          const placeholder = el.querySelector('.img-placeholder');
          if (placeholder) {
            const img = document.createElement('img');
            img.src = srcGaleria;
            img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
            img.onerror = () => img.remove();
            placeholder.style.position = 'relative';
            placeholder.appendChild(img);
          }
        }
        if (item.etiqueta) {
          const label = el.querySelector('.gallery-item__label');
          if (label) label.textContent = item.etiqueta;
        }
      });
    }
  } catch {}
}

// ── Lightbox (galería principal) ──────────────────
const _lightbox    = document.getElementById('lightbox');
const _lightboxImg = document.getElementById('lightbox-img');
const _closeLightbox = () => { _lightbox.classList.remove('open'); document.body.style.overflow = ''; };

document.querySelectorAll('.gallery-item').forEach(item => {
  const open = () => {
    if (item.dataset.realSrc) {
      _lightboxImg.innerHTML = `<img src="${item.dataset.realSrc}" style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px;">`;
    } else {
      _lightboxImg.innerHTML = `<div class="img-placeholder ${item.dataset.src}" style="height:100%;min-height:unset;"><div class="img-icon" style="font-size:6rem;">🪵</div></div>`;
    }
    _lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  item.addEventListener('click', open);
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});

document.getElementById('lightbox-close').addEventListener('click', _closeLightbox);
_lightbox.addEventListener('click', e => { if (e.target === _lightbox) _closeLightbox(); });

// ── Formulario de contacto ────────────────────────
const _cfForm = document.getElementById('contact-form');
if (_cfForm) {
  _cfForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn    = document.getElementById('cf-submit');
    const status = document.getElementById('cf-status');
    btn.disabled = true;
    status.textContent = 'Enviando…';
    status.style.color = '#888';

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:  document.getElementById('cf-nombre').value.trim(),
          email:   document.getElementById('cf-email').value.trim(),
          asunto:  document.getElementById('cf-asunto').value.trim(),
          mensaje: document.getElementById('cf-mensaje').value.trim(),
          hp:      document.getElementById('cf-hp')?.value ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        status.textContent = '✓ Mensaje enviado. Te responderemos pronto.';
        status.style.color = '#2e7d32';
        _cfForm.reset();
      } else {
        status.textContent = data.error || 'Error al enviar. Inténtalo de nuevo.';
        status.style.color = '#c0392b';
      }
    } catch {
      status.textContent = 'Error de conexión. Inténtalo de nuevo.';
      status.style.color = '#c0392b';
    } finally {
      btn.disabled = false;
    }
  });
}

// ── Newsletter ────────────────────────────────────

(function () {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email  = document.getElementById('nl-email').value.trim();
    const nombre = document.getElementById('nl-nombre').value.trim();
    const hp     = document.getElementById('nl-hp')?.value ?? '';
    const btn    = document.getElementById('nl-submit');
    const status = document.getElementById('nl-status');

    if (!email) {
      document.getElementById('nl-email').style.borderColor = '#e74c3c';
      status.textContent = 'Introduce tu email.';
      status.style.color = '#e74c3c';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando…';
    status.textContent = '';

    try {
      const res  = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre, hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.yaExiste) {
          status.textContent = 'Este email ya está suscrito.';
          status.style.color = '#c8a97e';
        } else {
          status.textContent = '✓ ¡Suscripción completada! Gracias por unirte.';
          status.style.color = '#c8a97e';
          form.reset();
        }
      } else {
        status.textContent = data.error || 'Error al suscribirse. Inténtalo de nuevo.';
        status.style.color = '#e74c3c';
      }
    } catch {
      status.textContent = 'Error de conexión. Inténtalo de nuevo.';
      status.style.color = '#e74c3c';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Suscribirme';
    }
  });
})();

// ── Mapa de socios ────────────────────────────────

const _GEOCODE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

async function geocodeArtisan(a) {
  if (!a.localidad && !a.provincia) return null;
  const key = `adt_geo_${a.slug}`;
  try {
    const hit = localStorage.getItem(key);
    if (hit) {
      const { coords, ts } = JSON.parse(hit);
      if (Date.now() - ts < _GEOCODE_TTL) return coords;
    }
  } catch {}
  const q = [a.localidad, a.provincia, 'España'].filter(Boolean).join(', ');
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=es`);
    const data = await res.json();
    if (data[0]) {
      const coords = { lat: +data[0].lat, lon: +data[0].lon };
      localStorage.setItem(key, JSON.stringify({ coords, ts: Date.now() }));
      return coords;
    }
  } catch {}
  return null;
}

async function initMap() {
  const map = L.map('artisans-map', { zoomControl: true }).setView([40.4, -3.7], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);
  _mapInstance = map;

  const cluster = L.markerClusterGroup({
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
  });

  const icon = L.divIcon({
    html: '<div class="map-pin"></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -12],
  });

  const artesanos = todosLosArtesanos.filter(a => a.activo !== false && (a.localidad || a.provincia));
  const coords = await Promise.all(artesanos.map(geocodeArtisan));
  const bounds = [];

  artesanos.forEach((a, i) => {
    const c = coords[i];
    if (!c) return;
    const foto = a.foto_perfil
      ? `<img class="mp-foto" src="${mediaUrl(a.foto_perfil)}" alt="${escapeHTML(a.nombre)}" onerror="this.style.display='none'">`
      : `<div class="mp-foto mp-foto--placeholder">🪵</div>`;
    const popup = `
      <div class="map-popup">
        <div class="mp-header">
          ${foto}
          <div class="mp-info">
            <strong>${escapeHTML(a.nombre)}</strong>
            ${a.especialidad ? `<span class="mp-esp">${escapeHTML(a.especialidad)}</span>` : ''}
          </div>
        </div>
        <span class="mp-loc">📍 ${escapeHTML([a.localidad, a.provincia].filter(Boolean).join(', '))}</span>
        <a class="mp-link" href="artesano.html?slug=${encodeURIComponent(a.slug)}&from=mapa">Ver perfil →</a>
      </div>`;
    cluster.addLayer(L.marker([c.lat, c.lon], { icon }).bindPopup(popup, { maxWidth: 240 }));
    bounds.push([c.lat, c.lon]);
  });

  map.addLayer(cluster);
  document.getElementById('map-loading').style.display = 'none';
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  else if (bounds.length === 1) map.setView(bounds[0], 9);
}

async function preGeocodeAll(artesanos) {
  const sinCache = artesanos.filter(a => {
    if (!a.localidad && !a.provincia) return false;
    try {
      const hit = localStorage.getItem(`adt_geo_${a.slug}`);
      if (!hit) return true;
      const { ts } = JSON.parse(hit);
      return Date.now() - ts >= _GEOCODE_TTL;
    } catch { return true; }
  });
  for (let i = 0; i < sinCache.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1100));
    await geocodeArtisan(sinCache[i]);
  }
}

function initSociosToggle() {
  const btnLista    = document.getElementById('btn-vista-lista');
  const btnMapa     = document.getElementById('btn-vista-mapa');
  const grid        = document.getElementById('artisans-grid');
  const mapEl       = document.getElementById('artisans-map');
  const pagination  = document.getElementById('artisans-pagination');
  const btnVerTodos = document.getElementById('btn-ver-artesanos');
  let paginationWasVisible = false;

  btnLista.addEventListener('click', () => {
    if (btnLista.classList.contains('active')) return;
    btnLista.classList.add('active');    btnLista.setAttribute('aria-pressed', 'true');
    btnMapa.classList.remove('active'); btnMapa.setAttribute('aria-pressed', 'false');
    grid.style.display  = '';
    mapEl.style.display = 'none';
    if (paginationWasVisible) pagination.style.display = 'flex';
  });

  btnMapa.addEventListener('click', async () => {
    if (btnMapa.classList.contains('active')) return;
    paginationWasVisible = pagination.style.display !== 'none';
    btnMapa.classList.add('active');    btnMapa.setAttribute('aria-pressed', 'true');
    btnLista.classList.remove('active'); btnLista.setAttribute('aria-pressed', 'false');
    grid.style.display       = 'none';
    pagination.style.display = 'none';
    btnVerTodos.style.display = 'none';
    mapEl.style.display      = '';

    if (!_mapInitialized) {
      _mapInitialized = true;
      await initMap();
    } else {
      setTimeout(() => _mapInstance?.invalidateSize(), 50);
    }
  });
}

// ── Init ──────────────────────────────────────────
// Título estático — no animar para no confundir a Google
loadAnuncio();
loadArtisans();
loadEvents();
loadSiteMedia();
initSociosToggle();

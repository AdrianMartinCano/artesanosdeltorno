// ── Data ──────────────────────────────────────────
async function fetchArtesano(slug) {
  const res = await fetch(`${API_BASE}/artesano/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchMedia(slug) {
  const res = await fetch(`${API_BASE}/artesano/${slug}/media`);
  if (!res.ok) return [];
  return res.json();
}

// ── Render: hero ──────────────────────────────────
function renderHero(a) {
  setText('nombre',       a.nombre);
  setText('especialidad',  a.especialidad);
  setText('especialidad2', a.especialidad);
  setText('localidad',    [a.localidad, a.provincia].filter(Boolean).join(', '));
  setText('anos',         a.anosExperiencia);
  setText('bio',          a.biografia);

  if (a.fechaCreacion) {
    setText('miembro-desde', new Date(a.fechaCreacion).getFullYear());
    document.getElementById('meta-miembro').style.display = '';
  }

  if (a.foto_perfil) {
    const img = document.getElementById('foto-perfil');
    img.src = mediaUrl(a.foto_perfil);
    img.alt = a.nombre;
    img.classList.remove('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      document.getElementById('foto-placeholder').classList.remove('hidden');
    };
    document.getElementById('foto-placeholder').classList.add('hidden');
  }

  startTitleAnimation(`🪵 ${a.nombre} — Artesanos del Torno`);

  // SEO dinámico
  const desc = `${a.nombre}, artesano del torno especializado en ${a.especialidad || 'torneado artesanal'}. ${a.localidad ? a.localidad + ', ' + a.provincia + '.' : ''} ${a.anosExperiencia ? a.anosExperiencia + ' años de experiencia.' : ''}`.trim();
  document.querySelector('meta[name="description"]').setAttribute('content', desc);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${a.nombre} — Artesanos del Torno`);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', `https://artesanosdeltorno.es/artesano.html?slug=${a.slug}`);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', `${a.nombre} — Artesanos del Torno`);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', desc);
  document.title = `${a.nombre} — Artesanos del Torno`;

  // Schema.org Person
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": a.nombre,
    "jobTitle": a.especialidad || "Artesano del torno",
    "description": a.biografia || desc,
    "url": `https://artesanosdeltorno.es/artesano.html?slug=${a.slug}`,
    "memberOf": {
      "@type": "Organization",
      "name": "Artesanos del Torno",
      "url": "https://artesanosdeltorno.es"
    }
  };
  if (a.localidad) schema.address = { "@type": "PostalAddress", "addressLocality": a.localidad, "addressRegion": a.provincia, "addressCountry": "ES" };
  if (a.foto_perfil) schema.image = mediaUrl(a.foto_perfil);
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(schema);
  document.head.appendChild(s);;
}

// ── Render: rrss ──────────────────────────────────
function renderRRSS(a) {
  const links = [
    { id: 'rrss-instagram', href: a.instagram ? `https://instagram.com/${a.instagram}` : null },
    { id: 'rrss-facebook',  href: a.facebook  ? `https://facebook.com/${a.facebook}`   : null },
    { id: 'rrss-twitter',   href: a.twitter   ? `https://x.com/${a.twitter}`            : null },
    { id: 'rrss-tiktok',    href: a.tiktok    ? `https://tiktok.com/@${a.tiktok}`       : null },
    { id: 'rrss-web',       href: a.web       ? (a.web.startsWith('http') ? a.web : `https://${a.web}`) : null },
  ];

  let anyVisible = false;
  links.forEach(({ id, href }) => {
    if (!href) return;
    const el = document.getElementById(id);
    el.href = href;
    el.classList.remove('hidden');
    anyVisible = true;
  });

  if (anyVisible) document.getElementById('rrss-section').classList.remove('hidden');
}

// ── Render: gallery con paginación ────────────────
const GALLERY_PER_PAGE = 3;
let _galleryItems = [];
let _galleryPage  = 0;

function renderGallery(items) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '<p class="gallery-empty">Este artesano aún no ha subido obras.</p>';
    grid.closest('.profile-section').style.marginTop = '32px';
    return;
  }

  _galleryItems = items;
  _galleryPage  = 0;
  renderGalleryPage();
}

function renderGalleryPage() {
  const grid  = document.getElementById('gallery-grid');
  const total = _galleryItems.length;
  const pages = Math.ceil(total / GALLERY_PER_PAGE);
  const start = _galleryPage * GALLERY_PER_PAGE;
  const slice = _galleryItems.slice(start, start + GALLERY_PER_PAGE);

  grid.innerHTML = slice.map(item => {
    const esVideo = item.tipo === 'VIDEO';
    const src = mediaUrl(item.url);
    const media = esVideo
      ? `<video class="gallery-media-real" src="${src}" muted preload="metadata" loop></video>
         <div class="gallery-play-btn" aria-hidden="true">▶</div>`
      : `<img class="gallery-media-real" src="${src}" alt="${escapeHTML(item.nombreOriginal)}" loading="lazy">`;
    return `
      <article class="gallery-card">
        <div class="gallery-media">
          <span class="gallery-type">${esVideo ? 'Vídeo' : 'Imagen'}</span>
          ${media}
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('video').forEach(v => {
    v.parentElement.addEventListener('mouseenter', () => v.play());
    v.parentElement.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
  });

  grid.querySelectorAll('.gallery-card').forEach((card, i) => {
    card.addEventListener('click', () => openLightbox(_galleryItems[start + i]));
  });

  // Paginación
  let pag = document.getElementById('gallery-pagination');
  if (pages <= 1) { if (pag) pag.remove(); return; }

  if (!pag) {
    pag = document.createElement('div');
    pag.id = 'gallery-pagination';
    pag.className = 'gallery-pagination';
    grid.parentNode.insertBefore(pag, grid.nextSibling);
  }

  pag.innerHTML = `
    <button class="gallery-pag-btn" id="gallery-prev" ${_galleryPage === 0 ? 'disabled' : ''}>← Anterior</button>
    <span class="gallery-pag-info">${_galleryPage + 1} / ${pages}</span>
    <button class="gallery-pag-btn" id="gallery-next" ${_galleryPage >= pages - 1 ? 'disabled' : ''}>Siguiente →</button>
  `;

  pag.querySelector('#gallery-prev').addEventListener('click', () => { _galleryPage--; renderGalleryPage(); });
  pag.querySelector('#gallery-next').addEventListener('click', () => { _galleryPage++; renderGalleryPage(); });
}

function renderSkeletons(count = 3) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <article class="gallery-card gallery-card--skeleton" aria-hidden="true">
      <div class="gallery-media"></div>
    </article>`).join('');
}

function renderError(msg = 'Artesano no encontrado') {
  const profile = document.querySelector('.artisan-profile');
  if (!profile) return;
  profile.innerHTML = `
    <div class="profile-error">
      <div class="profile-error__icon">⚠️</div>
      <div class="profile-error__title">${escapeHTML(msg)}</div>
      <div class="profile-error__desc">
        Vuelve al <a href="index.html#socios" class="btn-ghost">listado de artesanos</a>.
      </div>
    </div>`;
}

// ── Lightbox ──────────────────────────────────────
const lightbox        = document.getElementById('perfil-lightbox');
const lightboxContent = document.getElementById('perfil-lightbox-content');

function openLightbox(item) {
  const src = mediaUrl(item.url);
  lightboxContent.innerHTML = item.tipo === 'VIDEO'
    ? `<video src="${src}" controls autoplay playsinline></video>`
    : `<img src="${src}" alt="${escapeHTML(item.nombreOriginal)}">`;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxContent.innerHTML = '';
}

document.getElementById('perfil-lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ── Mapa de ubicación ─────────────────────────────
function renderMapa(a) {
  if (!a.localidad && !a.provincia) return;
  const query = encodeURIComponent([a.localidad, a.provincia, 'España'].filter(Boolean).join(', '));
  const section = document.createElement('section');
  section.className = 'profile-section';
  section.innerHTML = `
    <h2>Ubicación</h2>
    <p class="profile-section-subtitle section-label">Dónde trabaja</p>
    <iframe class="artisan-map-frame"
      src="https://www.google.com/maps?q=${query}&output=embed"
      loading="lazy" allowfullscreen
      title="Mapa de ${escapeHTML(a.localidad || a.provincia)}"></iframe>
  `;
  const gallery = document.querySelector('.profile-section');
  if (gallery) gallery.parentNode.insertBefore(section, gallery);
}

// ── Compartir perfil ──────────────────────────────
function setupCompartir(a) {
  const btn = document.getElementById('btn-compartir');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = `https://artesanosdeltorno.es/artesano.html?slug=${a.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: a.nombre, text: `Descubre el trabajo de ${a.nombre} en Artesanos del Torno`, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20,6 9,17 4,12"/></svg> ¡Enlace copiado!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      } catch {}
    }
  });
}

// ── Navegación entre artesanos (prev / next) ─────
async function renderNavPrevNext(slugActual) {
  try {
    const res = await fetch(`${API_BASE}/artesano`);
    if (!res.ok) return;
    const todos = (await res.json()).filter(a => a.activo !== false);
    const idx = todos.findIndex(a => a.slug === slugActual);
    if (idx === -1) return;
    const prev = idx > 0 ? todos[idx - 1] : null;
    const next = idx < todos.length - 1 ? todos[idx + 1] : null;
    if (!prev && !next) return;

    const nav = document.createElement('nav');
    nav.className = 'artisan-nav-bar';
    nav.setAttribute('aria-label', 'Navegar entre artesanos');
    nav.innerHTML = `
      ${prev
        ? `<a class="artisan-nav-btn" href="artesano.html?slug=${prev.slug}">
             <span class="artisan-nav-btn__arrow">←</span>
             <span class="artisan-nav-btn__info">
               <span class="artisan-nav-btn__label">Anterior</span>
               <span class="artisan-nav-btn__name">${escapeHTML(prev.nombre)}</span>
             </span>
           </a>`
        : '<div></div>'}
      ${next
        ? `<a class="artisan-nav-btn artisan-nav-btn--next" href="artesano.html?slug=${next.slug}">
             <span class="artisan-nav-btn__info">
               <span class="artisan-nav-btn__label">Siguiente</span>
               <span class="artisan-nav-btn__name">${escapeHTML(next.nombre)}</span>
             </span>
             <span class="artisan-nav-btn__arrow">→</span>
           </a>`
        : '<div></div>'}
    `;
    document.querySelector('.artisan-profile').appendChild(nav);
  } catch {}
}

// ── Artesanos cercanos (misma provincia, desde mapa) ─
async function renderCercanos(artesanoActual) {
  try {
    const res = await fetch(`${API_BASE}/artesano`);
    if (!res.ok) return;
    const todos = (await res.json()).filter(a => a.activo !== false && a.slug !== artesanoActual.slug);
    const mismaProv = todos.filter(a => a.provincia === artesanoActual.provincia);
    const candidatos = mismaProv.length > 0 ? mismaProv : todos;
    const muestra = candidatos.slice(0, 3);
    if (!muestra.length) return;

    const titulo = mismaProv.length > 0
      ? `Otros artesanos de ${escapeHTML(artesanoActual.provincia)}`
      : 'Otros artesanos';

    const section = document.createElement('section');
    section.className = 'profile-section artisan-cercanos';
    section.innerHTML = `
      <h2>${titulo}</h2>
      <div class="cercanos-grid">
        ${muestra.map(a => `
          <a class="cercano-card" href="artesano.html?slug=${encodeURIComponent(a.slug)}&from=mapa">
            <div class="cercano-foto">
              ${a.foto_perfil
                ? `<img src="${mediaUrl(a.foto_perfil)}" alt="${escapeHTML(a.nombre)}" onerror="this.style.display='none'">`
                : `<span aria-hidden="true">🪵</span>`}
            </div>
            <div class="cercano-info">
              <strong>${escapeHTML(a.nombre)}</strong>
              ${a.especialidad ? `<span>${escapeHTML(a.especialidad)}</span>` : ''}
              <span class="cercano-loc">📍 ${escapeHTML([a.localidad, a.provincia].filter(Boolean).join(', '))}</span>
            </div>
          </a>`).join('')}
      </div>`;
    document.querySelector('.artisan-profile').appendChild(section);
  } catch {}
}

// ── Helpers ───────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

// ── Init ──────────────────────────────────────────
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('slug');
  const desde  = params.get('from');
  if (!slug) { renderError('No se ha especificado ningún artesano.'); return; }

  loadAnuncio();
  renderSkeletons(3);

  const [artesano, media] = await Promise.all([
    fetchArtesano(slug),
    fetchMedia(slug),
  ]);

  if (!artesano) { renderError('Artesano no encontrado.'); return; }

  // Invalidar caché de traducción para que se reconstruya con los datos del artesano
  sessionStorage.removeItem('adt_t_' + location.pathname + location.search);

  renderHero(artesano);
  renderRRSS(artesano);
  renderGallery(media);
  renderMapa(artesano);
  setupCompartir(artesano);

  // Esperar a que la sección de navegación esté en el DOM antes de traducir
  await (desde === 'mapa' ? renderCercanos(artesano) : renderNavPrevNext(slug));

  if (window._adt_translate_el) {
    window._adt_translate_el(document.querySelector('.artisan-profile') || document.body);
  }
})();

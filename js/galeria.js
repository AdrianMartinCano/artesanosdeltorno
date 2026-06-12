// ── Lightbox ──────────────────────────────────────
const _lb      = document.getElementById('galeria-lightbox');
const _lbInner = document.getElementById('galeria-lightbox-inner');

function abrirLightbox(item) {
  const src = mediaUrl(item.url);
  _lbInner.innerHTML = item.tipo === 'VIDEO'
    ? `<video src="${src}" controls autoplay playsinline></video>`
    : `<img src="${src}" alt="">`;
  _lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarLightbox() {
  _lb.classList.remove('open');
  document.body.style.overflow = '';
  _lbInner.innerHTML = '';
}

document.getElementById('galeria-lightbox-close').addEventListener('click', cerrarLightbox);
_lb.addEventListener('click', e => { if (e.target === _lb) cerrarLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarLightbox(); });

// ── Render ────────────────────────────────────────
function renderBloque(artesano, media) {
  const src = mediaUrl(artesano.foto_perfil);

  const avatar = src
    ? `<div class="artesano-bloque-avatar"><img src="${src}" alt="${artesano.nombre}" onerror="this.parentElement.textContent='🪵'"></div>`
    : `<div class="artesano-bloque-avatar">🪵</div>`;

  const info = [artesano.especialidad, artesano.localidad].filter(Boolean).join(' · ');

  const items = media.map(item => {
    const s = mediaUrl(item.url);
    if (item.tipo === 'VIDEO') {
      return `<div class="galeria-item" data-idx="${media.indexOf(item)}">
        <video src="${s}" muted preload="metadata"></video>
        <span class="galeria-item__badge">vídeo</span>
        <div class="galeria-item__play">▶</div>
      </div>`;
    }
    return `<div class="galeria-item" data-idx="${media.indexOf(item)}">
      <img src="${s}" alt="" loading="lazy">
      <span class="galeria-item__badge">foto</span>
    </div>`;
  }).join('');

  const section = document.createElement('div');
  section.className = 'artesano-bloque';
  section.innerHTML = `
    <div class="artesano-bloque-header">
      ${avatar}
      <div class="artesano-bloque-info">
        <h2>${artesano.nombre}</h2>
        ${info ? `<p>${info}</p>` : ''}
      </div>
      <a class="artesano-bloque-link" href="artesano.html?slug=${artesano.slug}">Ver perfil →</a>
    </div>
    <div class="galeria-grid">${items}</div>`;

  // Eventos de click
  section.querySelectorAll('.galeria-item').forEach(el => {
    const idx = parseInt(el.dataset.idx, 10);
    el.addEventListener('click', () => abrirLightbox(media[idx]));
    // Hover en vídeo
    const vid = el.querySelector('video');
    if (vid) {
      el.addEventListener('mouseenter', () => vid.play().catch(() => {}));
      el.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
    }
  });

  return section;
}

// ── Carga ─────────────────────────────────────────
(async function init() {
  const page    = document.getElementById('galeria-page');
  const loading = document.getElementById('galeria-loading');

  loadAnuncio();

  try {
    const res = await fetch(`${API_BASE}/artesano`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error('Respuesta inesperada del servidor');

    if (!data.length) {
      loading.remove();
      page.innerHTML = '<p class="galeria-empty">No hay artesanos registrados aún.</p>';
      return;
    }

    // Pedir medios de todos en paralelo
    const medios = await Promise.all(
      data.map(a =>
        fetch(`${API_BASE}/artesano/${a.slug}/media`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    );

    loading.remove();

    let alguno = false;
    data.forEach((artesano, i) => {
      if (!medios[i] || !medios[i].length) return;
      alguno = true;
      page.appendChild(renderBloque(artesano, medios[i]));
    });

    if (!alguno) {
      page.innerHTML = '<p class="galeria-empty">Los artesanos aún no han subido fotos ni vídeos.</p>';
    }

  } catch (err) {
    loading.remove();
    page.innerHTML = `<p class="galeria-empty">Error al cargar la galería: ${err.message}</p>`;
  }
})();

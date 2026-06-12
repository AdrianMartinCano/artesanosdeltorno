const slug = new URLSearchParams(location.search).get('slug');
if (!slug) location.href = 'index.html';

let productoActual = null;
let cantidad = 1;

async function loadProducto() {
  const wrap = document.getElementById('producto-wrap');
  try {
    const res  = await fetch(`${API}/productos/${slug}`);
    if (!res.ok) { location.href = 'index.html'; return; }
    const p    = await res.json();
    productoActual = p;

    document.title = `${p.nombre} — Girando Madera`;
    const ogImg = p.fotos?.[0]?.url ? `https://girandomadera.artesanosdeltorno.es${p.fotos[0].url}` : 'https://girandomadera.artesanosdeltorno.es/og-image.png';
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val); };
    setMeta('meta[property="og:title"]',       `${p.nombre} — Girando Madera`);
    setMeta('meta[property="og:description"]', p.descripcion || 'Pieza de torneado artesanal única hecha a mano por Manuel Mateo.');
    setMeta('meta[property="og:image"]',       ogImg);
    setMeta('meta[name="description"]',        p.descripcion || 'Pieza de torneado artesanal única hecha a mano por Manuel Mateo.');
    const sinStock = p.stock === 0;

    const fotos = p.fotos || [];
    const fotoMain = fotos[0];

    const thumbsHtml = fotos.map((f, i) => `
      <div class="thumb ${i===0?'active':''}" onclick="cambiarMedia(${i})" data-idx="${i}">
        ${f.tipo === 'video'
          ? `<video src="${escapeHTML(f.url)}" muted preload="none"></video>`
          : `<img src="${escapeHTML(f.url)}" alt="${escapeHTML(p.nombre)}">`}
      </div>`).join('');

    wrap.innerHTML = `
      <nav style="font-size:.8rem;color:var(--muted);padding:1.5rem 0 0;display:flex;gap:.5rem;align-items:center">
        <a href="index.html" style="color:var(--walnut)">Tienda</a>
        <span>/</span>
        <span>${escapeHTML(p.nombre)}</span>
      </nav>
      <div class="producto-page">
        <div>
          <div class="producto-galeria__main" id="media-main" onclick="openLightbox(${fotos.findIndex(f=>f===fotoMain)||0})">
            ${fotoMain
              ? (fotoMain.tipo==='video'
                  ? `<video src="${escapeHTML(fotoMain.url)}" controls muted playsinline></video>`
                  : `<img src="${escapeHTML(fotoMain.url)}" alt="${escapeHTML(p.nombre)}">`)
              : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:5rem;opacity:.2">🪵</div>'}
          </div>
          ${fotos.length > 1 ? `<div class="producto-galeria__thumbs">${thumbsHtml}</div>` : ''}
        </div>

        <div class="producto-info">
          <span class="producto-info__label">Torneado artesanal · Manuel Mateo</span>
          <h1 class="producto-info__nombre">${escapeHTML(p.nombre)}</h1>
          <div class="producto-info__precio">${eur(p.precio)}</div>
          ${p.descripcion ? `<p class="producto-info__desc">${escapeHTML(p.descripcion).replace(/\n/g,'<br>')}</p>` : ''}

          <div class="producto-info__stock ${sinStock?'agotado':''}">
            ${sinStock ? '✗ Agotado' : (p.stock === 1 ? '✓ Última unidad' : `✓ ${p.stock} unidades disponibles`)}
          </div>

          ${!sinStock ? `
          <div class="cantidad-wrap">
            <button class="cantidad-btn" onclick="setCantidad(cantidad-1)">−</button>
            <span class="cantidad-num" id="cant-display">1</span>
            <button class="cantidad-btn" onclick="setCantidad(cantidad+1)">+</button>
          </div>` : ''}

          <div class="envio-info">
            <div><strong>Envío a España</strong></div>
            <div>Península: 6,95 € · Baleares: 8,95 €</div>
            <div>Gratis en pedidos superiores a 100 €</div>
          </div>

          ${sinStock
            ? `<button class="btn btn-secondary" disabled>Agotado</button>`
            : `<button class="btn btn-oak" style="font-size:1rem;padding:.85rem 2rem" id="btn-add" onclick="addToCart()">Añadir al carrito</button>
               <a href="carrito.html" class="btn btn-secondary" style="justify-content:center">Ver carrito</a>`}
        </div>
      </div>`;

  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Error al cargar</h3></div>`;
  }
}

function cambiarMedia(idx) {
  const fotos = productoActual?.fotos || [];
  const f = fotos[idx];
  if (!f) return;

  const main = document.getElementById('media-main');
  if (f.tipo === 'video') {
    main.innerHTML = `<video src="${escapeHTML(f.url)}" controls autoplay muted playsinline></video>`;
  } else {
    main.innerHTML = `<img src="${escapeHTML(f.url)}" alt="">`;
  }
  main.onclick = () => openLightbox(idx);

  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function setCantidad(n) {
  const max = productoActual?.stock || 1;
  cantidad = Math.max(1, Math.min(n, max));
  const el = document.getElementById('cant-display');
  if (el) el.textContent = cantidad;
}

function addToCart() {
  if (!productoActual) return;
  Carrito.add(productoActual, cantidad);
  const btn = document.getElementById('btn-add');
  if (btn) { btn.textContent = '✓ Añadido'; btn.disabled = true; setTimeout(() => { btn.textContent = 'Añadir al carrito'; btn.disabled = false; }, 1500); }
}

function openLightbox(idx) {
  const fotos = productoActual?.fotos || [];
  const f = fotos[idx];
  if (!f) return;
  const lb = document.getElementById('lightbox');
  const ct = document.getElementById('lightbox-content');
  ct.innerHTML = f.tipo === 'video'
    ? `<video src="${escapeHTML(f.url)}" controls autoplay style="max-width:90vw;max-height:90vh"></video>`
    : `<img src="${escapeHTML(f.url)}" style="max-width:90vw;max-height:90vh;object-fit:contain">`;
  lb.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const lb    = document.getElementById('lightbox');
  const close = document.getElementById('lightbox-close');
  close?.addEventListener('click', () => lb.classList.remove('open'));
  lb?.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lb?.classList.remove('open'); });
});

loadProducto();

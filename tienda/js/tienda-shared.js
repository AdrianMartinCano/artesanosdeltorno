// ── Google Analytics ─────────────────────────────────────────────────────────
(function(){
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-QHV6SX28WJ';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QHV6SX28WJ');
})();

const API = 'https://girandomadera.artesanosdeltorno.es/api';

// ── Carrito (localStorage) ────────────────────────────────────────────────────

const Carrito = {
  get() {
    try { return JSON.parse(localStorage.getItem('gm_carrito') || '[]'); } catch { return []; }
  },
  save(items) {
    localStorage.setItem('gm_carrito', JSON.stringify(items));
    Carrito.updateUI();
  },
  add(producto, cantidad = 1) {
    const items = Carrito.get();
    const idx   = items.findIndex(i => i.id === producto.id);
    if (idx >= 0) {
      items[idx].cantidad = Math.min(items[idx].cantidad + cantidad, producto.stock);
    } else {
      items.push({ id: producto.id, slug: producto.slug, nombre: producto.nombre, precio: producto.precio, stock: producto.stock, foto: producto.fotos?.[0]?.url || null, cantidad });
    }
    Carrito.save(items);
  },
  remove(id) {
    Carrito.save(Carrito.get().filter(i => i.id !== id));
  },
  setQty(id, qty) {
    const items = Carrito.get().map(i => i.id === id ? { ...i, cantidad: Math.max(1, Math.min(qty, i.stock)) } : i);
    Carrito.save(items);
  },
  clear() { Carrito.save([]); },
  count() { return Carrito.get().reduce((s, i) => s + i.cantidad, 0); },
  subtotal() { return Carrito.get().reduce((s, i) => s + i.precio * i.cantidad, 0); },
  updateUI() {
    const n   = Carrito.count();
    const btn = document.getElementById('cart-count');
    if (!btn) return;
    btn.textContent = n;
    btn.classList.toggle('visible', n > 0);
  },
};

// ── Envío ─────────────────────────────────────────────────────────────────────

let _zonas = null;
async function getZonas() {
  if (_zonas) return _zonas;
  const res = await fetch(`${API}/zonas-envio`);
  _zonas = await res.json();
  return _zonas;
}

async function calcularEnvio(zona, subtotal) {
  const zonas = await getZonas();
  const z = zonas.find(zz => zz.codigo === zona);
  if (!z) return 6.95;
  if (z.gratisDesde !== null && subtotal >= z.gratisDesde) return 0;
  return z.precio;
}

// ── Formateo ──────────────────────────────────────────────────────────────────

function eur(n) { return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }); }
function escapeHTML(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Banner de cookies ─────────────────────────────
(function () {
  if (localStorage.getItem('gm_cookies_ok')) return;
  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Aviso de cookies');
  banner.innerHTML = `
    <div class="cookie-banner__icon">🪵</div>
    <div class="cookie-banner__text">
      <strong>Antes de empezar a tornear…</strong>
      <p>Usamos cookies técnicas imprescindibles para que el torno gire sin problemas. Sin rastreos ni publicidad — solo lo necesario.</p>
    </div>
    <div class="cookie-banner__actions">
      <a class="cookie-banner__link" href="cookies.html">Saber más</a>
      <button class="cookie-banner__btn" id="gm-cookie-accept">Entendido, ¡a tornear!</button>
    </div>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));
  document.getElementById('gm-cookie-accept').addEventListener('click', () => {
    localStorage.setItem('gm_cookies_ok', '1');
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 500);
  });
})();

// ── Init compartido ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Carrito.updateUI();

  // Sombra en header al hacer scroll
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(74,50,33,.1)' : 'none';
    }, { passive: true });
  }

  // ── Hamburger móvil ──────────────────────────────
  const inner = document.querySelector('.header__inner');
  if (inner) {
    // Botón hamburguesa
    const btn = document.createElement('button');
    btn.className = 'gm-hamburger';
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.innerHTML = '<span></span><span></span><span></span>';
    inner.appendChild(btn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'gm-mobile-overlay';
    document.body.appendChild(overlay);

    // Panel lateral
    const nav = document.createElement('nav');
    nav.className = 'gm-mobile-nav';
    nav.setAttribute('aria-label', 'Menú móvil');
    // Detectar página actual para el link de carrito
    const isCarrito = location.pathname.endsWith('carrito.html');
    nav.innerHTML = `
      <div class="gm-mobile-nav__head">
        <div class="logo-text">Girando Madera<span>por Manuel Mateo · AdT</span></div>
        <button class="gm-mobile-nav__close" aria-label="Cerrar menú">✕</button>
      </div>
      <div class="gm-mobile-nav__links">
        <a class="gm-mobile-nav__link" href="index.html">Tienda</a>
        <a class="gm-mobile-nav__link" href="https://artesanosdeltorno.es">Asociación</a>
        <a class="gm-mobile-nav__link gm-mobile-nav__link--cart" href="carrito.html">🛒 Carrito</a>
      </div>`;
    document.body.appendChild(nav);

    const openMenu  = () => { btn.classList.add('open'); overlay.classList.add('open'); nav.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const closeMenu = () => { btn.classList.remove('open'); overlay.classList.remove('open'); nav.classList.remove('open'); document.body.style.overflow = ''; };

    btn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    nav.querySelector('.gm-mobile-nav__close').addEventListener('click', closeMenu);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }
});

// -- Service Worker (evita cache obsoleta en movil) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// -- Google Analytics ---
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

const API_BASE = 'https://admin.artesanosdeltorno.es/api';

// Convierte URLs relativas de medios (/api/media/...) a absolutas con el origen de la API
function mediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return new URL(API_BASE).origin + url;
}

// -- Header shadow ---
const _header = document.getElementById('header');
if (_header) {
  window.addEventListener('scroll', () => {
    _header.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(74,50,33,.1)' : 'none';
  }, { passive: true });
}

// -- Mobile nav ---
const _mobileNav     = document.getElementById('mobile-nav');
const _mobileOverlay = document.getElementById('mobile-nav-overlay');
const _btnHamburger  = document.getElementById('btn-hamburger');
const _btnClose      = document.getElementById('mobile-nav-close');

if (_mobileNav && _mobileOverlay && _btnHamburger) {
  const openNav  = () => {
    _mobileNav.classList.add('open');
    _mobileOverlay.classList.add('open');
    _mobileNav.setAttribute('aria-hidden', 'false');
    _btnHamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeNav = () => {
    _mobileNav.classList.remove('open');
    _mobileOverlay.classList.remove('open');
    _mobileNav.setAttribute('aria-hidden', 'true');
    _btnHamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  _btnHamburger.addEventListener('click', openNav);
  if (_btnClose) _btnClose.addEventListener('click', closeNav);
  _mobileOverlay.addEventListener('click', closeNav);
  _mobileNav.querySelectorAll('.mobile-nav__link').forEach(l => l.addEventListener('click', closeNav));
}

// -- Smooth scroll ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});

// -- Anuncio ---
async function loadAnuncio() {
  const bar   = document.getElementById('announcement-bar');
  const texto = document.getElementById('announcement-text');
  const link  = document.getElementById('announcement-link');
  if (!bar) return;

  try {
    const res = await fetch(`${API_BASE}/config/anuncio`);
    if (res.ok) {
      const { texto: msg } = await res.json();
      if (msg && msg.trim()) {
        texto.textContent  = '✦ ' + msg;
        link.style.display = 'none';
        bar.style.display  = '';
        return;
      }
    }
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/eventos/futuros`);
    if (res.ok) {
      const eventos = await res.json();
      if (eventos.length > 0) {
        const ev     = eventos[0];
        const inicio = formatFecha(ev.fechaInicio);
        const fin    = formatFecha(ev.fechaFin);
        texto.textContent  = `✦ Próximo Evento: ${inicio} — ${fin} · ${ev.localidad} (${ev.provincia})`;
        link.style.display = '';
        bar.style.display  = '';
        return;
      }
    }
  } catch {}

  bar.style.display = 'none';
}

// -- Titulo animado ---
let _titleTimer = null;

function startTitleAnimation(base) {
  if (_titleTimer) clearInterval(_titleTimer);
  const text = base + '   ·   ';
  let i = 0;
  document.title = base;
  _titleTimer = setInterval(() => {
    document.title = text.slice(i) + text.slice(0, i);
    i = (i + 1) % text.length;
  }, 180);
}

// -- Datos estructurados de eventos (Schema.org) ---
function injectEventStructuredData(eventos) {
  const existing = document.getElementById('ld-json-eventos');
  if (existing) existing.remove();
  if (!eventos || !eventos.length) return;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const futuros = eventos.filter(ev => new Date(ev.fechaFin) >= hoy);
  if (!futuros.length) return;

  const items = futuros.map(ev => ({
    '@type': 'Event',
    name: ev.titulo || `Evento en ${ev.localidad}`,
    startDate: ev.fechaInicio,
    endDate: ev.fechaFin,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: `${ev.localidad}, ${ev.provincia}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: ev.localidad,
        addressRegion: ev.provincia,
        addressCountry: ev.pais || 'ES',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Artesanos del Torno',
      url: 'https://artesanosdeltorno.es',
    },
    performer: {
      '@type': 'Organization',
      name: 'Artesanos del Torno',
      url: 'https://artesanosdeltorno.es',
    },
    ...(ev.descripcion ? { description: ev.descripcion } : {}),
    ...(ev.urlImagen   ? { image: ev.urlImagen }          : {}),
    ...(ev.urlExterna  ? { url: ev.urlExterna }            : {}),
  }));

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id   = 'ld-json-eventos';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': items,
  });
  document.head.appendChild(script);
}

// -- Utilidades ---
function formatFecha(fecha) {
  let d;
  if (Array.isArray(fecha)) {
    d = new Date(fecha[0], fecha[1] - 1, fecha[2]);
  } else {
    const [y, m, day] = String(fecha).split('-');
    d = new Date(y, m - 1, day);
  }
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// -- Language Toggle (traduccion directa sin widget GT) ---
(function () {
  const KEY = 'adt_lang';
  const SEP = '◄'; // separador que Google no traduce

  // Boton ES | EN
  const btn = document.createElement('button');
  btn.id = 'lang-toggle';
  btn.className = 'lang-toggle notranslate';
  btn.setAttribute('translate', 'no');
  btn.setAttribute('aria-label', 'Cambiar idioma / Switch language');
  _setLabel(btn);
  btn.addEventListener('click', _toggle);

  const actions = document.querySelector('.header__actions');
  if (actions) actions.insertBefore(btn, actions.firstChild);

  // Auto-traducir si el idioma guardado es EN
  if (localStorage.getItem(KEY) === 'en') {
    _translatePage();
  }

  async function _toggle() {
    if (localStorage.getItem(KEY) !== 'en') {
      localStorage.setItem(KEY, 'en');
      btn.disabled = true;
      btn.style.opacity = '0.5';
      _setLabel(btn);
      await _translatePage();
      btn.disabled = false;
      btn.style.opacity = '';
    } else {
      localStorage.removeItem(KEY);
      window.location.href = window.location.href.split('#')[0];
    }
  }

  async function _translatePage() {
    const cacheKey = 'adt_t_' + location.pathname + location.search;
    const nodes = _getTextNodes();
    if (!nodes.length) return;

    // Aplicar desde cache si existe
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      JSON.parse(cached).forEach(function (item) {
        if (nodes[item[0]]) nodes[item[0]].textContent = item[1];
      });
      return;
    }

    // Construir batches (max 1400 chars por peticion para no exceder limites de URL)
    var batches = [], batch = [], bLen = 0;
    var originals = nodes.map(function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); });

    originals.forEach(function (text, i) {
      if (bLen + text.length > 1400 && batch.length) {
        batches.push(batch);
        batch = []; bLen = 0;
      }
      batch.push(i);
      bLen += text.length + SEP.length + 2;
    });
    if (batch.length) batches.push(batch);

    var cache = [];
    for (var b = 0; b < batches.length; b++) {
      var indices = batches[b];
      var combined = indices.map(function (i) { return originals[i]; }).join('\n' + SEP + '\n');
      try {
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q='
          + encodeURIComponent(combined);
        var res = await fetch(url);
        if (!res.ok) continue;
        var data = await res.json();
        var full = data[0].map(function (x) { return x[0]; }).join('');
        var parts = full.split(SEP).map(function (s) { return s.trim(); });
        indices.forEach(function (nodeIdx, j) {
          var t = parts[j];
          if (t && t !== originals[nodeIdx]) {
            nodes[nodeIdx].textContent = t;
            cache.push([nodeIdx, t]);
          }
        });
      } catch (e) {}
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(cache));
  }

  function _getTextNodes(root) {
    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };
    var result = [];
    var walk = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        var p = node.parentElement;
        if (!p || skip[p.tagName]) return NodeFilter.FILTER_REJECT;
        if (p.closest('[translate="no"],.notranslate')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walk.nextNode()) result.push(walk.currentNode);
    return result;
  }

  // Traducir un elemento concreto (para contenido dinamico cargado via API)
  async function _translateElement(el) {
    if (localStorage.getItem(KEY) !== 'en' || !el) return;
    var nodes = _getTextNodes(el);
    if (!nodes.length) return;
    var originals = nodes.map(function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); });
    var batches = [], batch = [], bLen = 0;
    originals.forEach(function (text, i) {
      if (bLen + text.length > 1400 && batch.length) { batches.push(batch); batch = []; bLen = 0; }
      batch.push(i);
      bLen += text.length + SEP.length + 2;
    });
    if (batch.length) batches.push(batch);
    for (var b = 0; b < batches.length; b++) {
      var indices = batches[b];
      var combined = indices.map(function (i) { return originals[i]; }).join('\n' + SEP + '\n');
      try {
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q='
          + encodeURIComponent(combined);
        var res = await fetch(url);
        if (!res.ok) continue;
        var data = await res.json();
        var full = data[0].map(function (x) { return x[0]; }).join('');
        var parts = full.split(SEP).map(function (s) { return s.trim(); });
        indices.forEach(function (nodeIdx, j) {
          if (parts[j] && parts[j] !== originals[nodeIdx]) nodes[nodeIdx].textContent = parts[j];
        });
      } catch (e) {}
    }
  }

  // Exponer para main.js y otros scripts
  window._adt_translate_el = _translateElement;
  window._adt_lang_key = KEY;

  function _setLabel(b) {
    var en = localStorage.getItem(KEY) === 'en';
    b.innerHTML = en
      ? 'ES <span class="lang-sep" aria-hidden="true">|</span> <span class="lang-cur">EN</span>'
      : '<span class="lang-cur">ES</span> <span class="lang-sep" aria-hidden="true">|</span> EN';
  }
}());

// -- Banner de cookies ---
(function () {
  if (localStorage.getItem('adt_cookies_ok')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Aviso de cookies');
  banner.innerHTML = `
    <div class="cookie-banner__icon">🪵</div>
    <div class="cookie-banner__text">
      <strong>Antes de empezar a tornear…</strong>
      <p>Usamos unas pequeñas virutas digitales (cookies técnicas) para que el torno gire sin problemas. Sin rastreos ni publicidad — solo lo imprescindible.</p>
    </div>
    <div class="cookie-banner__actions">
      <a class="cookie-banner__link" href="cookies.html">Saber más</a>
      <button class="cookie-banner__btn" id="cookie-accept">Entendido, ¡a tornear!</button>
    </div>
  `;
  document.body.appendChild(banner);

  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem('adt_cookies_ok', '1');
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 500);
  });
})();
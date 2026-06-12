let zonaActual = 'peninsula';
let envioActual = 6.95;

async function renderCarrito() {
  const page  = document.getElementById('carrito-page');
  const items = Carrito.get();

  if (items.length === 0) {
    page.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">🛒</div>
      <h3>Tu carrito está vacío</h3>
      <p>Aún no has añadido ninguna pieza. Vuelve a la tienda y elige la que más te guste.</p>
      <a href="index.html" class="btn btn-primary" style="margin-top:1.5rem">Ver productos</a>
    </div>`;
    return;
  }

  const subtotal = Carrito.subtotal();
  envioActual = await calcularEnvio(zonaActual, subtotal);
  const total = subtotal + envioActual;

  const itemsHtml = items.map(item => `
    <div class="carrito-item" id="item-${item.id}">
      <a href="producto.html?slug=${escapeHTML(item.slug)}" class="carrito-item__img">
        ${item.foto ? `<img src="${escapeHTML(item.foto)}" alt="${escapeHTML(item.nombre)}">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;opacity:.3">🪵</div>'}
      </a>
      <div class="carrito-item__info">
        <div class="carrito-item__nombre">${escapeHTML(item.nombre)}</div>
        <div class="carrito-item__precio">${eur(item.precio)} · unidad</div>
        <div class="carrito-item__actions">
          <button class="cantidad-btn" onclick="cambiarQty(${item.id}, ${item.cantidad - 1})">−</button>
          <span class="cantidad-num">${item.cantidad}</span>
          <button class="cantidad-btn" onclick="cambiarQty(${item.id}, ${item.cantidad + 1})">+</button>
          <button class="carrito-item__remove" onclick="quitarItem(${item.id})">Eliminar</button>
        </div>
      </div>
      <div style="font-weight:700;font-size:1rem;color:#7b5b3a;flex-shrink:0">${eur(item.precio * item.cantidad)}</div>
    </div>`).join('');

  const zonaHtml = `
    <div class="resumen-zona">
      <label for="zona-select" style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#7a6652;display:block;margin-bottom:.4rem">Zona de envío</label>
      <select id="zona-select" onchange="cambiarZona(this.value)">
        <option value="peninsula" ${zonaActual==='peninsula'?'selected':''}>Península (6,95 €)</option>
        <option value="baleares"  ${zonaActual==='baleares' ?'selected':''}>Baleares (8,95 €)</option>
      </select>
    </div>`;

  const envioTexto = envioActual === 0 ? '🎉 Gratis' : eur(envioActual);

  page.innerHTML = `
    <div class="carrito-items">${itemsHtml}</div>
    <div class="carrito-resumen">
      <h3>Resumen del pedido</h3>
      <div class="resumen-linea"><span>Subtotal</span><span>${eur(subtotal)}</span></div>
      ${zonaHtml}
      <div class="resumen-linea"><span>Envío</span><span>${envioTexto}</span></div>
      <div class="resumen-linea total"><span>Total</span><span>${eur(total)}</span></div>
      <button class="btn btn-oak" style="width:100%;margin-top:1.25rem;font-size:1rem;padding:.85rem" onclick="mostrarFormulario()">
        Continuar con el pedido →
      </button>
      <a href="index.html" class="btn btn-secondary" style="width:100%;margin-top:.5rem;justify-content:center">← Seguir comprando</a>
    </div>`;
}

function cambiarQty(id, qty) {
  if (qty < 1) { quitarItem(id); return; }
  const item = Carrito.get().find(i => i.id === id);
  if (item && qty > item.stock) return;
  Carrito.setQty(id, qty);
  renderCarrito();
}

function quitarItem(id) {
  Carrito.remove(id);
  renderCarrito();
}

async function cambiarZona(zona) {
  zonaActual = zona;
  await renderCarrito();
}

function mostrarFormulario() {
  const page  = document.getElementById('carrito-page');
  const items = Carrito.get();
  const subtotal = Carrito.subtotal();
  const total = subtotal + envioActual;

  page.innerHTML = `
    <div style="grid-column:1/-1;max-width:640px">
      <h2 style="font-family:'Playfair Display',serif;font-size:1.3rem;color:#2d1f14;margin-bottom:1.5rem">Datos de envío</h2>
      <form class="checkout-form" id="checkout-form" onsubmit="procesarPedido(event)">
        <div class="form-row">
          <div class="form-group">
            <label>Nombre completo *</label>
            <input type="text" id="cf-nombre" required placeholder="Manuel García">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" id="cf-email" required placeholder="tu@email.com">
          </div>
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="tel" id="cf-telefono" placeholder="600 000 000">
        </div>
        <div class="form-group">
          <label>Dirección *</label>
          <input type="text" id="cf-direccion" required placeholder="Calle Mayor 10, 2ºA">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ciudad *</label>
            <input type="text" id="cf-ciudad" required placeholder="Madrid">
          </div>
          <div class="form-group">
            <label>Código postal *</label>
            <input type="text" id="cf-cp" required placeholder="28001" maxlength="5">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Provincia</label>
            <input type="text" id="cf-provincia" placeholder="Madrid">
          </div>
          <div class="form-group">
            <label>Zona de envío *</label>
            <select id="cf-zona">
              <option value="peninsula" ${zonaActual==='peninsula'?'selected':''}>Península (6,95 €)</option>
              <option value="baleares"  ${zonaActual==='baleares' ?'selected':''}>Baleares (8,95 €)</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Notas del pedido</label>
          <textarea id="cf-notas" placeholder="Instrucciones especiales, regalo..."></textarea>
        </div>

        <div style="background:#f4ede6;border-radius:10px;padding:1rem 1.25rem;font-size:.9rem;color:#4a3221">
          <div style="display:flex;justify-content:space-between;margin-bottom:.35rem"><span>Subtotal</span><span>${eur(subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.35rem"><span>Envío</span><span id="envio-form">${envioActual===0?'Gratis':eur(envioActual)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #e0d5cc;padding-top:.5rem;margin-top:.35rem"><span>Total</span><span id="total-form">${eur(total)}</span></div>
        </div>

        <label style="display:flex;align-items:flex-start;gap:.6rem;font-size:.85rem;color:#4a3221;cursor:pointer;line-height:1.55">
          <input type="checkbox" id="cf-terminos" required style="margin-top:.2rem;flex-shrink:0">
          He leído y acepto la <a href="devoluciones.html" target="_blank" style="color:#8b5e3c">política de devoluciones</a> y la <a href="privacidad.html" target="_blank" style="color:#8b5e3c">política de privacidad</a>.
        </label>

        <div id="checkout-status" style="font-size:.88rem;font-weight:600;min-height:1.2em;color:#c0392b"></div>

        <button type="submit" class="btn btn-oak" style="font-size:1rem;padding:.85rem 2rem" id="btn-checkout">
          🔒 Pagar con Stripe
        </button>
        <button type="button" class="btn btn-secondary" onclick="renderCarrito()">← Volver al carrito</button>
      </form>
    </div>`;

  document.getElementById('cf-zona').addEventListener('change', async function() {
    zonaActual  = this.value;
    const sub   = Carrito.subtotal();
    envioActual = await calcularEnvio(zonaActual, sub);
    const tot   = sub + envioActual;
    document.getElementById('envio-form').textContent = envioActual === 0 ? 'Gratis' : eur(envioActual);
    document.getElementById('total-form').textContent = eur(tot);
  });
}

async function procesarPedido(e) {
  e.preventDefault();
  const btn    = document.getElementById('btn-checkout');
  const status = document.getElementById('checkout-status');
  btn.disabled = true;
  btn.textContent = 'Redirigiendo a Stripe…';
  status.textContent = '';

  const zonaForm  = document.getElementById('cf-zona').value;
  const sub       = Carrito.subtotal();
  const envio     = await calcularEnvio(zonaForm, sub);

  const payload = {
    nombre:      document.getElementById('cf-nombre').value.trim(),
    email:       document.getElementById('cf-email').value.trim(),
    telefono:    document.getElementById('cf-telefono').value.trim(),
    direccion:   document.getElementById('cf-direccion').value.trim(),
    ciudad:      document.getElementById('cf-ciudad').value.trim(),
    codigoPostal:document.getElementById('cf-cp').value.trim(),
    provincia:   document.getElementById('cf-provincia').value.trim(),
    zona:        zonaForm,
    notas:       document.getElementById('cf-notas').value.trim(),
    items:       Carrito.get().map(i => ({ id: i.id, cantidad: i.cantidad })),
  };

  try {
    const res  = await fetch(`${API}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      Carrito.clear();
      location.href = data.url;
    } else {
      status.textContent = data.error || 'Error al procesar el pedido. Inténtalo de nuevo.';
      btn.disabled = false;
      btn.textContent = '🔒 Pagar con Stripe';
    }
  } catch {
    status.textContent = 'Error de conexión. Inténtalo de nuevo.';
    btn.disabled = false;
    btn.textContent = '🔒 Pagar con Stripe';
  }
}

renderCarrito();

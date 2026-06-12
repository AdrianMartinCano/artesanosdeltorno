async function loadProductos() {
  const grid = document.getElementById('productos-grid');
  try {
    const res  = await fetch(`${API}/productos`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🪵</div>
        <h3>Próximamente</h3>
        <p>Estamos preparando las primeras piezas. Vuelve pronto.</p>
      </div>`;
      return;
    }

    grid.innerHTML = data.map(p => {
      const foto     = p.fotos?.[0]?.url || null;
      const sinStock = p.stock === 0;
      return `
        <article class="producto-card">
          <a href="producto.html?slug=${escapeHTML(p.slug)}" class="producto-card__img">
            ${foto ? `<img src="${escapeHTML(foto)}" alt="${escapeHTML(p.nombre)}" loading="lazy">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;opacity:.3">🪵</div>'}
            ${p.destacado ? '<span class="producto-card__badge">Destacado</span>' : ''}
            ${sinStock    ? '<div class="sin-stock-badge">Agotado</div>' : ''}
          </a>
          <div class="producto-card__body">
            <h3 class="producto-card__nombre">${escapeHTML(p.nombre)}</h3>
            <div class="producto-card__precio">${eur(p.precio)}</div>
          </div>
          <div class="producto-card__footer">
            ${sinStock
              ? `<button class="btn btn-secondary" style="width:100%" disabled>Agotado</button>`
              : `<button class="btn btn-primary" style="width:100%" onclick="addToCart(${JSON.stringify(p).replace(/"/g,'&quot;')})">Añadir al carrito</button>`
            }
          </div>
        </article>`;
    }).join('');
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="icon">⚠️</div>
      <h3>Error al cargar</h3>
      <p>No se pudieron cargar los productos. Inténtalo de nuevo.</p>
    </div>`;
  }
}

function addToCart(producto) {
  Carrito.add(producto, 1);
  // Feedback visual
  const btn = event.currentTarget;
  const orig = btn.textContent;
  btn.textContent = '✓ Añadido';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1200);
}

loadProductos();

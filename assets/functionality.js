(function () {
  const CART_KEY = 'nexa-original-cart';
  const pages = [
    ['All Products', 'product.html'], ['Gaming Keyboards', 'keyboard.html'],
    ['Gaming Mice', 'mouse.html'], ['Gaming Headsets', 'headphones.html'],
    ['Gaming Chairs', 'gamingchair.html']
  ];
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; } };
  const writeCart = cart => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateBadge(); };
  const money = value => `$${Number(value || 0).toFixed(2).replace('.00', '')}`;
  const productFromCard = card => ({
    id: `${location.pathname.split('/').pop() || 'index.html'}-${card.querySelector('h5')?.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: card.querySelector('h5')?.textContent.trim() || 'Gaming Product',
    price: Number((card.querySelector('.new-price')?.textContent || '0').replace(/[^0-9.]/g, '')),
    image: card.querySelector('img')?.src || '', quantity: 1
  });
  function updateBadge() {
    const count = readCart().reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll('.nexa-cart-count').forEach(node => node.textContent = count);
  }
  function installCartLink() {
    const searchForm = document.querySelector('.navbar form.d-flex');
    if (!searchForm || document.querySelector('.nexa-cart-link')) return;
    const link = document.createElement('a');
    link.href = './cart.html'; link.className = 'btn btn-outline-info rounded-pill nexa-cart-link ms-2';
    link.innerHTML = '<i class="fas fa-cart-shopping"></i><span class="d-none d-xl-inline ms-2">Cart</span><b class="nexa-cart-count ms-2">0</b>';
    searchForm.after(link); updateBadge();
  }
  function toast(message) {
    let node = document.querySelector('.nexa-toast');
    if (!node) { node = document.createElement('div'); node.className = 'nexa-toast'; document.body.appendChild(node); }
    node.textContent = message; node.classList.add('show'); clearTimeout(node.timer);
    node.timer = setTimeout(() => node.classList.remove('show'), 1800);
  }
  function installCartButtons() {
    document.querySelectorAll('.product-card').forEach(card => {
      const button = card.querySelector('.cart-btn'); if (!button || button.dataset.ready) return;
      button.dataset.ready = 'true'; button.type = 'button';
      button.addEventListener('click', () => {
        const product = productFromCard(card); const cart = readCart(); const found = cart.find(item => item.id === product.id);
        found ? found.quantity++ : cart.push(product); writeCart(cart); toast(`${product.name} added to cart`);
      });
    });
  }
  async function buildSearchIndex() {
    const results = [];
    await Promise.all(pages.map(async ([category, url]) => {
      try {
        const html = await fetch(`./${url}`).then(response => response.text()); const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('.product-card').forEach(card => {
          const name = card.querySelector('h5')?.textContent.trim(); if (!name) return;
          results.push({ name, category, url: `./${url}?q=${encodeURIComponent(name)}`, price: card.querySelector('.new-price')?.textContent.trim() || '', image: card.querySelector('img')?.getAttribute('src') || '' });
        });
      } catch {}
    }));
    return results.filter((item, index, list) => list.findIndex(other => other.name === item.name) === index);
  }
  async function installSearch() {
    const input = document.querySelector('input[placeholder="Search Products"]'); if (!input) return;
    const form = input.closest('form'); form.classList.add('nexa-search'); input.setAttribute('aria-label', 'Search products');
    const panel = document.createElement('div'); panel.className = 'nexa-suggestions'; form.appendChild(panel);
    let catalogue;
    const show = async () => {
      const query = input.value.trim().toLowerCase(); if (query.length < 2) { panel.classList.remove('open'); return; }
      catalogue ||= await buildSearchIndex(); const exactMatches = catalogue.filter(item => `${item.name} ${item.category}`.toLowerCase().includes(query));
      const matches = (exactMatches.length ? exactMatches : catalogue).slice(0, 6);
      panel.innerHTML = `${exactMatches.length ? '' : '<p class="nexa-suggestion-label">No exact match — popular products</p>'}${matches.map(item => `<a href="${item.url}"><img src="${item.image}" alt=""><span><strong>${item.name}</strong><small>${item.category} · ${item.price}</small></span></a>`).join('')}`;
      panel.classList.add('open');
    };
    input.addEventListener('input', show); input.addEventListener('focus', show);
    document.addEventListener('click', event => { if (!form.contains(event.target)) panel.classList.remove('open'); });
    form.addEventListener('submit', event => { event.preventDefault(); const query = input.value.trim(); if (query) location.href = `./product.html?q=${encodeURIComponent(query)}`; });
  }
  function installFilters() {
    const section = document.querySelector('.products-section .container'); const row = section?.querySelector('.row.g-4');
    if (!section || !row || !row.querySelector('.product-card')) return;
    const tools = document.createElement('div'); tools.className = 'nexa-tools';
    tools.innerHTML = `<label>Category<select class="nexa-category">${pages.map(([name,url]) => `<option value="${url}">${name}</option>`).join('')}</select></label><label>Maximum price<select class="nexa-price"><option value="999999">All prices</option><option value="75">Under $75</option><option value="100">Under $100</option><option value="150">Under $150</option><option value="300">Under $300</option></select></label><label>Sort by<select class="nexa-sort"><option value="default">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Product name</option></select></label><button class="btn btn-outline-info nexa-clear">Clear</button>`;
    row.before(tools);
    const current = location.pathname.split('/').pop() || 'index.html'; const category = tools.querySelector('.nexa-category'); if ([...category.options].some(o => o.value === current)) category.value = current;
    const cards = [...row.children].filter(column => column.querySelector('.product-card')); const original = [...cards];
    const apply = () => {
      const max = Number(tools.querySelector('.nexa-price').value); const sort = tools.querySelector('.nexa-sort').value; const query = new URLSearchParams(location.search).get('q')?.toLowerCase().trim() || '';
      cards.forEach(column => { const product = productFromCard(column.querySelector('.product-card')); column.hidden = product.price > max || (query && !product.name.toLowerCase().includes(query)); });
      const ordered = [...cards].sort((a,b) => { const pa=productFromCard(a.querySelector('.product-card')), pb=productFromCard(b.querySelector('.product-card')); if(sort==='low')return pa.price-pb.price;if(sort==='high')return pb.price-pa.price;if(sort==='name')return pa.name.localeCompare(pb.name);return original.indexOf(a)-original.indexOf(b); });
      ordered.forEach(card => row.appendChild(card));
    };
    tools.querySelector('.nexa-category').addEventListener('change', event => { if (event.target.value !== current) location.href = `./${event.target.value}`; });
    tools.querySelector('.nexa-price').addEventListener('change', apply); tools.querySelector('.nexa-sort').addEventListener('change', apply);
    tools.querySelector('.nexa-clear').addEventListener('click', () => { tools.querySelector('.nexa-price').value='999999'; tools.querySelector('.nexa-sort').value='default'; history.replaceState({},'',location.pathname); cards.forEach(card=>card.hidden=false); apply(); }); apply();
  }
  function renderCart() {
    const root = document.querySelector('#nexa-cart-page'); if (!root) return;
    const cart = readCart();
    if (!cart.length) { root.innerHTML = '<div class="nexa-empty"><i class="fas fa-cart-shopping"></i><h2>Your Cart Is Empty</h2><p>Add some gaming gear and come back here.</p><a class="btn btn-info rounded-pill px-4" href="./product.html">Shop Products</a></div>'; return; }
    const total = cart.reduce((sum,item)=>sum+item.price*item.quantity,0);
    root.innerHTML = `<div class="nexa-cart-items">${cart.map(item=>`<article data-id="${item.id}"><img src="${item.image}" alt="${item.name}"><div><h4>${item.name}</h4><strong>${money(item.price)}</strong><button class="nexa-remove">Remove</button></div><label>Quantity<select>${[1,2,3,4,5,6,7,8,9,10].map(q=>`<option ${q===item.quantity?'selected':''}>${q}</option>`).join('')}</select></label><b>${money(item.price*item.quantity)}</b></article>`).join('')}</div><aside><h3>Order Summary</h3><p><span>Subtotal</span><b>${money(total)}</b></p><p><span>Delivery</span><b>Free</b></p><hr><p class="fs-5"><span>Total</span><b>${money(total)}</b></p><button class="btn btn-info w-100 rounded-pill fw-bold">Proceed To Checkout</button></aside>`;
    root.querySelectorAll('article').forEach(article => { const id=article.dataset.id; article.querySelector('select').addEventListener('change',e=>{const c=readCart();c.find(i=>i.id===id).quantity=Number(e.target.value);writeCart(c);renderCart();}); article.querySelector('.nexa-remove').addEventListener('click',()=>{writeCart(readCart().filter(i=>i.id!==id));renderCart();}); });
  }
  document.addEventListener('DOMContentLoaded', () => { installCartLink(); installCartButtons(); installSearch(); installFilters(); renderCart(); updateBadge(); });
})();

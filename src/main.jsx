import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { products, searchProducts } from './data/products';
import { Cart, Checkout, Content } from './store-pages';
import './styles.css';

const Store = createContext();
const money = value => `INR ${new Intl.NumberFormat('en-IN').format(value)}`;
const asset = path => `${import.meta.env.BASE_URL}assets/${path}`;

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function Provider({ children }) {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('nexa-cart') || '[]'));
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem('nexa-wishlist') || '[]'));
  const [toast, setToast] = useState('');
  useEffect(() => localStorage.setItem('nexa-cart', JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem('nexa-wishlist', JSON.stringify(wishlist)), [wishlist]);
  const notify = message => { setToast(message); window.setTimeout(() => setToast(''), 1800); };
  const add = id => {
    setCart(current => {
      const found = current.find(item => item.id === id);
      return found ? current.map(item => item.id === id ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item) : [...current, { id, quantity: 1 }];
    });
    notify('Product added to cart');
  };
  const value = {
    cart, wishlist, add,
    remove: id => setCart(current => current.filter(item => item.id !== id)),
    quantity: (id, quantity) => setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(10, quantity)) } : item)),
    toggleWish: id => setWishlist(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
    clear: () => setCart([])
  };
  return <Store.Provider value={value}>{children}{toast && <div className="toast">{toast}</div>}</Store.Provider>;
}
const useStore = () => useContext(Store);

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>;
}

function CartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>;
}

function Header() {
  const { cart } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = useMemo(() => query.trim().length > 1 ? searchProducts(query, products).slice(0, 6) : [], [query]);
  const submit = event => { event.preventDefault(); navigate(`/shop?q=${encodeURIComponent(query.trim())}`); };
  return <>
    <div className="announcement">Free delivery over INR 15,000. Easy 14 day returns. Game-ready support.</div>
    <header>
      <Link className="logo" to="/">NEXA <i>GAMING</i></Link>
      <nav>
        <NavLink to="/">Home</NavLink><NavLink to="/shop">Shop</NavLink>
        <NavLink to="/keyboards">Keyboards</NavLink><NavLink to="/mice">Mice</NavLink>
        <NavLink to="/headsets">Headsets</NavLink><NavLink to="/chairs">Chairs</NavLink>
        <NavLink to="/support">Support</NavLink><NavLink to="/about">About</NavLink>
      </nav>
      <form className="search" onSubmit={submit} onFocus={() => setSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}>
        <input aria-label="Search products" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setSuggestionsOpen(true); }} placeholder="Search products or ID" />
        <button className="icon-button" aria-label="Search" title="Search" type="submit"><SearchIcon /></button>
        {suggestionsOpen && query.trim().length > 1 && <div className="search-suggestions">
          {suggestions.length ? suggestions.map(product => <button type="button" className="suggestion" key={product.id} onMouseDown={() => navigate(`/product/${product.id}`)}>
            <img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.category}. {product.id}. {money(product.price)}</small></span>
          </button>) : <div className="suggestion-empty">No related products found</div>}
          {suggestions.length > 0 && <button type="submit" className="all-results">View all related results</button>}
        </div>}
      </form>
      <Link className="bag-link" to="/cart">Bag <b>{cart.reduce((total, item) => total + item.quantity, 0)}</b></Link>
    </header>
  </>;
}

function Footer() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const submit = async event => {
    event.preventDefault();
    try { const result = await api('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); setMessage(result.message); setEmail(''); }
    catch (error) { if (window.location.hostname.endsWith('github.io')) { setMessage('Welcome to Nexa Insider.'); setEmail(''); } else setMessage(error.message); }
  };
  return <>
    <section className="newsletter"><p className="eyebrow">Nexa insider</p><h2>Stay ahead of the game.</h2><p>New gear, setup guides and members-only drops, delivered.</p><form onSubmit={submit}><input required type="email" aria-label="Email address" value={email} onChange={event => setEmail(event.target.value)} placeholder="Your email address" /><button>Join now</button></form>{message && <small>{message}</small>}</section>
    <footer><div><Link className="logo light" to="/">NEXA <i>GAMING</i></Link><p>Performance gear for players who refuse to settle.</p></div><div><h4>Gear</h4><Link to="/shop">Shop all</Link><Link to="/keyboards">Keyboards</Link><Link to="/mice">Gaming mice</Link></div><div><h4>Company</h4><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div><div><h4>Player care</h4><Link to="/cart">Your cart</Link><Link to="/support">Delivery and returns</Link><Link to="/support">Support</Link></div><span className="copyright">2026 Nexa Gaming</span></footer>
  </>;
}

function ProductCard({ product }) {
  const { add, wishlist, toggleWish } = useStore();
  return <article className="product-card">
    <Link to={`/product/${product.id}`} className="product-image"><img src={product.image} alt={product.name} /><span>{product.tag}</span></Link>
    <button className={`heart ${wishlist.includes(product.id) ? 'loved' : ''}`} onClick={() => toggleWish(product.id)} aria-label={wishlist.includes(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}>{wishlist.includes(product.id) ? 'Saved' : 'Save'}</button>
    <p>{product.category}</p><small className="product-id">Product ID {product.id}</small>
    <Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
    <div className="product-row"><strong>{money(product.price)}</strong><button className="cart-action" onClick={() => add(product.id)}><CartIcon /><span>Add to cart</span></button></div>
  </article>;
}

function Home() {
  return <main>
    <section className="hero"><div><p className="eyebrow">Built for every win</p><h1>Gear up.<br /><em>Game on.</em></h1><p>Precision peripherals, immersive audio and battle-tested comfort. Build a setup that keeps up with you.</p><Link className="primary" to="/shop">Shop gaming gear</Link></div><div className="hero-media"><video autoPlay muted loop playsInline><source src={asset('videos/index/1.mp4')} /></video><span>Nexa performance series</span></div></section>
    <div className="marquee">ZERO LAG. MAXIMUM CONTROL. IMMERSIVE AUDIO. ALL-DAY COMFORT.</div>
    <section className="section"><div className="section-head"><div><p className="eyebrow">Player favourites</p><h2>Upgrade your <em>loadout</em></h2></div><Link to="/shop">Shop all</Link></div><div className="grid">{products.slice(0, 16).map(product => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="story"><img src={products[31].image} alt="Nexa gaming setup" /><div><p className="eyebrow">Nexa advantage</p><h2>Performance you<br />can <em>feel.</em></h2><p>Every product is selected for responsiveness, reliability and comfort—so the gear disappears and the game takes over.</p><Link className="primary inverse" to="/about">Why Nexa</Link></div></section>
    <section className="section arrivals"><div className="section-head"><div><p className="eyebrow">Fresh drops</p><h2>New to the <em>arena</em></h2></div><Link to="/shop?sort=rating">View top-rated gear</Link></div><div className="grid">{products.slice(16, 32).map(product => <ProductCard key={product.id} product={product} />)}</div></section>
  </main>;
}

function Shop() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const category = params.get('category') || 'All';
  const sort = params.get('sort') || 'relevance';
  const maxPrice = Number(params.get('max') || 50000);
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const results = useMemo(() => {
    let list = searchProducts(query, products).filter(product => (category === 'All' || product.category === category) && product.price <= maxPrice);
    if (sort === 'price-low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [query, category, sort, maxPrice]);
  const update = values => { const next = new URLSearchParams(params); Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setParams(next); };
  return <main><section className="page-hero"><p className="eyebrow">Curated for you</p><h1>{query ? `Results for ${query}` : 'The collection'}</h1><p>{results.length} related products</p></section><section className="section">
    <div className="shop-tools"><label>Category<select value={category} onChange={event => update({ category: event.target.value === 'All' ? '' : event.target.value })}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>Sort by<select value={sort} onChange={event => update({ sort: event.target.value })}><option value="relevance">Relevance</option><option value="price-low">Price low to high</option><option value="price-high">Price high to low</option><option value="rating">Customer rating</option><option value="name">Product name</option></select></label><label>Maximum price<select value={maxPrice} onChange={event => update({ max: event.target.value })}><option value="5000">INR 5,000</option><option value="10000">INR 10,000</option><option value="20000">INR 20,000</option><option value="50000">All prices</option></select></label><button onClick={() => setParams({})}>Clear filters</button></div>
    {results.length ? <div className="grid">{results.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="empty"><h2>No close products found</h2><p>Try a product type, colour, occasion, category or product ID.</p><button className="primary" onClick={() => setParams({})}>View all products</button></div>}
  </section></main>;
}

function Product() {
  const { id } = useParams();
  const product = products.find(item => item.id === id);
  const { add, toggleWish, wishlist } = useStore();
  if (!product) return <NotFound />;
  return <main className="product-page"><div className="product-detail"><img src={product.image} alt={product.name} /><div><p className="eyebrow">{product.category}. {product.tag}</p><small className="product-id">Product ID {product.id}</small><h1>{product.name}</h1><div className="rating">Rating {product.rating} out of 5. <span>Editor reviewed</span></div><h2>{money(product.price)}</h2><p>{product.description}</p><ul><li>Responsibly selected materials</li><li>Complimentary delivery over INR 15,000</li><li>Easy returns within 14 days</li></ul><button className="primary wide detail-cart" onClick={() => add(product.id)}><CartIcon /><span>Add to cart</span></button><button className="secondary wide" onClick={() => toggleWish(product.id)}>{wishlist.includes(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}</button></div></div></main>;
}

function DepartmentPage({ department, label, title, description }) {
  const departmentProducts = products.filter(product => product.department === department);
  return <main><section className={`page-hero department-hero ${department.toLowerCase()}`}><p className="eyebrow">{label}</p><h1>{title}</h1><p>{description}</p></section><section className="section"><div className="department-heading"><div><p className="eyebrow">The {department} edit</p><h2>{departmentProducts.length} selected products</h2></div><Link to={`/shop?q=${department}`}>Search this department</Link></div><div className="grid">{departmentProducts.map(product => <ProductCard key={product.id} product={product} />)}</div></section></main>;
}

function downloadReceipt(order) {
  if (!order) return;
  const lines = ['NEXA GAMING', 'ORDER RECEIPT', '', `Order number: ${order.orderNumber}`, `Status: ${order.status}`, '', ...order.items.map(item => `${item.id}  ${item.name}  Quantity ${item.quantity}  ${money(item.price * item.quantity)}`), '', `Subtotal: ${money(order.subtotal)}`, `Delivery: ${money(order.shipping)}`, `Total: ${money(order.total)}`];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${order.orderNumber}-receipt.txt`; anchor.click(); URL.revokeObjectURL(url);
}

function Success() {
  const { state } = useLocation();
  return <main className="section success"><p className="eyebrow">Order confirmed</p><h1>Thank you for your order.</h1><p>Your order <b>{state?.orderNumber || 'Vogue Vivant'}</b> is confirmed.</p>{state && <button className="secondary" onClick={() => downloadReceipt(state)}>Download receipt</button>}<Link className="primary" to="/shop">Continue shopping</Link></main>;
}
function NotFound() { return <main className="section empty"><p className="eyebrow">Page not found</p><h1>This page is unavailable.</h1><Link className="primary" to="/">Return home</Link></main>; }
function App() { const store = useStore(); return <><Header /><Routes><Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/keyboards" element={<DepartmentPage department="Keyboards" label="Total control" title="Keyboards built to react" description="Mechanical, magnetic and wireless boards for every play style." />} /><Route path="/mice" element={<DepartmentPage department="Mice" label="Pixel precision" title="Aim without limits" description="Fast, lightweight gaming mice tuned for reliable competitive control." />} /><Route path="/headsets" element={<DepartmentPage department="Headsets" label="Hear everything" title="Step inside the game" description="Immersive headsets with clear comms and lasting comfort." />} /><Route path="/chairs" element={<DepartmentPage department="Chairs" label="Built for long sessions" title="Command in comfort" description="Supportive gaming chairs engineered for focus and all-day play." />} /><Route path="/product/:id" element={<Product />} /><Route path="/cart" element={<Cart store={store} />} /><Route path="/checkout" element={<Checkout store={store} />} /><Route path="/success" element={<Success />} /><Route path="/about" element={<Content type="about" />} /><Route path="/support" element={<Content type="support" />} /><Route path="/contact" element={<Content type="contact" />} /><Route path="/privacy" element={<Content type="privacy" />} /><Route path="*" element={<NotFound />} /></Routes><Footer /></>; }

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter basename="/NEXA-GAMING-WEB-PAGE"><Provider><App /></Provider></BrowserRouter></React.StrictMode>);

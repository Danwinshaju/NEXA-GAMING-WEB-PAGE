import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { products } from './data/products';

const money = value => `INR ${new Intl.NumberFormat('en-IN').format(value)}`;
const asset = path => `${import.meta.env.BASE_URL}assets/${path}`;

export function Cart({ store }) {
  const navigate = useNavigate();
  const items = store.cart.map(item => ({ ...products.find(product => product.id === item.id), quantity: item.quantity })).filter(item => item.id);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  return <main className="section cart"><h1>Your bag</h1>{!items.length ? <div className="empty"><h2>Your bag is empty.</h2><Link className="primary" to="/shop">Explore the collection</Link></div> : <div className="cart-layout"><div>{items.map(item => <article className="cart-item" key={item.id}><img src={item.image} alt={item.name} /><div><p>{item.category}</p><small>Product ID {item.id}</small><Link to={`/product/${item.id}`}><h3>{item.name}</h3></Link><button onClick={() => store.remove(item.id)}>Remove</button></div><select aria-label={`Quantity for ${item.name}`} value={item.quantity} onChange={event => store.quantity(item.id, Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map(number => <option key={number}>{number}</option>)}</select><strong>{money(item.price * item.quantity)}</strong></article>)}</div><aside><h2>Order summary</h2><p><span>Subtotal</span><b>{money(subtotal)}</b></p><p><span>Delivery</span><b>{subtotal >= 15000 ? 'Complimentary' : money(499)}</b></p><hr /><p className="total"><span>Total</span><b>{money(subtotal + (subtotal >= 15000 ? 0 : 499))}</b></p><button className="primary wide" onClick={() => navigate('/checkout')}>Secure checkout</button><small>Taxes included. Secure checkout.</small></aside></div>}</main>;
}

export function Checkout({ store }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', pincode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const subtotal = store.cart.reduce((total, item) => total + products.find(product => product.id === item.id).price * item.quantity, 0);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: form, items: store.cart }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      store.clear(); navigate('/success', { state: data });
    } catch (submitError) {
      if (window.location.hostname.endsWith('github.io')) {
        const safeItems = store.cart.map(item => { const product = products.find(entry => entry.id === item.id); return { id: product.id, name: product.name, price: product.price, image: product.image, quantity: item.quantity }; });
        const shipping = subtotal >= 15000 ? 0 : 499;
        const demoOrder = { orderNumber: `NX${Date.now().toString().slice(-8)}`, customer: form, items: safeItems, subtotal, shipping, total: subtotal + shipping, status: 'Confirmed' };
        store.clear(); navigate('/success', { state: demoOrder });
      } else setError(submitError.message);
    } finally { setBusy(false); }
  };
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
  if (!store.cart.length) return <main className="section empty"><h1>No items to checkout</h1><Link className="primary" to="/shop">Shop now</Link></main>;
  return <main className="section checkout"><div><p className="eyebrow">Secure checkout</p><h1>Delivery details</h1><form onSubmit={submit} className="checkout-form"><label>Full name<input required value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Email<input required type="email" value={form.email} onChange={event => update('email', event.target.value)} /></label><label>Phone<input required pattern="[0-9]{10}" value={form.phone} onChange={event => update('phone', event.target.value)} /></label><label className="full">Address<input required value={form.address} onChange={event => update('address', event.target.value)} /></label><label>City<input required value={form.city} onChange={event => update('city', event.target.value)} /></label><label>PIN code<input required pattern="[0-9]{6}" value={form.pincode} onChange={event => update('pincode', event.target.value)} /></label><fieldset className="full"><legend>Payment method</legend><label className="radio"><input type="radio" checked readOnly /> Cash on delivery</label></fieldset>{error && <p className="error full">{error}</p>}<button disabled={busy} className="primary wide full">{busy ? 'Placing order' : `Place order for ${money(subtotal + (subtotal >= 15000 ? 0 : 499))}`}</button></form></div><aside><h2>Your order</h2>{store.cart.map(item => { const product = products.find(entry => entry.id === item.id); return <p key={item.id}><span>{product.name}, quantity {item.quantity}</span><b>{money(product.price * item.quantity)}</b></p>; })}</aside></main>;
}

export function Content({ type }) {
  const content = {
    about: ['Built for players', 'Gaming gear without compromise', 'Nexa Gaming brings performance-focused keyboards, mice, audio and furniture into one trusted destination. We select dependable gear that improves control, comfort and immersion at every level.'],
    support: ['Player care', 'How can we help?', 'Get help with orders, delivery, returns, setup and product questions. Nexa support is available around the clock for every player.'],
    privacy: ['Your trust matters', 'Privacy, clearly stated', 'We only use information you provide to fulfil orders, answer messages and send updates you request. We never sell personal information.'],
    contact: ['Start a conversation', 'Contact Nexa Gaming', 'Questions about an order, partnership or product can be sent to our player care team below.']
  }[type];
  const [done, setDone] = useState('');
  return <main><section className="page-hero"><p className="eyebrow">{content[0]}</p><h1>{content[1]}</h1></section><section className="prose"><p>{content[2]}</p>{type === 'contact' && <form onSubmit={event => { event.preventDefault(); setDone('Thank you. Our team will be in touch.'); event.currentTarget.reset(); }}><input required placeholder="Your name" /><input required type="email" placeholder="Email address" /><textarea required placeholder="How can we help?" /><button className="primary">Send message</button>{done && <b>{done}</b>}</form>}</section></main>;
}

const editors = [
  { name: 'Sofia Laurent', role: 'Editor in Chief', image: asset('images/editors/1.jpg'), bio: 'Sofia leads the editorial vision with a focus on enduring style, independent voices and thoughtful consumption.' },
  { name: 'Maya Chen', role: 'Fashion Director', image: asset('images/editors/2.jpg'), bio: 'Maya shapes the fashion edit, translating runway ideas into intelligent and wearable recommendations.' },
  { name: 'Isabelle Moreau', role: 'Beauty Director', image: asset('images/editors/3.jpg'), bio: 'Isabelle reviews modern skincare, makeup and fragrance through the lens of efficacy and personal ritual.' },
  { name: 'Priya Nair', role: 'Design Editor', image: asset('images/editors/4.jpg'), bio: 'Priya discovers emerging designers and documents the craft, culture and people behind every collection.' },
  { name: 'Clara Whitfield', role: 'Features Editor', image: asset('images/editors/5.jpg'), bio: 'Clara writes about the relationship between clothing, identity, culture and contemporary life.' },
  { name: 'Anais Dubois', role: 'Market Editor', image: asset('images/editors/6.jpg'), bio: 'Anais searches the market for distinctive pieces that balance quality, usefulness and originality.' }
];

export function Editors() {
  return <main><section className="page-hero"><p className="eyebrow">Inside the magazine</p><h1>The people behind the pages</h1><p>Meet the independent voices shaping every Vogue Vivant edit.</p></section><section className="editors-section"><div className="editors-grid">{editors.map(editor => <article className="editor-card" key={editor.name}><img src={editor.image} alt={editor.name} /><p>{editor.role}</p><h2>{editor.name}</h2><span>{editor.bio}</span></article>)}</div></section></main>;
}

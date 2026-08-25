import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, searchProducts } from '../src/data/products.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '100kb' }));

const Order = mongoose.model('Order', new mongoose.Schema({
  orderNumber: String,
  customer: Object,
  items: Array,
  subtotal: Number,
  shipping: Number,
  total: Number,
  status: { type: String, default: 'Confirmed' }
}, { timestamps: true }));

let databaseReady = false;
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { databaseReady = true; console.log('MongoDB connected'); })
    .catch(error => console.warn('MongoDB unavailable. Temporary order storage is active.', error.message));
}

app.get('/api/health', (_request, response) => response.json({ ok: true, database: databaseReady ? 'mongodb' : 'temporary' }));

app.get('/api/products', (request, response) => {
  const query = String(request.query.q || '').trim();
  const category = String(request.query.category || '').trim().toLowerCase();
  const maxPrice = Number(request.query.max || 50000);
  let results = searchProducts(query, products).filter(product => (!category || product.category.toLowerCase() === category) && product.price <= maxPrice);
  const sort = String(request.query.sort || 'relevance');
  if (sort === 'price-low') results.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') results.sort((a, b) => b.price - a.price);
  if (sort === 'rating') results.sort((a, b) => b.rating - a.rating);
  if (sort === 'name') results.sort((a, b) => a.name.localeCompare(b.name));
  response.json(results);
});

app.get('/api/products/:id', (request, response) => {
  const product = products.find(item => item.id.toLowerCase() === request.params.id.toLowerCase());
  return product ? response.json(product) : response.status(404).json({ message: 'Product not found' });
});

app.post('/api/orders', async (request, response) => {
  const { customer, items } = request.body;
  if (!customer?.name || !customer?.email || !customer?.phone || !customer?.address || !customer?.city || !customer?.pincode) return response.status(400).json({ message: 'Please complete all delivery details.' });
  if (!Array.isArray(items) || !items.length) return response.status(400).json({ message: 'Your bag is empty.' });
  const safeItems = items.map(item => {
    const product = products.find(entry => entry.id === item.id);
    if (!product) return null;
    return { id: product.id, name: product.name, price: product.price, image: product.image, quantity: Math.max(1, Math.min(10, Number(item.quantity) || 1)) };
  }).filter(Boolean);
  if (!safeItems.length) return response.status(400).json({ message: 'No valid products were found in the order.' });
  const subtotal = safeItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = subtotal >= 15000 ? 0 : 499;
  const payload = { orderNumber: `NX${Date.now().toString().slice(-8)}`, customer, items: safeItems, subtotal, shipping, total: subtotal + shipping, status: 'Confirmed' };
  const saved = databaseReady ? await Order.create(payload) : { ...payload, _id: crypto.randomUUID(), createdAt: new Date() };
  response.status(201).json(saved);
});

app.post('/api/contact', (request, response) => request.body?.email && request.body?.message ? response.status(201).json({ message: 'Thank you. Nexa Player Care will be in touch.' }) : response.status(400).json({ message: 'Email and message are required.' }));
app.post('/api/newsletter', (request, response) => /^\S+@\S+\.\S+$/.test(request.body?.email || '') ? response.status(201).json({ message: 'Welcome to Nexa Insider.' }) : response.status(400).json({ message: 'Enter a valid email address.' }));

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(root, '../dist');
app.use(express.static(dist));
app.use('/NEXA-GAMING-WEB-PAGE', express.static(dist));
app.get('*', (request, response, next) => request.path.startsWith('/api/') ? next() : response.sendFile(path.join(dist, 'index.html')));
app.use((error, _request, response, _next) => { console.error(error); response.status(500).json({ message: 'Something went wrong. Please try again.' }); });
app.listen(process.env.PORT || 5000, () => console.log(`Nexa Gaming running on port ${process.env.PORT || 5000}`));

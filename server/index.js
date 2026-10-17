import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, getSetting, setSetting } from './db.js';

export const app = express();
const PORT = Number(process.env.PORT || 8787);
const TIP4SERV_BASE = 'https://api.tip4serv.com/v1';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(__dirname, '../dist');
const distIndex = path.join(distDir, 'index.html');
const rootIndex = path.join(appRoot, 'index.html');
const rootAssets = path.join(appRoot, 'assets');

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

function extractErrorMessage(data, status) {
  if (data && typeof data === 'object') {
    if (data.error && typeof data.error === 'object' && data.error.message) {
      return String(data.error.message);
    }
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
  }
  return `Tip4Serv API error: ${status}`;
}

async function readJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function loadApiKey() {
  if (process.env.TIP4SERV_API_KEY) return process.env.TIP4SERV_API_KEY.trim();
  const value = await getSetting('tip4serv_api_key');
  return value.trim();
}

async function fetchTip4Serv(path, apiKey) {
  const res = await fetch(`${TIP4SERV_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status));
  return data;
}

async function postTip4Serv(path, apiKey, body) {
  const res = await fetch(`${TIP4SERV_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status));
  return data;
}

function signAdminToken(owner) {
  return jwt.sign(
    { sub: String(owner.id), email: owner.email, role: 'owner' },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return jsonError(res, 401, 'Authentication required');

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return jsonError(res, 401, 'Invalid or expired session');
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/admin/status', async (_req, res) => {
  const [rows] = await getPool().execute('SELECT id FROM app_owner LIMIT 1');
  res.json({ hasOwner: rows.length > 0 });
});

app.post('/api/admin/claim', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || password.length < 6) {
    return jsonError(res, 400, 'Email and a password of at least 6 characters are required');
  }

  const pool = getPool();
  const [existing] = await pool.execute('SELECT id FROM app_owner LIMIT 1');
  if (existing.length > 0) return jsonError(res, 409, 'Ownership is already claimed');

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    'INSERT INTO app_owner (id, email, password_hash, claimed_at) VALUES (1, :email, :passwordHash, NOW())',
    { email, passwordHash },
  );

  res.json({ token: signAdminToken({ id: 1, email }), email });
});

app.post('/api/admin/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const [rows] = await getPool().execute(
    'SELECT id, email, password_hash FROM app_owner WHERE email = :email LIMIT 1',
    { email },
  );
  const owner = rows[0];
  if (!owner || !(await bcrypt.compare(password, owner.password_hash))) {
    return jsonError(res, 401, 'Invalid email or password');
  }

  res.json({ token: signAdminToken(owner), email: owner.email });
});

app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  res.json({ tip4serv_api_key: await getSetting('tip4serv_api_key') });
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  await setSetting('tip4serv_api_key', String(req.body?.tip4serv_api_key || '').trim());
  res.json({ ok: true });
});

app.all('/api/tip4serv-proxy', async (req, res) => {
  
  if (
    req.query.action === 'checkout' &&
    process.env.RAILWAY_ENVIRONMENT_NAME !== 'production'
  ) {
    return jsonError(res, 403, 'Checkout is disabled outside production.');
  }

  // Dummy store and product for staging only
  if (process.env.RAILWAY_ENVIRONMENT_NAME === 'staging') {
    const category = {
      id: 999,
      name: 'Custom Payments',
      slug: 'custom-payments',
      hide: false,
      main_redirect: false,
      description: 'Test products',
    };

    const product = {
      id: 999,
      name: 'Santino Custom Payment (TEST)',
      slug: 'santino-custom-payment-test',
      status: true,
      price: 1,
      donation: true,
      subscription: false,
      featured: true,
      category,
      created_date: 0,
      description: 'Test only. No real payments.',
      
custom_fields: [
  { id: 901, order: 1, name: 'Discord ID', type: 'text', marker: '', required: true },
  { id: 902, order: 2, name: 'Discord Username', type: 'text', marker: '', required: true },
  { id: 903, order: 3, name: 'Ticket ID', type: 'text', marker: '', required: true },
  { id: 904, order: 4, name: 'Order Details', type: 'text', marker: '', required: true },
],

    };

    switch (req.query.action) {
      case 'store':
        return res.json({
          id: 999,
          owner: 0,
          title: 'SantinoCustomsV (TEST)',
          domain: 'santino-test',
          currency: 'GBP',
          description: 'Testing custom payments',
          logo: '',
          timezone: 'Europe/London',
          color: '#0e0e0e',
        });

      case 'products':
        return res.json({
          products: [product],
          product_count: 1,
        });

      case 'categories':
        return res.json({
          categories: [category],
          category_count: 1,
        });

      case 'product':
        return req.query.slug === product.slug ||
          req.query.id === String(product.id)
          ? res.json(product)
          : jsonError(res, 404, 'Test product not found');

      case 'checkout-identifiers':
        return res.json([]);

      default:
        return jsonError(res, 400, 'Staging test only');
    }
  }

  try {
    const apiKey = await loadApiKey();
    if (!apiKey) {
      return jsonError(
        res,
        500,
        'Tip4Serv API key not configured. Claim ownership and set it from the /admin page.',
      );
    }

    const action = req.query.action;
    const page = req.query.page || '1';
    const limit = req.query.limit || '50';
    let data;

    switch (action) {
      case 'products': {
        let path = `/store/products?page=${page}&max_page=${limit}&details=true&only_enabled=true`;
        if (req.query.category) path += `&category=${req.query.category}`;
        data = await fetchTip4Serv(path, apiKey);
        break;
      }
      case 'categories': {
        let path = `/store/categories?page=${page}&max_page=${limit}`;
        if (req.query.parent) path += `&parent=${req.query.parent}`;
        data = await fetchTip4Serv(path, apiKey);
        break;
      }
      case 'product': {
        const identifier = req.query.slug || req.query.id;
        if (!identifier) return jsonError(res, 400, 'Product slug or id is required');
        data = await fetchTip4Serv(`/store/product/${identifier}?details=true`, apiKey);
        break;
      }
      case 'store':
        data = await fetchTip4Serv('/store/whoami', apiKey);
        break;
      case 'checkout-identifiers': {
        if (!req.query.store || !req.query.products) {
          return jsonError(res, 400, 'store and products parameters are required');
        }
        data = await fetchTip4Serv(
          `/store/checkout/identifiers?store=${req.query.store}&products=${req.query.products}`,
          apiKey,
        );
        break;
      }
      case 'checkout': {
        if (req.method !== 'POST') return jsonError(res, 405, 'POST method required for checkout');
        const storeId = Number(req.query.store);
        if (!Number.isSafeInteger(storeId) || storeId < 1) {
          return jsonError(res, 400, 'Invalid store identifier.');
        }

        const checkoutProducts = req.body?.products;
        if (!Array.isArray(checkoutProducts) || checkoutProducts.length === 0 || checkoutProducts.length > 50) {
          return jsonError(res, 400, 'Your cart is empty or invalid.');
        }

        const checkoutUser = req.body?.user;
        const email = checkoutUser?.email;
        if (
          !checkoutUser || typeof checkoutUser !== 'object' || Array.isArray(checkoutUser) ||
          typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
          return jsonError(res, 400, 'A valid email address is required.');
        }

        for (const item of checkoutProducts) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return jsonError(res, 400, 'Invalid checkout item.');
          }
          if (
            typeof item.product_slug !== 'string' || !item.product_slug ||
            !Number.isSafeInteger(item.product_id) || item.product_id < 1 ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 ||
            !['addtocart', 'subscribe'].includes(item.type)
          ) {
            return jsonError(res, 400, 'Invalid product or quantity.');
          }

          const product = await fetchTip4Serv(
            `/store/product/${encodeURIComponent(item.product_slug)}?details=true`,
            apiKey,
          );
          if (Number(product.id) !== item.product_id || product.status !== true) {
            return jsonError(res, 400, 'Product is unavailable or invalid.');
          }

          const isDonation = product.donation === true || product.donation === 1 || product.donation === '1';
          if (isDonation) {
            const amount = item.donation_amount;
            const minimum = Math.max(1, Number(product.min_donation ?? product.price));
            if (
              item.type !== 'addtocart' || item.quantity !== 1 ||
              !Number.isFinite(minimum) ||
              typeof amount !== 'number' || !Number.isFinite(amount) ||
              amount < minimum ||
              !Number.isSafeInteger(Math.round(amount * 100)) ||
              Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
            ) {
              return jsonError(res, 400, 'Invalid custom payment amount or quantity.');
            }
          } else if (item.donation_amount !== undefined) {
            return jsonError(res, 400, 'Custom amount not allowed for this product.');
          }

          const customFields = item.custom_fields === undefined ? {} : item.custom_fields;
          if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
            return jsonError(res, 400, 'Invalid custom field information.');
          }
          if (Object.values(customFields).some((value) =>
            value !== null && typeof value !== 'string' && typeof value !== 'boolean' &&
            !(typeof value === 'number' && Number.isFinite(value))
          )) {
            return jsonError(res, 400, 'Invalid custom field value.');
          }
          // For custom payments, validate required fields against Tip4Serv data, not the browser cart.
          // Fixed-price products continue to use Tip4Serv's own field-validation rules.
          for (const field of isDonation && Array.isArray(product.custom_fields) ? product.custom_fields : []) {
            const required = field.required === true || field.required === 1 || field.required === '1';
            if (!required) continue;
            if (field.parent) {
              const selected = customFields[String(field.parent.customFieldId)];
              if (selected === undefined || selected === null) continue;
              if (field.parent.optionId !== undefined && String(selected) !== String(field.parent.optionId)) continue;
            }
            const value = customFields[String(field.id)];
            const empty = value === undefined || value === null || String(value).trim() === '';
            const unchecked = field.type === 'checkbox' && ![true, 1, '1', 'true'].includes(value);
            if (empty || unchecked) {
              return jsonError(res, 400, `Required field missing: ${String(field.name || field.id)}`);
            }
          }
        }

        // product_slug is used only for our server-side product verification.
        // Only fields supported by Tip4Serv are forwarded to its checkout API.
        const tip4servBody = {
          products: checkoutProducts.map((item) => {
            const cleanItem = {
              product_id: item.product_id,
              type: item.type,
              quantity: item.quantity,
            };
            for (const key of ['donation_amount', 'server_selection', 'custom_fields']) {
              if (item[key] !== undefined) cleanItem[key] = item[key];
            }
            return cleanItem;
          }),
          user: { ...checkoutUser, email: email.trim() },
        };
        for (const key of ['redirect_success_checkout', 'redirect_canceled_checkout', 'redirect_pending_checkout']) {
          if (typeof req.body[key] === 'string') tip4servBody[key] = req.body[key];
        }

        data = await postTip4Serv(
          `/store/checkout?store=${encodeURIComponent(String(storeId))}`,
          apiKey,
          tip4servBody,
        );
        break;
      }
      case 'servers':
        data = await fetchTip4Serv(`/store/servers?page=${page}&max_page=${limit}`, apiKey);
        break;
      case 'server-players': {
        if (!req.query.server) return jsonError(res, 400, 'server parameter is required');
        const commands = await fetchTip4Serv(`/store/server/${req.query.server}/commands`, apiKey);
        const seen = new Set();
        const players = [];
        if (Array.isArray(commands)) {
          for (const entry of commands) {
            const eos = entry.eos_id || '';
            const name = entry.username || entry.player || '';
            const key = `${eos}|${name}`;
            if (key === '|' || seen.has(key)) continue;
            seen.add(key);
            players.push({
              eos_id: eos,
              username: name,
              ...(entry.steam_id ? { steam_id: String(entry.steam_id) } : {}),
            });
          }
        }
        data = { players };
        break;
      }
      default:
        return jsonError(res, 400, 'Invalid action parameter');
    }

    res.json(data);
  } catch (err) {
    jsonError(res, 500, err instanceof Error ? err.message : 'Internal server error');
  }
});

app.get('/api/rcon-players', async (req, res) => {
  try {
    if (req.query.action !== 'servers') {
      return jsonError(res, 501, 'RCON player lookup needs to be implemented for your server protocol.');
    }
    const [rows] = await getPool().execute(
      'SELECT id, map_name AS name FROM rcon_servers WHERE enabled = 1 ORDER BY sort_order ASC, map_name ASC',
    );
    res.json({ servers: rows });
  } catch (err) {
    jsonError(res, 500, err instanceof Error ? err.message : 'Internal server error');
  }
});

app.post('/api/discord-oauth', async (req, res) => {
  try {
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientSecret) {
      return jsonError(res, 500, 'Discord integration is not configured on the server.');
    }

    const code = String(req.body?.code || '').trim();
    const redirectUri = String(req.body?.redirect_uri || '').trim();
    const clientId = String(req.body?.client_id || '').trim();
    if (!code || !redirectUri || !clientId) {
      return jsonError(res, 400, 'Missing code, redirect_uri or client_id.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      return jsonError(
        res,
        400,
        tokenJson.error_description || tokenJson.error || 'Discord token exchange failed.',
      );
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) return jsonError(res, 400, 'Failed to load Discord user profile.');
    const user = await userRes.json();

    res.json({
      id: user.id,
      username: user.username,
      global_name: user.global_name ?? null,
      avatar: user.avatar ?? null,
    });
  } catch (err) {
    jsonError(res, 500, err instanceof Error ? err.message : 'Unexpected error.');
  }
});

if (existsSync(rootIndex) && existsSync(rootAssets)) {
  app.use('/assets', express.static(rootAssets));
  app.get('/background.png', (_req, res) => res.sendFile(path.join(appRoot, 'background.png')));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(rootIndex);
  });
} else if (existsSync(distIndex)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(distIndex);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Shadow API listening on http://localhost:${PORT}`);
  });
}

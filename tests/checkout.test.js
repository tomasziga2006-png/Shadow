import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { after, before, beforeEach, describe, it, mock } from 'node:test';

// Exercise the real Express route. Every upstream request is mocked; no database,
// real API credential, external checkout, or payment provider is used.
describe('checkout API', { concurrency: false }, () => {
  let server;
  let baseUrl;
  let product;
  let upstreamCalls;
  const previousEnv = {};

  function validBody() {
    return {
      products: [{
        product_id: 7,
        product_slug: 'custom-payment',
        type: 'addtocart',
        quantity: 1,
        donation_amount: 35.50,
        custom_fields: { 1: 'ticket-123', 2: 'Commission details' },
      }],
      user: { email: ' buyer@example.com ', discord_id: '123456789012345678' },
    };
  }

  async function request(body = validBody(), { method = 'POST', store = '123', action = 'checkout' } = {}) {
    const url = new URL('/api/tip4serv-proxy', baseUrl);
    url.search = new URLSearchParams({ action, store });
    return new Promise((resolve, reject) => {
      const req = http.request(url, { method, headers: { 'Content-Type': 'application/json' } }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
      });
      req.on('error', reject);
      req.end(method === 'POST' ? JSON.stringify(body) : undefined);
    });
  }

  before(async () => {
    for (const key of ['RAILWAY_ENVIRONMENT_NAME', 'TIP4SERV_API_KEY']) previousEnv[key] = process.env[key];
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production'; // Local route with all upstream traffic mocked.
    process.env.TIP4SERV_API_KEY = 'MOCK_ONLY_NO_REAL_KEY';
    mock.method(globalThis, 'fetch', async (input, options = {}) => {
      const url = new URL(input);
      assert.equal(url.origin, 'https://api.tip4serv.com', 'Unexpected upstream host');
      upstreamCalls.push({ url, options });
      if (options.method === 'POST') {
        assert.equal(url.pathname, '/v1/store/checkout');
        return Response.json({ url: 'https://example.invalid/mock-checkout' });
      }
      assert.equal(url.pathname, '/v1/store/product/custom-payment');
      return Response.json(product);
    });
    const { app } = await import('../server/index.js');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  beforeEach(() => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
    upstreamCalls = [];
    product = {
      id: 7, status: true, donation: true, price: 1, min_donation: 1,
      custom_fields: [
        { id: 1, name: 'Ticket ID', type: 'text', required: true },
        { id: 2, name: 'Order Details', type: 'text', required: true },
      ],
    };
  });

  after(async () => {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    mock.restoreAll();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('forwards a 35.50 custom payment with trimmed email and an allowlisted payload', async () => {
    const body = validBody();
    body.products[0].unexpected_price = 0.01;
    body.unexpected = 'ignored';
    body.redirect_success_checkout = 'https://example.invalid/success';
    const result = await request(body);
    assert.equal(result.status, 200);
    const call = upstreamCalls.find(({ options }) => options.method === 'POST');
    assert.equal(call.url.searchParams.get('store'), '123');
    const forwarded = JSON.parse(call.options.body);
    assert.deepEqual(forwarded, {
      products: [{ product_id: 7, type: 'addtocart', quantity: 1, donation_amount: 35.50,
        custom_fields: { 1: 'ticket-123', 2: 'Commission details' } }],
      user: { email: 'buyer@example.com', discord_id: '123456789012345678' },
      redirect_success_checkout: 'https://example.invalid/success',
    });
  });

  const invalidBodies = [
    ['missing user', (b) => { delete b.user; }],
    ['missing email', (b) => { delete b.user.email; }],
    ['malformed email', (b) => { b.user.email = 'invalid'; }],
    ['empty cart', (b) => { b.products = []; }],
    ['oversized cart', (b) => { b.products = Array(51).fill(b.products[0]); }],
    ['null item', (b) => { b.products = [null]; }],
    ['array item', (b) => { b.products = [[]]; }],
    ['string product ID', (b) => { b.products[0].product_id = '7'; }],
    ['mismatched product ID', (b) => { b.products[0].product_id = 8; }],
    ['missing slug', (b) => { delete b.products[0].product_slug; }],
    ['fractional quantity', (b) => { b.products[0].quantity = 1.5; }],
    ['zero quantity', (b) => { b.products[0].quantity = 0; }],
    ['multiple custom payments', (b) => { b.products[0].quantity = 2; }],
    ['invalid purchase type', (b) => { b.products[0].type = 'other'; }],
    ['subscription donation', (b) => { b.products[0].type = 'subscribe'; }],
    ['missing amount', (b) => { delete b.products[0].donation_amount; }],
    ['string amount', (b) => { b.products[0].donation_amount = '35.50'; }],
    ['amount below minimum', (b) => { b.products[0].donation_amount = 0.99; }],
    ['excess decimals', (b) => { b.products[0].donation_amount = 35.501; }],
    ['unsafe integer cents', (b) => { b.products[0].donation_amount = 1e20; }],
    ['missing required Ticket ID', (b) => { delete b.products[0].custom_fields[1]; }],
    ['blank required field', (b) => { b.products[0].custom_fields[1] = ' '; }],
    ['array custom fields', (b) => { b.products[0].custom_fields = []; }],
    ['object as required text', (b) => { b.products[0].custom_fields[1] = {}; }],
    ['array as required text', (b) => { b.products[0].custom_fields[1] = ['ticket']; }],
  ];
  for (const [label, mutate] of invalidBodies) {
    it(`rejects ${label} without creating an upstream checkout`, async () => {
      const body = validBody();
      mutate(body);
      assert.equal((await request(body)).status, 400);
      assert.equal(upstreamCalls.filter(({ options }) => options.method === 'POST').length, 0);
    });
  }

  it('accepts Tip4Serv product ID 0', async () => {
    product.id = 0;
    const body = validBody();
    body.products[0].product_id = 0;
    const result = await request(body);
    assert.equal(result.status, 200);
    const checkout = upstreamCalls.find(({ options }) => options.method === 'POST');
    assert.equal(JSON.parse(checkout.options.body).products[0].product_id, 0);
  });

  it('uses the minimum from upstream product metadata', async () => {
    product.min_donation = 40;
    assert.equal((await request()).status, 400);
    product.min_donation = 35.50;
    assert.equal((await request()).status, 200);
  });

  it('rejects unavailable products and invalid minimum metadata', async () => {
    product.status = false;
    assert.equal((await request()).status, 400);
    product.status = true;
    product.min_donation = 'invalid';
    assert.equal((await request()).status, 400);
  });

  it('requires checked required checkboxes and only active conditional fields', async () => {
    product.custom_fields.push(
      { id: 3, name: 'Agreement', type: 'checkbox', required: 1 },
      { id: 4, name: 'Conditional detail', type: 'text', required: '1', parent: { customFieldId: 5, optionId: 10 } },
    );
    const body = validBody();
    body.products[0].custom_fields[3] = 0;
    assert.equal((await request(body)).status, 400);
    body.products[0].custom_fields[3] = 1;
    assert.equal((await request(body)).status, 200);
    body.products[0].custom_fields[5] = 10;
    assert.equal((await request(body)).status, 400);
    body.products[0].custom_fields[4] = 'Required detail';
    assert.equal((await request(body)).status, 200);
  });

  it('preserves fixed-price quantity and rejects custom amounts on fixed-price products', async () => {
    product.donation = false;
    const body = validBody();
    assert.equal((await request(body)).status, 400);
    delete body.products[0].donation_amount;
    body.products[0].quantity = 2;
    assert.equal((await request(body)).status, 200);
    const posted = upstreamCalls.find(({ options }) => options.method === 'POST');
    assert.equal(JSON.parse(posted.options.body).products[0].quantity, 2);
  });

  it('rejects invalid store identifiers and non-POST checkout methods', async () => {
    for (const store of ['', '0', '-1', 'abc', '1.5']) assert.equal((await request(validBody(), { store })).status, 400);
    assert.equal((await request(undefined, { method: 'GET' })).status, 405);
    assert.equal(upstreamCalls.length, 0);
  });

  for (const environment of ['staging', 'development', undefined]) {
    it(`blocks checkout outside production (${environment ?? 'unset'}) before any upstream request`, async () => {
      if (environment === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME;
      else process.env.RAILWAY_ENVIRONMENT_NAME = environment;
      const result = await request();
      assert.equal(result.status, 403);
      assert.deepEqual(result.body, { error: 'Checkout is disabled outside production.' });
      assert.equal(upstreamCalls.length, 0);
    });
  }

  it('serves staging fixtures without upstream access when identifiers omit email', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    assert.deepEqual((await request(undefined, { method: 'GET', action: 'checkout-identifiers' })).body, []);
    const result = await request(undefined, { method: 'GET', action: 'products' });
    assert.equal(result.body.products[0].donation, true);
    assert.equal(upstreamCalls.length, 0);
  });
});

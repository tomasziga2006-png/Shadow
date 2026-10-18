import { randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'sc_discord_session';
const STATE_COOKIE = 'sc_discord_oauth_state';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;
const ISSUER = 'santinocustomsv-shadow';
const AUDIENCE = 'shadow-customer-login';

function config() {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || '';
  const sessionSecret = process.env.DISCORD_SESSION_SECRET || '';
  if (!clientId || !clientSecret || !redirectUri || sessionSecret.length < 32) return null;
  try {
    const url = new URL(redirectUri);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    if (url.pathname !== '/api/auth/discord/callback') return null;
  } catch { return null; }
  return { clientId, clientSecret, redirectUri, sessionSecret };
}

function cookie(req, name) {
  const entry = String(req.headers.cookie || '').split(';').find((item) => item.trim().startsWith(`${name}=`));
  if (!entry) return '';
  try { return decodeURIComponent(entry.trim().slice(name.length + 1)); } catch { return ''; }
}

function isSecure() {
  return Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV === 'production');
}

function clearCookie(res, name, path = '/') {
  res.clearCookie(name, { httpOnly: true, secure: isSecure(), sameSite: 'lax', path });
}

function publicUser(discordUser) {
  const id = String(discordUser.id);
  const username = String(discordUser.username || '').slice(0, 100);
  const avatar = typeof discordUser.avatar === 'string' && /^[a-zA-Z0-9_]+$/.test(discordUser.avatar)
    ? discordUser.avatar : null;
  return {
    id,
    username,
    global_name: typeof discordUser.global_name === 'string' ? discordUser.global_name.slice(0, 100) : null,
    avatar_url: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128` : null,
  };
}

export function mountDiscordLogin(app) {
  app.get('/api/auth/discord/start', (req, res) => {
    const conf = config();
    if (!conf) return res.status(503).send('Discord login is not configured yet.');
    const state = randomBytes(24).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true, secure: isSecure(), sameSite: 'lax',
      maxAge: STATE_TTL_MS, path: '/api/auth/discord/callback',
    });
    const url = new URL('https://discord.com/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', conf.clientId);
    url.searchParams.set('scope', 'identify');
    url.searchParams.set('redirect_uri', conf.redirectUri);
    url.searchParams.set('state', state);
    res.redirect(302, url.toString());
  });

  app.get('/api/auth/discord/callback', async (req, res) => {
    const conf = config();
    if (!conf) return res.status(503).send('Discord login is not configured yet.');
    const expected = cookie(req, STATE_COOKIE);
    clearCookie(res, STATE_COOKIE, '/api/auth/discord/callback');
    const supplied = String(req.query.state || '');
    if (!/^[0-9a-f]{48}$/.test(supplied) || !/^[0-9a-f]{48}$/.test(expected) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      return res.status(400).send('Invalid Discord login state. Please try again.');
    }
    if (req.query.error || !req.query.code || typeof req.query.code !== 'string') {
      return res.status(400).send('Discord login cancelled or missing authorisation code.');
    }
    try {
      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: conf.clientId,
          client_secret: conf.clientSecret,
          grant_type: 'authorization_code',
          code: req.query.code,
          redirect_uri: conf.redirectUri,
        }), signal: AbortSignal.timeout(10000),
      });
      if (!tokenRes.ok) return res.status(400).send('Discord rejected the login request.');
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return res.status(400).send('Discord access token missing.');
      const profileRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!profileRes.ok) return res.status(400).send('Could not verify Discord profile.');
      const discordUser = await profileRes.json();
      if (!/^\d{17,20}$/.test(String(discordUser.id || ''))) {
        return res.status(400).send('Discord returned an invalid account ID.');
      }
      const user = publicUser(discordUser);
      const token = jwt.sign({ ...user, kind: 'discord' }, conf.sessionSecret, {
        algorithm: 'HS256', expiresIn: '7d', issuer: ISSUER, audience: AUDIENCE,
      });
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true, secure: isSecure(), sameSite: 'lax',
        maxAge: SESSION_TTL_MS, path: '/',
      });
      return res.redirect(302, '/account');
    } catch {
      return res.status(502).send('Discord login temporarily unavailable. Please try again.');
    }
  });

  app.get('/api/auth/discord/me', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const conf = config();
    if (!conf) return res.status(503).json({ error: 'Discord login is not configured.' });
    try {
      const session = jwt.verify(cookie(req, COOKIE_NAME), conf.sessionSecret, {
        algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE,
      });
      if (session.kind !== 'discord' || !/^\d{17,20}$/.test(String(session.id || ''))) {
        return res.status(401).json({ user: null });
      }
      return res.json({ user: {
        id: session.id,
        username: session.username,
        global_name: session.global_name,
        avatar_url: session.avatar_url,
      } });
    } catch {
      return res.status(401).json({ user: null });
    }
  });

  app.post('/api/auth/discord/logout', (_req, res) => {
    clearCookie(res, COOKIE_NAME);
    res.json({ ok: true });
  });
}

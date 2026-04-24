// ─── SOLAR TRADER · CLOUDFLARE WORKER ───────────────────────────────────────
// Handles: register, login, save state, load state
// Bindings needed: DB (D1), JWT_SECRET (env var)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ─── SIMPLE JWT (HS256 via Web Crypto) ───────────────────────────────────────
async function signToken(payload, secret) {
  const header  = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
  const body    = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  const data    = `${header}.${body}`;
  const key     = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigB64}`;
}

async function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const data = `${header}.${body}`;
    const key  = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── PASSWORD HASHING (SHA-256 + salt, Web Crypto) ───────────────────────────
async function hashPassword(password, salt) {
  const raw  = new TextEncoder().encode(password + salt);
  const buf  = await crypto.subtle.digest('SHA-256', raw);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
async function authenticate(request, secret) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return verifyToken(token, secret);
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /api/register ──────────────────────────────────────────────────
    if (path === '/api/register' && method === 'POST') {
      const { username, password } = await request.json().catch(() => ({}));
      if (!username || !password) return err('Username and password required');
      if (username.length < 3)    return err('Username must be at least 3 characters');
      if (password.length < 6)    return err('Password must be at least 6 characters');
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return err('Username can only contain letters, numbers and underscores');

      const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
      if (existing) return err('Username already taken');

      const salt = randomSalt();
      const hash = await hashPassword(password, salt);
      const now  = Date.now();

      const result = await env.DB.prepare(
        'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)'
      ).bind(username, hash, salt, now).run();

      const userId = result.meta.last_row_id;
      const initialState = JSON.stringify({
        balance: 1500, owned: {}, batteryWh: 0, reservedWh: 0,
        soldTodayEur: 0, soldTodayKwh: 0, scheduledOrders: [], nextOrderId: 1,
      });
      await env.DB.prepare(
        'INSERT INTO game_states (user_id, state_json, updated_at) VALUES (?, ?, ?)'
      ).bind(userId, initialState, now).run();

      const token = await signToken(
        { sub: userId, username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
        env.JWT_SECRET
      );
      return json({ token, username, userId });
    }

    // ── POST /api/login ─────────────────────────────────────────────────────
    if (path === '/api/login' && method === 'POST') {
      const { username, password } = await request.json().catch(() => ({}));
      if (!username || !password) return err('Username and password required');

      const user = await env.DB.prepare(
        'SELECT id, password_hash, salt FROM users WHERE username = ?'
      ).bind(username).first();
      if (!user) return err('Invalid username or password', 401);

      const hash = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) return err('Invalid username or password', 401);

      const token = await signToken(
        { sub: user.id, username, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
        env.JWT_SECRET
      );
      return json({ token, username, userId: user.id });
    }

    // ── GET /api/state ──────────────────────────────────────────────────────
    if (path === '/api/state' && method === 'GET') {
      const payload = await authenticate(request, env.JWT_SECRET);
      if (!payload) return err('Unauthorized', 401);

      const row = await env.DB.prepare(
        'SELECT state_json FROM game_states WHERE user_id = ?'
      ).bind(payload.sub).first();
      if (!row) return err('No game state found', 404);

      return json({ state: JSON.parse(row.state_json) });
    }

    // ── POST /api/state ─────────────────────────────────────────────────────
    if (path === '/api/state' && method === 'POST') {
      const payload = await authenticate(request, env.JWT_SECRET);
      if (!payload) return err('Unauthorized', 401);

      const { state } = await request.json().catch(() => ({}));
      if (!state) return err('State required');

      // Sanitize — only save known fields
      const safe = {
        balance:         Number(state.balance)        || 1500,
        owned:           state.owned                  || {},
        batteryWh:       Number(state.batteryWh)      || 0,
        reservedWh:      Number(state.reservedWh)     || 0,
        soldTodayEur:    Number(state.soldTodayEur)   || 0,
        soldTodayKwh:    Number(state.soldTodayKwh)   || 0,
        scheduledOrders: Array.isArray(state.scheduledOrders) ? state.scheduledOrders : [],
        nextOrderId:     Number(state.nextOrderId)    || 1,
      };

      await env.DB.prepare(
        'UPDATE game_states SET state_json = ?, updated_at = ? WHERE user_id = ?'
      ).bind(JSON.stringify(safe), Date.now(), payload.sub).run();

      return json({ ok: true });
    }

    // ── GET /api/leaderboard ────────────────────────────────────────────────
    if (path === '/api/leaderboard' && method === 'GET') {
      const rows = await env.DB.prepare(`
        SELECT u.username, g.state_json
        FROM users u JOIN game_states g ON u.id = g.user_id
        ORDER BY json_extract(g.state_json, '$.balance') DESC
        LIMIT 10
      `).all();

      const board = rows.results.map(r => {
        const s = JSON.parse(r.state_json);
        return {
          username: r.username,
          balance:  +(s.balance || 0).toFixed(2),
          profit:   +((s.balance || 1500) - 1500).toFixed(2),
        };
      });
      return json({ leaderboard: board });
    }

    return err('Not found', 404);
  },
};

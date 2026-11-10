import { Redis } from '@upstash/redis';

/* Conexión compatible con Upstash directo + Vercel KV */
export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export const KEYS = {
  config:  'config:v1',
  songs:   'songs:v1',
  voters:  'voters:v1',   // hash: token -> { name, token }
  votes:   'votes:v1',    // hash: token -> { at, songIds, ip }
};

/* ⭐ EDITA AQUÍ LAS 100 CANCIONES */
function generateSongs(n = 100) {
  const adj = ['Eterno','Perdido','Salvaje','Azul','Dorado','Silencioso','Roto','Libre',
    'Invisible','Lejano','Fugaz','Profundo','Salado','Cristal','Nocturno','Feroz',
    'Bailando','Susurros','Corazón','Ciudad','Verano','Invierno','Otoño','Primavera'];
  const sus = ['Corazón','Fuego','Mar','Cielo','Camino','Sueño','Viento','Noche','Luz','Sombras',
    'Beso','Ritmo','Silencio','Eco','Rayo','Marea','Amanecer','Tormenta','Estrella','Río'];
  const arts = ['Los Fantasmas','Marina Sol','El Ruido','Cielo Abierto','Vértigo','La Luna',
    'Los Cristales','Nova','Sol Naciente','Rosa Negra','Los Olvidados','Cobalto','Verde Mar'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: i + 1,
      title: `${adj[i % adj.length]} ${sus[(i * 7 + 3) % sus.length]}`,
      artist: arts[(i * 3) % arts.length],
    });
  }
  return out;
}

export async function getConfig() {
  let cfg = await redis.get(KEYS.config);
  if (!cfg) {
    cfg = {
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    };
    await redis.set(KEYS.config, cfg, { nx: true });
    cfg = (await redis.get(KEYS.config)) || cfg;
  }
  return cfg;
}

export async function getSongs() {
  let songs = await redis.get(KEYS.songs);
  if (!songs) {
    songs = generateSongs(100);
    await redis.set(KEYS.songs, songs, { nx: true });
    songs = (await redis.get(KEYS.songs)) || songs;
  }
  return songs;
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function checkAuth(req, res) {
  const cfg = await getConfig();
  const pass = req.headers['x-admin-pass'] || req.query?.pass;
  if (pass !== cfg.adminPassword) {
    send(res, 401, { error: 'No autorizado' });
    return false;
  }
  return true;
}

export async function rateLimit(ip, path, max = 10, windowSec = 60) {
  try {
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const key = `rl:${ip}:${path}:${bucket}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return count <= max;
  } catch {
    return true;
  }
}

export function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('API error:', err);
      if (!res.headersSent) send(res, 500, { error: 'Error interno del servidor' });
    }
  };
}
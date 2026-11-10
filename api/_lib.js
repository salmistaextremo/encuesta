import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export const KEYS = {
  config:  'config:v1',
  songs:   'songs:v1',
  voters:  'voters:v1',
  votes:   'votes:v1',
};

export async function getConfig() {
  let cfg = await redis.get(KEYS.config);
  if (typeof cfg === 'string') {
    try { cfg = JSON.parse(cfg); } catch (e) {}
  }
  if (!cfg) {
    cfg = {
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    };
    await redis.set(KEYS.config, cfg);
    cfg = (await redis.get(KEYS.config)) || cfg;
    if (typeof cfg === 'string') {
      try { cfg = JSON.parse(cfg); } catch (e) {}
    }
  }
  return cfg;
}

export async function getSongs() {
  let songs = await redis.get(KEYS.songs);
  if (typeof songs === 'string') {
    try { songs = JSON.parse(songs); } catch (e) {}
  }
  if (!songs) {
    // 👇 AQUÍ VAN TUS 100 CANCIONES 👇
    songs = [
      { id: 1, title: "Nombre de la canción 1", artist: "Artista 1" },
      { id: 2, title: "Nombre de la canción 2", artist: "Artista 2" },
      { id: 3, title: "Nombre de la canción 3", artist: "Artista 3" },
      // ... (continúa hasta la canción 100)
      { id: 100, title: "Nombre de la canción 100", artist: "Artista 100" }
    ];
    await redis.set(KEYS.songs, songs);
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

export function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
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
    try { await handler(req, res); } 
    catch (err) {
      console.error('API error:', err);
      if (!res.headersSent) send(res, 500, { error: 'Error interno del servidor' });
    }
  };
}

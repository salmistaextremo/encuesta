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
import { getConfig, send, withErrorHandler } from './_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const cfg = await getConfig();
  send(res, 200, { deadline: cfg.deadline });
});

import crypto from 'crypto';
import { redis, KEYS, getConfig, send, checkAuth, parseBody } from '../_lib.js';

export default async function handler(req, res) {
  try {
    // Verificamos contraseña
    if (!(await checkAuth(req, res))) return;

    if (req.method === 'GET') {
      const cfg = await getConfig();
      const votersObj = await redis.hgetall(KEYS.voters) || {};
      const votesObj = await redis.hgetall(KEYS.votes) || {};

      const list = Object.entries(votersObj).map(([token, v]) => {
        let voterData = v;
        if (typeof v === 'string') {
          try { voterData = JSON.parse(v); } catch (e) { voterData = { name: v }; }
        }
        return {
          name: voterData?.name || 'Sin nombre',
          token,
          voted: !!votesObj[token],
          votedAt: votesObj[token]?.at || null,
          link: `/v/${token}`,
        };
      });

      return send(res, 200, { deadline: cfg?.deadline || new Date().toISOString(), voters: list });
    }

    if (req.method === 'POST') {
      const { names } = parseBody(req);
      if (!Array.isArray(names) || !names.length) {
        return send(res, 400, { error: 'Sin nombres' });
      }

      const created = [];
      for (const raw of names) {
        const name = String(raw).trim();
        if (!name) continue;
        
        const token = crypto.randomBytes(9).toString('base64url');
        
        // Guardamos el nombre como texto (JSON string)
        await redis.hset(KEYS.voters, token, JSON.stringify({ name, token }));
        
        created.push({ name, token, link: `/v/${token}` });
      }

      return send(res, 200, { created, total: created.length });
    }

    send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    // ¡ESTO ES CLAVE! Si algo falla, nos dirá exactamente qué es.
    console.error('CRASH EN VOTERS.JS:', error);
    send(res, 500, { error: 'Error interno', message: error.message });
  }
}

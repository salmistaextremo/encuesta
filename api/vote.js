import {
  redis, KEYS, getConfig, getSongs, send,
  rateLimit, getClientIp, parseBody, withErrorHandler,
} from './_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!(await rateLimit(ip, 'vote', 10, 60))) {
    return send(res, 429, { error: 'Demasiadas solicitudes' });
  }

  const { token, songIds } = parseBody(req);
  if (!token || !Array.isArray(songIds)) {
    return send(res, 400, { error: 'Datos inválidos' });
  }
  if (songIds.length !== 50) {
    return send(res, 400, { error: 'Debes elegir exactamente 50 canciones' });
  }

  const [voter, cfg, songs] = await Promise.all([
    redis.hget(KEYS.voters, token),
    getConfig(),
    getSongs(),
  ]);

  if (!voter) return send(res, 404, { error: 'Enlace inválido' });
  if (new Date() >= new Date(cfg.deadline)) {
    return send(res, 400, { error: 'La encuesta ha finalizado' });
  }

  const validIds = new Set(songs.map(s => s.id));
  const unique = new Set(songIds);
  if (unique.size !== 50 || songIds.some(id => !validIds.has(id))) {
    return send(res, 400, { error: 'Selección inválida' });
  }

  const voteData = {
    at: new Date().toISOString(),
    songIds: [...songIds],
    ip,
  };

  // HSETNX atómico — 1 si se creó, 0 si ya existía
  const created = await redis.hsetnx(KEYS.votes, token, voteData);
  if (!created) return send(res, 409, { error: 'Ya has votado' });

  send(res, 200, { ok: true });
});
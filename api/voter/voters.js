import { redis, KEYS, getConfig, getSongs, send, withErrorHandler } from '../../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method === 'DELETE') {
    const { token } = req.query;
    if (!token) return send(res, 400, { error: 'Token requerido' });
    await Promise.all([redis.hdel(KEYS.voters, token), redis.hdel(KEYS.votes, token)]);
    return send(res, 200, { ok: true });
  }

  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const { token } = req.query;
  if (!token) return send(res, 400, { error: 'Token requerido' });

  const [voterRaw, hasVoted, cfg, songs] = await Promise.all([
    redis.hget(KEYS.voters, token),
    redis.hexists(KEYS.votes, token),
    getConfig(),
    getSongs(),
  ]);

  if (!voterRaw) return send(res, 404, { error: 'Enlace inválido o expirado' });

  let voter = voterRaw;
  if (typeof voterRaw === 'string') {
    try { voter = JSON.parse(voterRaw); } catch (e) {}
  }

  const ended = new Date() >= new Date(cfg.deadline);

  send(res, 200, {
    name: voter?.name || 'Votante',
    voted: !!hasVoted,
    ended,
    deadline: cfg.deadline,
    songs,
  });
});

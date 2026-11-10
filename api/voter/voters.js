import { redis, KEYS, getConfig, getSongs, send, withErrorHandler } from '../../_lib.js';

export default withErrorHandler(async (req, res) => {
  const { token, name } = req.query;
  if (!token) return send(res, 400, { error: 'Token requerido' });

  // Ruta para eliminar votante (desde el Admin)
  if (req.method === 'DELETE') {
    await Promise.all([redis.hdel(KEYS.voters, token), redis.hdel(KEYS.votes, token)]);
    return send(res, 200, { ok: true });
  }

  // Ruta para que el votante abra su enlace
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  const [hasVoted, cfg, songs] = await Promise.all([
    redis.hexists(KEYS.votes, token),
    getConfig(),
    getSongs(),
  ]);

  const ended = new Date() >= new Date(cfg.deadline);
  const voterName = name || 'Votante';

  send(res, 200, {
    name: voterName, // Usamos el nombre que viene en la URL
    voted: !!hasVoted,
    ended,
    deadline: cfg.deadline,
    songs,
  });
});

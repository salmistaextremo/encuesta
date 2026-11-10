import { redis, KEYS, getConfig, getSongs, send, withErrorHandler } from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return send(res, 400, { error: 'Token requerido' });

  const [voter, hasVoted, cfg, songs] = await Promise.all([
    redis.hget(KEYS.voters, token),
    redis.hexists(KEYS.votes, token),
    getConfig(),
    getSongs(),
  ]);

  if (!voter) return send(res, 404, { error: 'Enlace inválido o expirado' });

  const ended = new Date() >= new Date(cfg.deadline);

  send(res, 200, {
    name: voter.name,
    voted: !!hasVoted,
    ended,
    deadline: cfg.deadline,
    songs,
  });
});

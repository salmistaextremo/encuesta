import { redis, KEYS, send, checkAuth, withErrorHandler } from '../../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;
  if (req.method !== 'DELETE') return send(res, 405, { error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return send(res, 400, { error: 'Token requerido' });

  await Promise.all([
    redis.hdel(KEYS.voters, token),
    redis.hdel(KEYS.votes, token),
  ]);

  send(res, 200, { ok: true });
});

import { redis, KEYS, getConfig, send, checkAuth, withErrorHandler } from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  const cfg = await getConfig();
  const votesObj = (await redis.hgetall(KEYS.votes)) || {};

  const list = Object.entries(votesObj).map(([token, v]) => {
    let data = v;
    if (typeof v === 'string') {
      try { data = JSON.parse(v); } catch (e) {}
    }
    return {
      name: data?.name || 'Desconocido',
      token: token,
      voted: true,
      votedAt: data?.at || null,
    };
  });

  return send(res, 200, { deadline: cfg.deadline, voters: list });
});

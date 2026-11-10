import { redis, KEYS, send, checkAuth, withErrorHandler } from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  await redis.del(KEYS.votes);
  send(res, 200, { ok: true });
});
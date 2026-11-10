import {
  redis, KEYS, getConfig, send, checkAuth, parseBody, withErrorHandler,
} from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const { deadline, adminPassword } = parseBody(req);
  const cfg = await getConfig();

  if (deadline) cfg.deadline = deadline;
  if (adminPassword) cfg.adminPassword = adminPassword;

  await redis.set(KEYS.config, cfg);
  send(res, 200, { ok: true, config: cfg });
});
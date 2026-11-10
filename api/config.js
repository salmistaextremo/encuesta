import { getConfig, send, withErrorHandler } from './_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const cfg = await getConfig();
  send(res, 200, { deadline: cfg.deadline });
});

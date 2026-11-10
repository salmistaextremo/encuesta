import crypto from 'crypto';
import { redis, KEYS, send, checkAuth, withErrorHandler } from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;

  if (req.method === 'GET') {
    const [cfg, votersObj, votesObj] = await Promise.all([
      getConfig(),
      redis.hgetall(KEYS.voters),
      redis.hgetall(KEYS.votes),
    ]);

    const voters = votersObj || {};
    const votes = votesObj || {};

    const list = Object.entries(voters).map(([token, v]) => ({
      name: v.name,
      token,
      voted: !!votes[token],
      votedAt: votes[token]?.at || null,
      link: `/v/${token}`,
    }));

    return send(res, 200, { deadline: cfg.deadline, voters: list });
  }

  if (req.method === 'POST') {
    const { names } = parseBody(req);
    if (!Array.isArray(names) || !names.length) {
      return send(res, 400, { error: 'Sin nombres' });
    }

    const existing = (await redis.hgetall(KEYS.voters)) || {};
    const existingNames = new Set(
      Object.values(existing).map(v => v.name.toLowerCase())
    );

    const created = [];
    for (const raw of names) {
      const name = String(raw).trim();
      if (!name || existingNames.has(name.toLowerCase())) continue;
      const token = crypto.randomBytes(9).toString('base64url');
      await redis.hset(KEYS.voters, token, { name, token });
      existingNames.add(name.toLowerCase());
      created.push({ name, token, link: `/v/${token}` });
    }

    const total = await redis.hlen(KEYS.voters);
    return send(res, 200, { created, total });
  }

  send(res, 405, { error: 'Method not allowed' });
});

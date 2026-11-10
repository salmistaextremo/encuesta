import {
  redis, KEYS, getConfig, getSongs, send,
  checkAuth, withErrorHandler,
} from './_lib.js';

export default withErrorHandler(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

  const [cfg, songs, votesObj, totalVoters] = await Promise.all([
    getConfig(),
    getSongs(),
    redis.hgetall(KEYS.votes),
    redis.hlen(KEYS.voters),
  ]);

  const deadline = new Date(cfg.deadline);
  const beforeDeadline = new Date() < deadline;

  if (beforeDeadline) {
    // Solo admins con ?force=1 pueden previsualizar
    if (req.query.force !== '1') {
      return send(res, 403, { error: 'Resultados no disponibles aún', deadline: cfg.deadline });
    }
    if (!(await checkAuth(req, res))) return;
  }

  const tally = new Map(songs.map(s => [s.id, 0]));
  const votes = votesObj || {};
  for (const v of Object.values(votes)) {
    v.songIds.forEach(id => {
      if (tally.has(id)) tally.set(id, tally.get(id) + 1);
    });
  }

  const results = songs
    .map(s => ({ ...s, votes: tally.get(s.id) }))
    .sort((a, b) => b.votes - a.votes || a.id - b.id)
    .slice(0, 50);

  send(res, 200, {
    results,
    totalVoters,
    totalVotes: Object.keys(votes).length,
    deadline: cfg.deadline,
  });
});
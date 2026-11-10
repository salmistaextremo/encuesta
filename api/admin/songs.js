import { redis, KEYS, send, checkAuth, parseBody, withErrorHandler } from '../_lib.js';

export default withErrorHandler(async (req, res) => {
  if (!(await checkAuth(req, res))) return;

  if (req.method === 'GET') {
    let songs = await redis.get(KEYS.songs);
    if (typeof songs === 'string') {
      try { songs = JSON.parse(songs); } catch (e) {}
    }
    return send(res, 200, { songs: songs || [] });
  }

  if (req.method === 'POST') {
    const { songs } = parseBody(req);
    if (!Array.isArray(songs) || !songs.length) {
      return send(res, 400, { error: 'Lista inválida o vacía' });
    }

    // Les asignamos un ID del 1 al 100 automáticamente
    const formattedSongs = songs.map((s, i) => ({
      id: i + 1,
      title: s.title,
      artist: s.artist
    }));

    await redis.set(KEYS.songs, formattedSongs);
    return send(res, 200, { ok: true, count: formattedSongs.length });
  }

  send(res, 405, { error: 'Method not allowed' });
});

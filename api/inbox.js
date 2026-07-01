// /api/inbox — admin inbox. Password via "x-admin-password" header.
//   GET  -> { count, unread, messages }
//   POST -> { action: 'read' | 'unread' | 'delete', id }
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  const provided = req.headers['x-admin-password'] || '';
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    res.status(500).json({ error: 'Admin password is not configured on the server.' });
    return;
  }
  if (provided !== expected) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const { action, id } = body || {};
      if (!id) { res.status(400).json({ error: 'Missing id' }); return; }

      if (action === 'delete') await store.remove(id);
      else if (action === 'read') await store.setRead(id, true);
      else if (action === 'unread') await store.setRead(id, false);
      else { res.status(400).json({ error: 'Unknown action' }); return; }

      res.status(200).json({ ok: true });
      return;
    }

    const messages = await store.list();
    const unread = messages.filter((m) => !m.read).length;
    res.status(200).json({ count: messages.length, unread, messages });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};

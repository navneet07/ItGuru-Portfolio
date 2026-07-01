// POST /api/contact — receives a contact-form submission and stores it.
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { name, email, subject, message } = body || {};

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Please fill in your name, email, and message.' });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    subject: String(subject || '').slice(0, 300),
    message: String(message).slice(0, 5000),
    ts: Date.now(),
    read: false
  };

  try {
    await store.add(entry);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Could not save your message. Please email me directly.' });
  }
};

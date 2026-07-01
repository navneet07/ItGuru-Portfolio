// GET /api/inbox-status — PUBLIC. Returns only counts (no message content),
// so the login button can show a notification dot without exposing inquiries.
const store = require('../lib/store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const items = await store.list();
    const total = items.length;
    const unread = items.filter(function (m) { return !m.read; }).length;
    res.status(200).json({ total: total, unread: unread });
  } catch (e) {
    // fail safe: pretend empty so the dot just shows the red teaser
    res.status(200).json({ total: 0, unread: 0 });
  }
};

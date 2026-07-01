// Shared storage layer for portfolio inquiries.
// Uses Upstash Redis (REST) in production; falls back to a local /tmp file
// for `vercel dev` so the backend works without the cloud DB configured.

const KEY = 'inquiries';
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useCloud = !!(URL && TOKEN);

async function redis(cmd) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

const fs = require('fs');
const FILE = '/tmp/inquiries.json';
function fileRead() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
function fileWrite(o) { fs.writeFileSync(FILE, JSON.stringify(o)); }

module.exports = {
  async add(entry) {
    if (useCloud) await redis(['HSET', KEY, entry.id, JSON.stringify(entry)]);
    else { const o = fileRead(); o[entry.id] = entry; fileWrite(o); }
  },

  async list() {
    let items;
    if (useCloud) {
      const flat = (await redis(['HGETALL', KEY])) || [];
      items = [];
      for (let i = 1; i < flat.length; i += 2) {
        try { items.push(JSON.parse(flat[i])); } catch {}
      }
    } else {
      items = Object.values(fileRead());
    }
    return items.sort((a, b) => b.ts - a.ts); // newest first
  },

  async setRead(id, read) {
    if (useCloud) {
      const v = await redis(['HGET', KEY, id]);
      if (!v) return;
      const e = JSON.parse(v);
      e.read = read;
      await redis(['HSET', KEY, id, JSON.stringify(e)]);
    } else {
      const o = fileRead();
      if (o[id]) { o[id].read = read; fileWrite(o); }
    }
  },

  async remove(id) {
    if (useCloud) await redis(['HDEL', KEY, id]);
    else { const o = fileRead(); delete o[id]; fileWrite(o); }
  }
};

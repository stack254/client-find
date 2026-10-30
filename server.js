import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { discover } from './discovery.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(root, 'data', 'prospects.json');
let prospects;
try { prospects = JSON.parse(await readFile(dataPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; prospects = []; }
let pending = Promise.resolve();
const statuses = ['New', 'Contacted', 'Interested', 'Won', 'Lost'];
const services = ['Website development', 'Online store', 'Digital marketing', 'RetailHub POS', 'OnePOS+', 'Custom software'];
async function save() {
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, JSON.stringify(prospects, null, 2));
}
function json(res, code, body) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/discovery/status' && req.method === 'GET') return json(res, 200, { configured: Boolean(process.env.GOOGLE_MAPS_API_KEY) });
    if (url.pathname === '/api/discover' && req.method === 'GET') {
      if (!process.env.GOOGLE_MAPS_API_KEY) return json(res, 503, { error: 'Add GOOGLE_MAPS_API_KEY securely in environment settings, enable Places API (New) and billing, then restart the app.' });
      const location = (url.searchParams.get('location') || '').trim();
      const category = (url.searchParams.get('category') || '').trim();
      if (!location || !category || location.length > 150 || category.length > 150) return json(res, 400, { error: 'Enter a location and business type (up to 150 characters each).' });
      try { return json(res, 200, await discover({ location, category, apiKey: process.env.GOOGLE_MAPS_API_KEY })); }
      catch (error) { return json(res, 502, { error: error.name === 'TimeoutError' ? 'Search timed out. Try again.' : error.message }); }
    }
    if (url.pathname === '/api/prospects' && req.method === 'GET') return json(res, 200, prospects);
    if (url.pathname === '/api/prospects' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 100000) return json(res, 413, { error: 'Request too large' }); }
      let input;
      try { input = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      if (!input || typeof input !== 'object') return json(res, 400, { error: 'Invalid prospect' });
      const record = {};
      for (const field of ['name', 'location', 'contact', 'website', 'need', 'notes', 'service', 'status']) record[field] = String(input[field] ?? '').trim().slice(0, 4000);
      if (!record.name || !services.includes(record.service) || !statuses.includes(record.status)) return json(res, 400, { error: 'Business name, valid service and status are required' });
      const existing = input.id ? prospects.find(p => p.id === input.id) : null;
      if (input.id && !existing) return json(res, 404, { error: 'Prospect not found' });
      record.id = existing?.id ?? randomUUID();
      record.createdAt = existing?.createdAt ?? new Date().toISOString();
      record.updatedAt = new Date().toISOString();
      pending = pending.catch(() => {}).then(async () => {
        const next = existing ? prospects.map(p => p.id === record.id ? record : p) : [record, ...prospects];
        const previous = prospects; prospects = next;
        try { await save(); } catch (error) { prospects = previous; throw error; }
      });
      await pending;
      return json(res, 200, record);
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
    const file = files[url.pathname];
    if (!file) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8' });
    res.end(await readFile(path.join(root, 'public', file[0])));
  } catch (error) { console.error(error.message); if (!res.headersSent) json(res, 500, { error: 'Unable to complete request' }); else res.end(); }
}).listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Client Find listening on ' + (process.env.HOST || '127.0.0.1') + ':' + (process.env.PORT || 3000)));

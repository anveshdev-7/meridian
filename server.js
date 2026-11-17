// Zero-dependency backend (Node 18+). The API key stays here and never reaches the browser.
const http = require('http'), fs = require('fs'), path = require('path');

try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const KEY = process.env.GROQ_API_KEY, PORT = process.env.PORT || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!KEY) return json(res, 500, { error: 'Server is missing GROQ_API_KEY.' });
    let body = '';
    for await (const c of req) { body += c; if (body.length > 1e6) return json(res, 413, { error: 'Request too large.' }); }
    let p; try { p = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid request.' }); }
    const messages = (Array.isArray(p.messages) ? p.messages : [])
      .filter(m => ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content }));
    if (!messages.length) return json(res, 400, { error: 'No messages provided.' });
    const ac = new AbortController();
    res.on('close', () => ac.abort());
    try {
      const up = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: ac.signal,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
        body: JSON.stringify({
          model: String(p.model || 'openai/gpt-oss-120b'),
          temperature: Math.min(2, Math.max(0, Number(p.temperature ?? 0.7))),
          messages, stream: true
        })
      });
      if (!up.ok) {
        const e = await up.json().catch(() => ({}));
        return json(res, up.status, { error: e.error?.message || 'Upstream error ' + up.status });
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      for await (const chunk of up.body) res.write(chunk);
      res.end();
    } catch (e) { if (!res.headersSent) json(res, 502, { error: 'Could not reach the model provider.' }); else res.end(); }
    return;
  }
  const file = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'public'))) return json(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(PORT, () => console.log('Meridian running at http://localhost:' + PORT));

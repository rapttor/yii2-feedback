// Tiny static server + feedback endpoint for the examples. No dependencies: node examples/serve.mjs  ->  http://localhost:8099/examples/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(import.meta.url), '..', '..'));   // the package folder
const port = Number(process.env.PORT || 8099);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.vue': 'text/plain' };
const received = [];

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/feedback' && req.method === 'POST') {          // what your server would store
    let body = '';
    for await (const chunk of req) { body += chunk; }
    try { received.push(JSON.parse(body)); } catch { res.writeHead(400).end('{"ok":false,"code":"generic"}'); return; }
    console.log('feedback #' + received.length, JSON.stringify(received.at(-1)).slice(0, 300));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    return;
  }
  if (url.pathname === '/api/received') { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(received)); return; }
  const file = normalize(join(root, decodeURIComponent(url.pathname === '/' ? '/examples/index.html' : url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  let data;
  try { data = await readFile(file); } catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(data);
}).listen(port, () => console.log('examples on http://localhost:' + port + '/examples/'));

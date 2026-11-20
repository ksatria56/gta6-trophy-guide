// A tiny static server for app/ (Node 22, standard library only), so the guide can be
// run locally without a build step: `node serve.ts` serves app/ on http://localhost:8080
// (`--port <n>` for another port). It sends the MIME types a browser needs, refuses any
// path outside app/, and otherwise does nothing clever: a development convenience,
// not a web server for the internet.
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  // Round 6: a read-only plan endpoint — the same hours table the Time to
  // platinum page reads, summed per region, so another tool can quote the
  // plan without opening the page. Static files are served below, unchanged.
  if (pathname === '/plan.json') {
    try {
      const doc = JSON.parse(readFileSync(join(root, 'data', 'trophies.json'), 'utf8'));
      const byRegion = {};
      let totalHours = 0;
      for (const trophy of doc.trophies) {
        const row = doc.estimates?.[trophy.id];
        if (!row) continue;
        totalHours += row.h;
        byRegion[row.r] = (byRegion[row.r] ?? 0) + row.h;
      }
      const payload = JSON.stringify({ totalHours, regions: byRegion, trophies: doc.trophies.length });
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
      response.end(payload);
    } catch {
      response.writeHead(500).end('plan unavailable');
    }
    return;
  }
  // Round 6 (part 2): a health endpoint beside the plan endpoint — a load
  // balancer or a smoke test can ask whether the guide is up without
  // fetching the whole page. Static files are served below, unchanged.
  if (pathname === '/health') {
    const payload = JSON.stringify({ ok: true, app: 'leonida-ledger', trophies: 55 });
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
    response.end(payload);
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  // No referrer is sent for local files: the guide is offline, and its pages
  // link out only from the colophon.
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const CLAIMS_FILE = path.join(DATA_DIR, 'claims.json');

const prizes = [
  { label: 'HAIR CLIP + 5%', title: 'Hair Clip + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'CLIP5', weight: 500 },
  { label: 'KEYCHAIN + 5%', title: 'Keychain + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'KEY5', weight: 200 },
  { label: 'HAIRBAND + 5%', title: 'Hairband + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'BAND5', weight: 100 },
  { label: 'KERCHIEF + 5%', title: 'Kerchief + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'KERCHIEF5', weight: 100 },
  { label: 'PET JAR + 5%', title: 'Pet Jar + 5% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'JAR5', weight: 100 },
  { label: 'TOWEL + 10%', title: 'Towel + 10% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL10', weight: 10 },
  { label: 'TOWEL + 20%', title: 'Towel + 20% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL20', weight: 5 },
  { label: 'TOWEL + 50%', title: 'Towel + 50% Off', detail: 'Valid on an eligible purchase from ₹1,000 to ₹5,000', code: 'TOWEL50', weight: 1 }
];

const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CLAIMS_FILE)) fs.writeFileSync(CLAIMS_FILE, '{}');

let writeQueue = Promise.resolve();

function readClaims() {
  try { return JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveClaims(claims) {
  const temporary = `${CLAIMS_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(claims, null, 2));
  fs.renameSync(temporary, CLAIMS_FILE);
}

function normalizePhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function selectPrize() {
  let roll = crypto.randomInt(0, totalWeight);
  for (let index = 0; index < prizes.length; index += 1) {
    roll -= prizes[index].weight;
    if (roll < 0) return index;
  }
  return 0;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });

  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': `${types[ext] || 'application/octet-stream'}; charset=utf-8` });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/spin') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10_000) req.destroy();
    });
    req.on('end', () => {
      writeQueue = writeQueue.then(() => {
        let payload;
        try { payload = JSON.parse(body); }
        catch { return sendJson(res, 400, { error: 'Invalid request.' }); }

        const phone = normalizePhone(payload.mobile);
        if (!/^[6-9]\d{9}$/.test(phone)) {
          return sendJson(res, 400, { error: 'Enter a valid 10-digit Indian mobile number.' });
        }

        const claims = readClaims();
        if (claims[phone]) {
          return sendJson(res, 409, { error: 'This mobile number has already used its spin.', claimedAt: claims[phone].claimedAt });
        }

        const prizeIndex = selectPrize();
        const prize = prizes[prizeIndex];
        claims[phone] = { prizeIndex, code: prize.code, claimedAt: new Date().toISOString() };
        saveClaims(claims);
        return sendJson(res, 200, { prizeIndex, prize: { title: prize.title, detail: prize.detail, code: prize.code } });
      }).catch(error => {
        console.error(error);
        if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
      });
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/prizes') {
    return sendJson(res, 200, prizes.map(({ label, weight }) => ({
      label,
      weight,
      probability: `${((weight / totalWeight) * 100).toFixed(2)}%`
    })));
  }

  if (req.method === 'GET') return serveStatic(req, res);
  return sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => console.log(`Spin & Win is ready at http://localhost:${PORT}`));

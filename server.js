const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const messagesPath = path.join(root, 'messages.json');
const port = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

function send(response, status, body, type = 'application/json') {
  response.writeHead(status, { 
    'Content-Type': type, 
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': type.startsWith('image/') ? 'public, max-age=86400' : 'no-cache'
  });
  response.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', chunk => { 
      chunks.push(chunk); 
      if (chunks.reduce((acc, c) => acc + c.length, 0) > 1000000) reject(new Error('Request too large')); 
    });
    request.on('end', () => { 
      try { 
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          const params = new URLSearchParams(raw);
          const obj = {};
          for (const [k, v] of params.entries()) obj[k] = v;
          resolve(obj);
        }
      } catch (error) { 
        reject(error); 
      } 
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, '');

  const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  if (request.method === 'POST' && pathname === '/api/contact') {
    try {
      const data = await readBody(request);
      if (!data.name || !data.email || !data.message) {
        return send(response, 400, { error: 'Name, email and message are required.' });
      }
      const messages = fs.existsSync(messagesPath) ? JSON.parse(fs.readFileSync(messagesPath, 'utf8')) : [];
      const newMsg = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: String(data.name).trim().slice(0, 100),
        email: String(data.email).trim().slice(0, 200),
        subject: String(data.subject || 'Portfolio Inquiry').trim().slice(0, 200),
        message: String(data.message).trim().slice(0, 2000),
        createdAt: new Date().toISOString()
      };
      messages.unshift(newMsg);
      fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
      return send(response, 201, { ok: true, message: 'Message received! I will respond promptly.' });
    } catch (error) { 
      return send(response, 400, { error: 'Invalid request body.' }); 
    }
  }

  if (request.method === 'GET' && pathname === '/api/messages') {
    const messages = fs.existsSync(messagesPath) ? JSON.parse(fs.readFileSync(messagesPath, 'utf8')) : [];
    return send(response, 200, { count: messages.length, messages });
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    if (pathname === '/') pathname = '/index.html';
    
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(root, safePath);

    if (filePath.startsWith(root) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const fileContent = fs.readFileSync(filePath);
      return send(response, 200, fileContent, mime);
    }
  }

  send(response, 404, { error: 'Not found' });
});

server.listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));


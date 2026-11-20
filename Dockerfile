# Multi-stage Dockerfile for ReleaseHub Calendar
# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code and config files
COPY . .

# Build the production bundle
RUN npm run build

# Stage 2: Serve static bundle + persistent JSON API (/api/storage) + ServiceNow Proxy on port 80
FROM node:22-alpine

WORKDIR /app

# Create persistent data directory
RUN mkdir -p /app/data

# Copy compiled static files from builder stage
COPY --from=builder /app/dist /app/dist

# Create zero-dependency Node server for SPA routing, /api/storage disk persistence, and /api/servicenow proxy
RUN cat <<'EOF' > /app/docker-server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 80;
const DIST_DIR = '/app/dist';
const DATA_FILE = '/app/data/releasehub-db.json';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function fetchSnowTable(instanceUrl, authHeader, table, queryParams) {
  const url = new URL(`${instanceUrl}/api/now/table/${table}`);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ServiceNow API respondió HTTP ${response.status}: ${errText.slice(0, 260)}`);
  }
  const json = await response.json();
  return json.result || [];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Persistent storage API for Docker container
  if (url.pathname === '/api/storage') {
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(raw);
          return;
        }
      } catch (e) {
        console.error('Error reading data file:', e);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ empty: true }));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, body, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Error writing data file:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }
  }

  // ServiceNow server env status
  if (url.pathname === '/api/servicenow/status' && req.method === 'GET') {
    const envUrl = process.env.SNOW_INSTANCE_URL || '';
    const envUser = process.env.SNOW_USERNAME || '';
    const hasPass = Boolean(process.env.SNOW_PASSWORD || process.env.SNOW_BEARER_TOKEN);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        configuredOnServer: Boolean(envUrl && (envUser || process.env.SNOW_BEARER_TOKEN) && hasPass),
        instanceUrl: envUrl,
        username: envUser
      })
    );
    return;
  }

  // ServiceNow API proxy
  if (url.pathname === '/api/servicenow/scan' && req.method === 'POST') {
    try {
      const rawBody = await readBody(req);
      const body = JSON.parse(rawBody || '{}');
      const instanceUrl = (body.instanceUrl || process.env.SNOW_INSTANCE_URL || '').trim().replace(/\/+$/, '');
      if (!instanceUrl) throw new Error('Falta la URL de instancia de ServiceNow.');

      const token = (body.bearerToken || process.env.SNOW_BEARER_TOKEN || '').trim();
      const user = (body.username || process.env.SNOW_USERNAME || '').trim();
      const pass = (body.password || process.env.SNOW_PASSWORD || '').trim();

      let authHeader = '';
      if (body.authMode === 'bearer' || (token && !user)) {
        if (!token) throw new Error('Falta el Token Bearer de ServiceNow.');
        authHeader = `Bearer ${token}`;
      } else {
        if (!user || !pass) throw new Error('Ingresa Usuario y Contraseña de tu cuenta API de ServiceNow.');
        authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
      }

      if (body.mode === 'test') {
        const result = await fetchSnowTable(instanceUrl, authHeader, 'change_request', {
          sysparm_limit: '1',
          sysparm_fields: 'sys_id,number,short_description'
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: `Conexión exitosa con ${instanceUrl} (${result.length} muestra).` }));
        return;
      }

      if (body.mode === 'number') {
        const num = (body.changeNumber || '').trim().toUpperCase();
        if (!num) throw new Error('Ingresa un número de cambio (ej. CHG0030001).');
        const changes = await fetchSnowTable(instanceUrl, authHeader, 'change_request', {
          sysparm_query: `number=${num}`,
          sysparm_display_value: 'all',
          sysparm_limit: '1'
        });
        if (!changes.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `No se encontró el cambio ${num} en ServiceNow.` }));
          return;
        }
        const changeSysId = changes[0]?.sys_id?.value || changes[0]?.sys_id || '';
        let tasks = [];
        try {
          if (changeSysId) {
            tasks = await fetchSnowTable(instanceUrl, authHeader, 'change_task', {
              sysparm_query: `change_request=${changeSysId}^ORDERBYorder`,
              sysparm_display_value: 'all',
              sysparm_limit: '50'
            });
          }
        } catch {}
        let assigneeEmail = '';
        const assigneeSysId = changes[0]?.assigned_to?.value || '';
        if (assigneeSysId) {
          try {
            const users = await fetchSnowTable(instanceUrl, authHeader, 'sys_user', {
              sysparm_query: `sys_id=${assigneeSysId}`,
              sysparm_fields: 'name,email',
              sysparm_limit: '1'
            });
            if (users[0]?.email) assigneeEmail = users[0].email;
          } catch {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, changes: [{ ...changes[0], _tasks: tasks, _assigneeEmail: assigneeEmail }] }));
        return;
      }

      const queryParts = [];
      if (body.startDate) queryParts.push(`start_date>=${body.startDate} 00:00:00`);
      if (body.endDate) queryParts.push(`start_date<=${body.endDate} 23:59:59`);
      if (body.stateFilter && body.stateFilter !== 'all') queryParts.push(`state=${body.stateFilter}`);
      if (body.assignmentGroup && body.assignmentGroup.trim()) queryParts.push(`assignment_group.nameLIKE${body.assignmentGroup.trim()}`);
      if (body.searchQuery && body.searchQuery.trim()) {
        const q = body.searchQuery.trim();
        queryParts.push(`short_descriptionLIKE${q}^ORnumberLIKE${q}^ORcmdb_ci.nameLIKE${q}`);
      }
      queryParts.push('ORDERBYstart_date');

      const changes = await fetchSnowTable(instanceUrl, authHeader, 'change_request', {
        sysparm_query: queryParts.join('^'),
        sysparm_display_value: 'all',
        sysparm_limit: '30'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, changes }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err?.message || 'Error al consultar ServiceNow.' }));
    }
    return;
  }

  // Serve static files or SPA fallback
  let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ReleaseHub Docker Server running on port ${PORT}`);
});
EOF

EXPOSE 80

CMD ["node", "/app/docker-server.mjs"]

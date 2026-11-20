import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(process.cwd(), 'data', 'releasehub-db.json');

interface SnowRequestBody {
  instanceUrl?: string;
  username?: string;
  password?: string;
  bearerToken?: string;
  authMode?: 'basic' | 'bearer';
  mode: 'test' | 'number' | 'range';
  changeNumber?: string;
  startDate?: string;
  endDate?: string;
  stateFilter?: string;
  assignmentGroup?: string;
  searchQuery?: string;
}

function buildSnowAuthHeader(body: SnowRequestBody): {
  instanceUrl: string;
  authHeader: string;
} {
  const rawUrl = (body.instanceUrl || process.env.SNOW_INSTANCE_URL || '').trim().replace(/\/+$/, '');
  if (!rawUrl) {
    throw new Error('Falta la URL de instancia de ServiceNow (ej. https://tuempresa.service-now.com).');
  }

  const token = (body.bearerToken || process.env.SNOW_BEARER_TOKEN || '').trim();
  const user = (body.username || process.env.SNOW_USERNAME || '').trim();
  const pass = (body.password || process.env.SNOW_PASSWORD || '').trim();

  if (body.authMode === 'bearer' || (token && !user)) {
    if (!token) throw new Error('Falta el Token Bearer de ServiceNow.');
    return { instanceUrl: rawUrl, authHeader: `Bearer ${token}` };
  }

  if (!user || !pass) {
    throw new Error('Ingresa el Usuario y Contraseña de tu cuenta API de ServiceNow.');
  }

  const encoded = Buffer.from(`${user}:${pass}`).toString('base64');
  return { instanceUrl: rawUrl, authHeader: `Basic ${encoded}` };
}

async function fetchSnowTable(
  instanceUrl: string,
  authHeader: string,
  table: string,
  queryParams: Record<string, string>
) {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, status: 'healthy' });
  });

  // Persistent JSON storage endpoint (shared across local dev and Docker)
  app.get('/api/storage', (_req, res) => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.send(raw);
        return;
      }
    } catch (e) {
      console.error('Error reading storage:', e);
    }
    res.json({ empty: true });
  });

  app.post('/api/storage', (req, res) => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(req.body), 'utf-8');
      res.json({ ok: true });
    } catch (e) {
      console.error('Error writing storage:', e);
      res.status(500).json({ ok: false });
    }
  });

  // Check if server-side ServiceNow env credentials are configured
  app.get('/api/servicenow/status', (_req, res) => {
    const envUrl = process.env.SNOW_INSTANCE_URL || '';
    const envUser = process.env.SNOW_USERNAME || '';
    const hasPass = Boolean(process.env.SNOW_PASSWORD || process.env.SNOW_BEARER_TOKEN);
    res.json({
      configuredOnServer: Boolean(envUrl && (envUser || process.env.SNOW_BEARER_TOKEN) && hasPass),
      instanceUrl: envUrl,
      username: envUser
    });
  });

  // ServiceNow Table API proxy (prevents browser CORS errors)
  app.post('/api/servicenow/scan', async (req, res) => {
    try {
      const body = (req.body || {}) as SnowRequestBody;
      const { instanceUrl, authHeader } = buildSnowAuthHeader(body);

      if (body.mode === 'test') {
        const result = await fetchSnowTable(instanceUrl, authHeader, 'change_request', {
          sysparm_limit: '1',
          sysparm_fields: 'sys_id,number,short_description'
        });
        res.json({
          ok: true,
          message: `Conexión exitosa con ${instanceUrl}. Registros accesibles (${result.length} muestra).`
        });
        return;
      }

      if (body.mode === 'number') {
        const num = (body.changeNumber || '').trim().toUpperCase();
        if (!num) {
          res.status(400).json({ ok: false, error: 'Ingresa un número de cambio (ej. CHG0030001).' });
          return;
        }

        const changes = await fetchSnowTable(instanceUrl, authHeader, 'change_request', {
          sysparm_query: `number=${num}`,
          sysparm_display_value: 'all',
          sysparm_limit: '1'
        });

        if (!changes || changes.length === 0) {
          res.status(404).json({ ok: false, error: `No se encontró el cambio ${num} en ServiceNow.` });
          return;
        }

        const changeSysId = changes[0]?.sys_id?.value || changes[0]?.sys_id || '';
        let tasks: any[] = [];
        try {
          if (changeSysId) {
            tasks = await fetchSnowTable(instanceUrl, authHeader, 'change_task', {
              sysparm_query: `change_request=${changeSysId}^ORDERBYorder`,
              sysparm_display_value: 'all',
              sysparm_limit: '50'
            });
          }
        } catch {
          // change_task might be restricted for some API roles; continue gracefully
        }

        // Resolve assigned_to email if sys_id is present
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
          } catch {
            // ignore if sys_user read is restricted
          }
        }

        res.json({
          ok: true,
          changes: [{ ...changes[0], _tasks: tasks, _assigneeEmail: assigneeEmail }]
        });
        return;
      }

      // Range & filter scan
      const queryParts: string[] = [];
      if (body.startDate) {
        queryParts.push(`start_date>=${body.startDate} 00:00:00`);
      }
      if (body.endDate) {
        queryParts.push(`start_date<=${body.endDate} 23:59:59`);
      }
      if (body.stateFilter && body.stateFilter !== 'all') {
        queryParts.push(`state=${body.stateFilter}`);
      }
      if (body.assignmentGroup && body.assignmentGroup.trim()) {
        queryParts.push(`assignment_group.nameLIKE${body.assignmentGroup.trim()}`);
      }
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

      res.json({
        ok: true,
        changes
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message || 'Error al consultar la API de ServiceNow.'
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReleaseHub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import {
  ReleaseEvent,
  ReleasePhase,
  Environment,
  RiskLevel,
  CABStatus,
  ChecklistItem,
  TeamMember,
  PHASE_CONFIG
} from '../types/release';
import {
  mapStatusToPhase,
  mapEnvironment,
  mapAssignmentGroupToRole
} from './importService';
import { parseFlexibleDate } from '../utils/dateUtils';

export interface ServiceNowConfig {
  instanceUrl: string;
  username: string;
  password?: string;
  bearerToken?: string;
  authMode: 'basic' | 'bearer';
}

export interface SnowFieldTrace {
  snowColumn: string;
  rawValue: string;
}

export interface ScannedSnowChange {
  number: string;
  shortDescription: string;
  state: string;
  type: string;
  category: string;
  subcategory: string;
  environmentRaw: string;
  cmdbCi: string;
  startDate: string;
  endDate: string;
  assignedToName: string;
  assignedToEmail: string;
  assignmentGroup: string;
  openedByName: string;
  riskRaw: string;
  approvalRaw: string;
  backoutPlan: string;
  implementationPlan: string;
  description: string;
  folio: string;
  tasks: {
    number: string;
    shortDescription: string;
    state: string;
    assignedTo: string;
    assignmentGroup: string;
    closed: boolean;
  }[];
  rawRecord: any;
}

export interface MappedSnowFormData {
  title: string;
  service: string;
  releaseTag: string;
  changeTicketId: string;
  environment: Environment;
  phase: ReleasePhase;
  risk: RiskLevel;
  cabStatus: CABStatus;
  startTimeIso: string;
  endTimeIso: string;
  color: string;
  rollbackPlan: string;
  notes: string;
  ownerName: string;
  ownerEmail: string;
  involvedMembers: TeamMember[];
  checklist: ChecklistItem[];
  fieldTraces: Record<string, SnowFieldTrace>;
}

const STORAGE_KEY = 'releasehub_snow_config_v1';

export const loadSavedSnowConfig = (): ServiceNowConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        instanceUrl: parsed.instanceUrl || '',
        username: parsed.username || '',
        authMode: parsed.authMode === 'bearer' ? 'bearer' : 'basic'
      };
    }
  } catch {
    // ignore
  }
  return { instanceUrl: '', username: '', authMode: 'basic' };
};

export const saveSnowConfigMetadata = (cfg: ServiceNowConfig) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        instanceUrl: cfg.instanceUrl.trim().replace(/\/+$/, ''),
        username: cfg.username.trim(),
        authMode: cfg.authMode
      })
    );
  } catch {
    // ignore
  }
};

export const checkServerSnowStatus = async (): Promise<{
  proxyAvailable: boolean;
  configuredOnServer: boolean;
  instanceUrl?: string;
  username?: string;
}> => {
  try {
    const res = await fetch('/api/servicenow/status');
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      return { proxyAvailable: false, configuredOnServer: false };
    }
    const data = await res.json();
    return {
      proxyAvailable: true,
      configuredOnServer: Boolean(data.configuredOnServer),
      instanceUrl: data.instanceUrl || '',
      username: data.username || ''
    };
  } catch {
    return { proxyAvailable: false, configuredOnServer: false };
  }
};

function readDisplay(field: any): string {
  if (field === null || field === undefined) return '';
  if (typeof field === 'object') {
    return String(field.display_value ?? field.value ?? '').trim();
  }
  return String(field).trim();
}

export const parseRawSnowRecord = (rec: any): ScannedSnowChange => {
  const rawTasks = Array.isArray(rec._tasks) ? rec._tasks : [];
  const tasks = rawTasks.map((t: any) => {
    const stateText = readDisplay(t.state).toLowerCase();
    return {
      number: readDisplay(t.number),
      shortDescription: readDisplay(t.short_description) || 'Tarea de cambio ServiceNow',
      state: readDisplay(t.state),
      assignedTo: readDisplay(t.assigned_to),
      assignmentGroup: readDisplay(t.assignment_group),
      closed:
        stateText.includes('closed') ||
        stateText.includes('cerrad') ||
        stateText.includes('complete') ||
        stateText.includes('3')
    };
  });

  return {
    number: readDisplay(rec.number),
    shortDescription: readDisplay(rec.short_description),
    state: readDisplay(rec.state),
    type: readDisplay(rec.type) || 'Normal',
    category: readDisplay(rec.category),
    subcategory: readDisplay(rec.u_subcategory || rec.subcategory),
    environmentRaw: readDisplay(rec.u_environment || rec.environment || rec.u_ambiente),
    cmdbCi: readDisplay(rec.cmdb_ci),
    startDate: readDisplay(rec.start_date || rec.work_start),
    endDate: readDisplay(rec.end_date || rec.work_end),
    assignedToName: readDisplay(rec.assigned_to),
    assignedToEmail: rec._assigneeEmail || '',
    assignmentGroup: readDisplay(rec.assignment_group),
    openedByName: readDisplay(rec.opened_by || rec.requested_by),
    riskRaw: readDisplay(rec.risk),
    approvalRaw: readDisplay(rec.approval),
    backoutPlan: readDisplay(rec.backout_plan),
    implementationPlan: readDisplay(rec.implementation_plan),
    description: readDisplay(rec.description),
    folio: readDisplay(rec.u_folio || rec.correlation_id || rec.number),
    tasks,
    rawRecord: rec
  };
};

async function callSnowProxyOrDirect(payload: Record<string, any>): Promise<any> {
  // Try backend/Docker proxy first (avoids CORS in local server & Docker container)
  try {
    const proxyRes = await fetch('/api/servicenow/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const ct = proxyRes.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await proxyRes.json();
      if (!proxyRes.ok || !data.ok) {
        throw new Error(data.error || `Error ServiceNow (${proxyRes.status})`);
      }
      return data;
    }
  } catch (err: any) {
    // If proxy returned a specific ServiceNow error, rethrow it
    if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('JSON')) {
      throw err;
    }
  }

  // Fallback for static hosting (e.g., GitHub Pages) - requires CORS enabled on ServiceNow instance
  const instanceUrl = (payload.instanceUrl || '').trim().replace(/\/+$/, '');
  if (!instanceUrl) {
    throw new Error('Ingresa la URL de instancia de ServiceNow (ej. https://tuempresa.service-now.com).');
  }

  let authHeader = '';
  if (payload.authMode === 'bearer' && payload.bearerToken) {
    authHeader = `Bearer ${payload.bearerToken.trim()}`;
  } else if (payload.username && payload.password) {
    authHeader = `Basic ${btoa(`${payload.username}:${payload.password}`)}`;
  } else {
    throw new Error('Ingresa Usuario y Contraseña o Token Bearer de ServiceNow.');
  }

  let query = 'ORDERBYstart_date';
  if (payload.mode === 'number') {
    query = `number=${String(payload.changeNumber || '').trim().toUpperCase()}`;
  } else if (payload.mode === 'range') {
    const parts: string[] = [];
    if (payload.startDate) parts.push(`start_date>=${payload.startDate} 00:00:00`);
    if (payload.endDate) parts.push(`start_date<=${payload.endDate} 23:59:59`);
    if (payload.stateFilter && payload.stateFilter !== 'all') parts.push(`state=${payload.stateFilter}`);
    if (payload.assignmentGroup) parts.push(`assignment_group.nameLIKE${payload.assignmentGroup}`);
    if (payload.searchQuery) parts.push(`short_descriptionLIKE${payload.searchQuery}^ORnumberLIKE${payload.searchQuery}`);
    parts.push('ORDERBYstart_date');
    query = parts.join('^');
  }

  const url = `${instanceUrl}/api/now/table/change_request?sysparm_query=${encodeURIComponent(query)}&sysparm_display_value=all&sysparm_limit=${payload.mode === 'test' ? 1 : 30}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`ServiceNow respondió HTTP ${res.status}. Verifica usuario/permisos.`);
    }
    const json = await res.json();
    if (payload.mode === 'test') {
      return { ok: true, message: `Conexión directa exitosa con ${instanceUrl}.` };
    }
    return { ok: true, changes: json.result || [] };
  } catch (err: any) {
    throw new Error(
      `No se pudo conectar directamente desde el navegador (CORS o red corporativa). Ejecuta ReleaseHub en Contenedor Docker o servidor local para usar el proxy integrado (/api/servicenow/scan). Detalle: ${err?.message || ''}`
    );
  }
}

export const testSnowConnection = async (config: ServiceNowConfig): Promise<string> => {
  const res = await callSnowProxyOrDirect({
    ...config,
    mode: 'test'
  });
  return res.message || 'Conexión exitosa con ServiceNow.';
};

export const scanSnowChangeByNumber = async (
  config: ServiceNowConfig,
  changeNumber: string
): Promise<ScannedSnowChange> => {
  const res = await callSnowProxyOrDirect({
    ...config,
    mode: 'number',
    changeNumber
  });
  const changes = res.changes || [];
  if (!changes.length) {
    throw new Error(`No se encontró el cambio ${changeNumber} en ServiceNow.`);
  }
  return parseRawSnowRecord(changes[0]);
};

export const scanSnowChangesByRange = async (
  config: ServiceNowConfig,
  filters: {
    startDate?: string;
    endDate?: string;
    stateFilter?: string;
    assignmentGroup?: string;
    searchQuery?: string;
  }
): Promise<ScannedSnowChange[]> => {
  const res = await callSnowProxyOrDirect({
    ...config,
    mode: 'range',
    ...filters
  });
  const changes = res.changes || [];
  return changes.map(parseRawSnowRecord);
};

/**
 * Maps a ScannedSnowChange into editable ReleaseModal form fields + per-field origin traces
 */
export const mapScannedChangeToFormData = (change: ScannedSnowChange): MappedSnowFormData => {
  const { phase, cabStatus: mappedCab, risk: mappedRisk } = mapStatusToPhase(change.state, change.type);

  // Refine risk from SNOW `risk` field if present
  let risk: RiskLevel = mappedRisk;
  const rLower = change.riskRaw.toLowerCase();
  if (rLower.includes('high') || rLower.includes('alto') || rLower.includes('1')) risk = 'high';
  else if (rLower.includes('crit') || rLower.includes('muy alto')) risk = 'critical';
  else if (rLower.includes('low') || rLower.includes('bajo') || rLower.includes('4')) risk = 'low';
  else if (rLower.includes('mod') || rLower.includes('med')) risk = 'medium';

  // Refine approval/CAB status
  let cabStatus: CABStatus = mappedCab;
  const aLower = change.approvalRaw.toLowerCase();
  if (aLower.includes('approved') || aLower.includes('aprobado')) cabStatus = 'approved';
  else if (aLower.includes('rejected') || aLower.includes('rechazado')) cabStatus = 'rejected';
  else if (aLower.includes('requested') || aLower.includes('solicitado')) cabStatus = 'pending';

  const environment = mapEnvironment(change.environmentRaw || change.cmdbCi || 'production');

  const parsedStart = parseFlexibleDate(change.startDate, 20) || new Date(new Date().setHours(20, 0, 0, 0));
  let parsedEnd = parseFlexibleDate(change.endDate, 22);
  if (!parsedEnd || parsedEnd.getTime() <= parsedStart.getTime()) {
    parsedEnd = new Date(parsedStart.getTime() + 2 * 60 * 60 * 1000);
  }

  const serviceName =
    [change.cmdbCi, change.category, change.subcategory].filter(Boolean).join(' / ') || 'Servicio Corporativo';

  const roleFromGroup = mapAssignmentGroupToRole(change.assignmentGroup);

  const involvedMembers: TeamMember[] = [];
  if (change.assignedToName) {
    involvedMembers.push({
      id: `mem-snow-1-${Date.now()}`,
      name: change.assignedToName,
      email: change.assignedToEmail || '',
      role: roleFromGroup,
      phase,
      notified: false
    });
  }
  if (change.openedByName && change.openedByName.toLowerCase() !== change.assignedToName.toLowerCase()) {
    involvedMembers.push({
      id: `mem-snow-2-${Date.now()}`,
      name: change.openedByName,
      email: '',
      role: '',
      phase: 'cab-review',
      notified: false
    });
  }

  const checklist: ChecklistItem[] =
    change.tasks.length > 0
      ? change.tasks.map((t, idx) => ({
          id: `chk-snow-${idx}-${Date.now()}`,
          title: `${t.number ? `[${t.number}] ` : ''}${t.shortDescription}`,
          phase: idx === 0 ? 'pre' : idx === change.tasks.length - 1 ? 'post' : 'during',
          completed: t.closed,
          assignedTo: t.assignedTo || t.assignmentGroup || change.assignmentGroup || undefined
        }))
      : [
          {
            id: `chk-snow-def-1`,
            title: `Validar pre-requisitos de ${change.number} (${change.type})`,
            phase: 'pre',
            completed: false,
            assignedTo: change.assignedToName || change.assignmentGroup || undefined
          },
          {
            id: `chk-snow-def-2`,
            title: `Ejecución de implementación en ${environment.toUpperCase()}`,
            phase: 'during',
            completed: false,
            assignedTo: change.assignmentGroup || undefined
          },
          {
            id: `chk-snow-def-3`,
            title: `Pruebas de sanidad post-cambio`,
            phase: 'post',
            completed: false,
            assignedTo: change.openedByName || change.assignedToName || undefined
          }
        ];

  const notesParts = [
    `Escaneado desde ServiceNow (${change.number})`,
    change.type ? `Tipo: ${change.type}` : '',
    change.state ? `Estado SNOW: ${change.state}` : '',
    change.assignmentGroup ? `Grupo de asignación: ${change.assignmentGroup}` : '',
    change.description ? `\nDescripción:\n${change.description}` : '',
    change.implementationPlan ? `\nPlan de implementación:\n${change.implementationPlan}` : ''
  ].filter(Boolean);

  const fieldTraces: Record<string, SnowFieldTrace> = {
    title: { snowColumn: 'short_description', rawValue: change.shortDescription },
    service: { snowColumn: change.cmdbCi ? 'cmdb_ci / category' : 'category', rawValue: serviceName },
    releaseTag: { snowColumn: change.folio !== change.number ? 'u_folio' : 'number', rawValue: change.folio || change.number },
    changeTicketId: { snowColumn: 'number', rawValue: change.number },
    environment: { snowColumn: 'environment', rawValue: change.environmentRaw || environment },
    phase: { snowColumn: 'state', rawValue: change.state || phase },
    startTime: { snowColumn: 'start_date', rawValue: change.startDate || parsedStart.toLocaleString() },
    endTime: { snowColumn: 'end_date', rawValue: change.endDate || parsedEnd.toLocaleString() },
    owner: { snowColumn: 'assigned_to', rawValue: change.assignedToName || 'Sin asignar' },
    risk: { snowColumn: 'risk', rawValue: change.riskRaw || risk },
    cabStatus: { snowColumn: 'approval', rawValue: change.approvalRaw || cabStatus },
    rollbackPlan: { snowColumn: 'backout_plan', rawValue: change.backoutPlan ? 'Extraído de SNOW' : 'Por defecto' },
    checklist: {
      snowColumn: 'change_task',
      rawValue: `${checklist.length} tareas (${change.tasks.length > 0 ? 'desde CTASK' : 'plantilla'})`
    }
  };

  return {
    title: change.shortDescription || `Cambio ServiceNow ${change.number}`,
    service: serviceName,
    releaseTag: change.folio || change.number,
    changeTicketId: change.number,
    environment,
    phase,
    risk,
    cabStatus,
    startTimeIso: parsedStart.toISOString(),
    endTimeIso: parsedEnd.toISOString(),
    color: PHASE_CONFIG[phase]?.color || '#10b981',
    rollbackPlan:
      change.backoutPlan ||
      `Plan de marcha atrás para ${change.number} (${change.type}) coordinado por ${change.assignmentGroup || change.assignedToName || 'Infraestructura'}.`,
    notes: notesParts.join(' | '),
    ownerName: change.assignedToName || 'Release Manager',
    ownerEmail: change.assignedToEmail || '',
    involvedMembers,
    checklist,
    fieldTraces
  };
};

/**
 * Creates a realistic simulated ServiceNow change scan for testing the workflow without VPN
 */
export const createDemoScannedChange = (requestedNumber?: string): ScannedSnowChange => {
  const num = (requestedNumber || 'CHG0045821').trim().toUpperCase();
  const baseStart = new Date();
  baseStart.setDate(baseStart.getDate() + 2);
  baseStart.setHours(21, 0, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
      d.getHours()
    ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

  return {
    number: num,
    shortDescription: 'Actualización Cluster Kubernetes & Balanceador API Gateway v4.2',
    state: 'Programado (Scheduled)',
    type: 'Normal',
    category: 'Infraestructura',
    subcategory: 'Cloud & Contenedores',
    environmentRaw: 'Producción',
    cmdbCi: 'API-Gateway-Prod-Cluster',
    startDate: fmt(baseStart),
    endDate: fmt(baseEnd),
    assignedToName: 'Carlos Mendoza',
    assignedToEmail: '',
    assignmentGroup: 'Infraestructura Cloud',
    openedByName: 'Vicente Escareño',
    riskRaw: 'Moderate / Medio',
    approvalRaw: 'Approved',
    backoutPlan:
      '1. Ejecutar helm rollback ingress-gw --revision anterior.\n2. Restaurar regla DNS en balanceador F5.\n3. Validar healthcheck /api/health.',
    implementationPlan: 'Despliegue Blue-Green en nodos worker 1-4 con drenado gradual de tráfico.',
    description: 'Ventana planificada para actualizar certificados mTLS y parches de seguridad en balanceadores.',
    folio: `FOL-${num}`,
    tasks: [
      {
        number: 'CTASK008101',
        shortDescription: 'Respaldo de configuración Nginx Ingress y secretos TLS',
        state: 'Closed Complete',
        assignedTo: 'Carlos Mendoza',
        assignmentGroup: 'Infraestructura Cloud',
        closed: true
      },
      {
        number: 'CTASK008102',
        shortDescription: 'Aplicar actualización de nodos worker y balanceador',
        state: 'Open',
        assignedTo: 'Carlos Mendoza',
        assignmentGroup: 'Infraestructura Cloud',
        closed: false
      },
      {
        number: 'CTASK008103',
        shortDescription: 'Ejecutar smoke tests de latencia y confirmar monitoreo',
        state: 'Open',
        assignedTo: 'QA Lead',
        assignmentGroup: 'Calidad QA',
        closed: false
      }
    ],
    rawRecord: {}
  };
};

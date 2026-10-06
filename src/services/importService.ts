import * as XLSX from 'xlsx';
import {
  ReleaseEvent,
  ReleasePhase,
  Environment,
  RiskLevel,
  CABStatus,
  TeamMember,
  DirectoryMember,
  PHASE_CONFIG
} from '../types/release';
import { parseFlexibleDate } from '../utils/dateUtils';

export type ImportSourceSystem = 'servicenow' | 'jira' | 'auto';

export interface ImportPreviewItem {
  action: 'create' | 'update';
  ticketKey: string;
  previousPhase?: ReleasePhase;
  previousRawStatus?: string;
  event: ReleaseEvent;
  discoveredMembers: { name: string; email: string; role: string }[];
}

/**
 * Normalizes column header strings (lowercase, removes accents and extra spaces)
 */
const normalizeHeader = (header: string): string => {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Helper to look up a cell value by multiple possible column names
 */
const getColValue = (row: Record<string, any>, candidates: string[]): string => {
  const normalizedMap: Record<string, any> = {};
  Object.keys(row).forEach(k => {
    normalizedMap[normalizeHeader(k)] = row[k];
  });

  for (const cand of candidates) {
    const normCand = normalizeHeader(cand);
    if (normalizedMap[normCand] !== undefined && normalizedMap[normCand] !== null && String(normalizedMap[normCand]).trim() !== '') {
      return String(normalizedMap[normCand]).trim();
    }
  }
  return '';
};

const getRawColValue = (row: Record<string, any>, candidates: string[]): any => {
  const normalizedMap: Record<string, any> = {};
  Object.keys(row).forEach(k => {
    normalizedMap[normalizeHeader(k)] = row[k];
  });

  for (const cand of candidates) {
    const normCand = normalizeHeader(cand);
    if (normalizedMap[normCand] !== undefined && normalizedMap[normCand] !== null && normalizedMap[normCand] !== '') {
      return normalizedMap[normCand];
    }
  }
  return null;
};

/**
 * Maps ServiceNow / JIRA "Estado" and "Tipo" to ReleaseHub ReleasePhase and CABStatus
 */
export const mapStatusToPhase = (
  rawStatus: string,
  rawType: string
): { phase: ReleasePhase; cabStatus: CABStatus; risk: RiskLevel } => {
  const s = normalizeHeader(rawStatus);
  const t = normalizeHeader(rawType);

  let risk: RiskLevel = 'medium';
  let cabStatus: CABStatus = 'approved';
  let phase: ReleasePhase = 'deployment-window';

  // Risk & CAB based on Tipo (Normal, Estándar, Emergencia, Expedito)
  if (t.includes('emergenc') || t.includes('hotfix') || t.includes('crit')) {
    risk = 'critical';
    cabStatus = 'exempt';
    phase = 'hotfix-emergency';
  } else if (t.includes('estandar') || t.includes('standard') || t.includes('rutin')) {
    risk = 'low';
    cabStatus = 'approved';
  } else if (t.includes('mayor') || t.includes('major') || t.includes('alto') || t.includes('high')) {
    risk = 'high';
  }

  // Phase mapping from Estado (SNOW & JIRA states)
  if (
    s.includes('nuevo') ||
    s.includes('new') ||
    s.includes('borrador') ||
    s.includes('draft') ||
    s.includes('open') ||
    s.includes('abierto') ||
    s.includes('planific') ||
    s.includes('to do') ||
    s.includes('backlog')
  ) {
    phase = 'planning';
    cabStatus = 'pending';
  } else if (
    s.includes('evalua') ||
    s.includes('assess') ||
    s.includes('freeze') ||
    s.includes('congel') ||
    s.includes('rc') ||
    s.includes('analisis')
  ) {
    phase = 'code-freeze';
    cabStatus = 'pending';
  } else if (
    s.includes('autoriza') ||
    s.includes('authoriz') ||
    s.includes('cab') ||
    s.includes('aprobacion') ||
    s.includes('comite') ||
    s.includes('approval')
  ) {
    phase = 'cab-review';
    cabStatus = 'pending';
  } else if (
    s.includes('programado') ||
    s.includes('scheduled') ||
    s.includes('implement') ||
    s.includes('ejecucion') ||
    s.includes('despliegue') ||
    s.includes('en curso') ||
    s.includes('in progress')
  ) {
    phase = t.includes('emergenc') ? 'hotfix-emergency' : 'deployment-window';
    cabStatus = 'approved';
  } else if (
    s.includes('revision') ||
    s.includes('review') ||
    s.includes('validacion') ||
    s.includes('qa') ||
    s.includes('prueba') ||
    s.includes('testing') ||
    s.includes('smoke') ||
    s.includes('pir')
  ) {
    phase = 'smoke-testing';
    cabStatus = 'approved';
  } else if (s.includes('mantenim') || s.includes('maintenance')) {
    phase = 'maintenance-window';
    cabStatus = 'approved';
  } else if (
    s.includes('cerrado') ||
    s.includes('closed') ||
    s.includes('complet') ||
    s.includes('done') ||
    s.includes('resuelto') ||
    s.includes('resolved') ||
    s.includes('exitoso')
  ) {
    phase = 'completed';
    cabStatus = 'approved';
  } else if (
    s.includes('cancel') ||
    s.includes('revert') ||
    s.includes('rollback') ||
    s.includes('fallido') ||
    s.includes('rechazad') ||
    s.includes('rejected')
  ) {
    phase = 'rollback';
    cabStatus = s.includes('rechazad') ? 'rejected' : 'approved';
  }

  return { phase, cabStatus, risk };
};

/**
 * Maps Ambiente string to ReleaseHub Environment
 */
export const mapEnvironment = (rawEnv: string): Environment => {
  const e = normalizeHeader(rawEnv);
  if (e.includes('pre') || e.includes('uat') || e.includes('previo')) return 'pre-prod';
  if (e.includes('stag') || e.includes('qa') || e.includes('test') || e.includes('dev') || e.includes('desarrollo') || e.includes(' Homolog')) return 'staging';
  if (e.includes('dr') || e.includes('contingencia') || e.includes('disaster')) return 'disaster-recovery';
  return 'production';
};

/**
 * Maps ServiceNow "Grupo de asignación" to MemberRole
 */
export const mapAssignmentGroupToRole = (rawGroup: string): string => {
  if (!rawGroup) return '';
  const g = normalizeHeader(rawGroup);
  if (g.includes('soporte') || g.includes('support') || g.includes('mesa') || g.includes('l1') || g.includes('l2')) return 'Soporte';
  if (g.includes('infra') || g.includes('cloud') || g.includes('server') || g.includes('sistemas')) return 'Infraestructura';
  if (g.includes('devops') || g.includes('sre') || g.includes('plataforma') || g.includes('automat')) return 'DevOps / SRE';
  if (g.includes('qa') || g.includes('calidad') || g.includes('test') || g.includes('pruebas')) return 'QA Lead';
  if (g.includes('bd') || g.includes('dba') || g.includes('datos') || g.includes('database')) return 'DBA';
  if (g.includes('seguridad') || g.includes('sec') || g.includes('ciber') || g.includes('soc')) return 'Security Lead';
  if (g.includes('red') || g.includes('network') || g.includes('telecom') || g.includes('comunic')) return 'Redes & Telecom';
  if (g.includes('arquitec')) return 'Arquitectura';
  if (g.includes('desarrollo') || g.includes('dev') || g.includes('ingenieria') || g.includes(' Core')) return 'Tech Lead';
  if (g.includes('release') || g.includes('cambio') || g.includes('cab')) return 'Release Manager';
  return rawGroup.trim();
};

/**
 * Extracts name and optional email from a cell like "Carlos López <carlos@empresa.com>" or looks up directory.
 * If only name is present and not in directory, leaves email as '' so it can be added later.
 */
export const extractMemberIdentity = (
  rawValue: string,
  explicitEmail: string,
  directory: DirectoryMember[]
): { name: string; email: string } => {
  const cleanRaw = (rawValue || '').trim();
  if (!cleanRaw) return { name: '', email: '' };

  let name = cleanRaw;
  let email = (explicitEmail || '').trim();

  // Check if rawValue contains "Name <email@domain.com>" or "Name (email@domain.com)"
  const bracketMatch = cleanRaw.match(/^([^<(]+)[<(]([^>@)]+@[^>)]+)[>)]/);
  if (bracketMatch) {
    name = bracketMatch[1].trim();
    if (!email) email = bracketMatch[2].trim();
  } else if (cleanRaw.includes('@') && !cleanRaw.includes(' ')) {
    // Only an email was in the field
    if (!email) email = cleanRaw;
    name = cleanRaw.split('@')[0].replace(/[._-]/g, ' ');
  }

  // Check if person already exists in directory
  const found = directory.find(
    m =>
      normalizeHeader(m.name) === normalizeHeader(name) ||
      (email && m.email && normalizeHeader(m.email) === normalizeHeader(email))
  );
  if (found && !email && found.email) {
    email = found.email;
  }

  return { name, email };
};

/**
 * Parses an Excel (.xlsx / .xls) or CSV file specifically to extract/import team members
 * Works with both ServiceNow/JIRA exports (Asignado a, Grupo de asignación, Abierto por)
 * and direct member lists (Nombre, Correo/Email, Área/Rol).
 */
export const parseMembersFromExcelFile = async (
  file: File,
  existingDirectory: DirectoryMember[]
): Promise<{ name: string; email: string; role: string }[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const extractedMap = new Map<string, { name: string; email: string; role: string }>();

  rows.forEach(row => {
    const rawNameOrAssignee = getColValue(row, [
      'Asignado a',
      'Assigned to',
      'Assignee',
      'Cuenta de asignación',
      'Cuenta de asignacion',
      'Nombre',
      'Name',
      'Miembro',
      'Responsable',
      'Usuario'
    ]);

    const rawEmail = getColValue(row, [
      'Correo',
      'Correo electrónico',
      'Correo electronico',
      'Email',
      'E-mail',
      'Mail',
      'Correo asignado'
    ]);

    const rawGroupOrArea = getColValue(row, [
      'Grupo de asignación',
      'Grupo de asignacion',
      'Assignment group',
      'Área',
      'Area',
      'Rol',
      'Role',
      'Equipo',
      'Departamento'
    ]);

    const mappedRole = mapAssignmentGroupToRole(rawGroupOrArea);

    if (rawNameOrAssignee) {
      const { name, email } = extractMemberIdentity(rawNameOrAssignee, rawEmail, existingDirectory);
      if (name && normalizeHeader(name) !== 'release manager') {
        const key = normalizeHeader(name);
        const prev = extractedMap.get(key);
        extractedMap.set(key, {
          name,
          email: email || prev?.email || '',
          role: mappedRole || prev?.role || ''
        });
      }
    }

    // Also check "Abierto por" if it's a ServiceNow sheet
    const rawOpenedBy = getColValue(row, ['Abierto por', 'Abierto por ', 'Opened by', 'Reporter', 'Solicitante']);
    if (rawOpenedBy) {
      const { name, email } = extractMemberIdentity(rawOpenedBy, '', existingDirectory);
      if (name && normalizeHeader(name) !== 'release manager') {
        const key = normalizeHeader(name);
        if (!extractedMap.has(key)) {
          const existing = existingDirectory.find(m => normalizeHeader(m.name) === key);
          extractedMap.set(key, {
            name,
            email: email || existing?.email || '',
            role: existing?.role || ''
          });
        }
      }
    }
  });

  return Array.from(extractedMap.values());
};

/**
 * Parses an Excel (.xlsx / .xls) or CSV file and returns a preview of creates & updates
 */
export const parseAndPreviewImportFile = async (
  file: File,
  sourceChoice: ImportSourceSystem,
  existingEvents: ReleaseEvent[],
  memberDirectory: DirectoryMember[]
): Promise<{
  detectedSource: 'servicenow' | 'jira';
  items: ImportPreviewItem[];
  totalRows: number;
}> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rows || rows.length === 0) {
    return { detectedSource: sourceChoice === 'jira' ? 'jira' : 'servicenow', items: [], totalRows: 0 };
  }

  // Auto-detect source from headers
  const headers = Object.keys(rows[0]).map(normalizeHeader);
  let detectedSource: 'servicenow' | 'jira' = 'servicenow';
  if (sourceChoice === 'jira') {
    detectedSource = 'jira';
  } else if (sourceChoice === 'servicenow') {
    detectedSource = 'servicenow';
  } else {
    const hasJiraHeaders = headers.some(h => h.includes('issue key') || h.includes('clave') || h.includes('summary') || h.includes('fix version'));
    detectedSource = hasJiraHeaders ? 'jira' : 'servicenow';
  }

  const previewItems: ImportPreviewItem[] = [];

  rows.forEach((row, idx) => {
    // 1. Extract Ticket ID (Número in SNOW / Issue Key in JIRA)
    const numero = getColValue(row, [
      'Número',
      'Numero',
      'Number',
      'Issue key',
      'Key',
      'Clave',
      'Ticket',
      'ID',
      'Change ID'
    ]);

    // 2. Extract Title (Breve descripción in SNOW / Summary in JIRA)
    const breveDescripcion = getColValue(row, [
      'Breve descripción',
      'Breve descripcion',
      'Short description',
      'Descripción',
      'Descripcion',
      'Resumen',
      'Summary',
      'Título',
      'Titulo'
    ]);

    if (!numero && !breveDescripcion) return; // Skip empty rows

    const ticketId = numero || `CHG-${new Date().getFullYear()}-${1000 + idx}`;
    const title = breveDescripcion || `Cambio Programado ${ticketId}`;

    // 3. Extract Remaining ServiceNow / JIRA Columns
    const tipo = getColValue(row, ['Tipo', 'Type', 'Issue Type', 'Tipo de Incidencia', 'Tipo de cambio']) || 'Normal';
    const categoria = getColValue(row, ['Categoría', 'Categoria', 'Category', 'Components', 'Componente', 'Servicio']) || 'Infraestructura TI';
    const subcategoria = getColValue(row, ['Subcategoria', 'Subcategoría', 'Subcategory', 'Sub-categoría']) || '';
    const ambienteRaw = getColValue(row, ['Ambiente', 'Entorno', 'Environment', 'Amb']) || 'Producción';
    const estadoRaw = getColValue(row, ['Estado', 'State', 'Status', 'Fase']) || 'Programado';

    const fechaInicioRaw = getRawColValue(row, [
      'Fecha de inicio planificada',
      'Planned start date',
      'Fecha inicio planificada',
      'Fecha de inicio',
      'Inicio planificado',
      'Start date',
      'Planned Start',
      'Created'
    ]);
    const fechaLimiteRaw = getRawColValue(row, [
      'Fecha límite planificada',
      'Fecha limite planificada',
      'Planned end date',
      'Fecha fin planificada',
      'Fecha límite',
      'Fecha de fin',
      'End date',
      'Planned End',
      'Due date',
      'Fecha de vencimiento'
    ]);

    const asignadoARaw = getColValue(row, ['Asignado a', 'Assigned to', 'Assignee', 'Cuenta de asignación', 'Cuenta de asignacion', 'Responsable', 'Propietario']) || 'Release Manager';
    const explicitRowEmail = getColValue(row, ['Correo', 'Correo electrónico', 'Correo electronico', 'Email', 'E-mail', 'Mail']) || '';
    const folio = getColValue(row, ['Folio', 'Release Tag', 'Versión', 'Version', 'Fix Version/s', 'Fix Version']) || ticketId;
    const abiertoPorRaw = getColValue(row, ['Abierto por', 'Abierto por ', 'Opened by', 'Reporter', 'Informador', 'Solicitante']) || '';
    const abiertoRaw = getRawColValue(row, ['Abierto', 'Opened', 'Fecha de apertura', 'Created', 'Creado']);
    const grupoAsignacion = getColValue(row, ['Grupo de asignación', 'Grupo de asignacion', 'Assignment group', 'Área', 'Area', 'Equipo']) || '';

    // 4. Parse Dates in Local Time
    const parsedStart = parseFlexibleDate(fechaInicioRaw, 20) || new Date(new Date().setHours(20, 0, 0, 0));
    let parsedEnd = parseFlexibleDate(fechaLimiteRaw, 22);
    if (!parsedEnd || parsedEnd.getTime() <= parsedStart.getTime()) {
      parsedEnd = new Date(parsedStart.getTime() + 2 * 60 * 60 * 1000); // +2h default window
    }
    const parsedOpened = parseFlexibleDate(abiertoRaw, 9);

    // 5. Map Phase, CAB, Risk, Environment
    const { phase, cabStatus, risk } = mapStatusToPhase(estadoRaw, tipo);
    const environment = mapEnvironment(ambienteRaw);
    const inferredRoleFromGroup = mapAssignmentGroupToRole(grupoAsignacion);

    // 6. Check if this change already exists in the calendar (by Número/changeTicketId or Folio/releaseTag)
    const existingMatch = existingEvents.find(
      ev =>
        normalizeHeader(ev.changeTicketId) === normalizeHeader(ticketId) ||
        (folio && folio !== ticketId && normalizeHeader(ev.releaseTag) === normalizeHeader(folio))
    );

    // 7. Build Involved Members & Directory discovery
    const discoveredMembers: { name: string; email: string; role: string }[] = [];
    const { name: asignadoA, email: ownerEmail } = extractMemberIdentity(asignadoARaw, explicitRowEmail, memberDirectory);
    const { name: abiertoPor, email: openerEmail } = extractMemberIdentity(abiertoPorRaw, '', memberDirectory);

    // Look up if Asignado a already has a known role in directory
    const existingDirAssignee = memberDirectory.find(m => normalizeHeader(m.name) === normalizeHeader(asignadoA));
    const assigneeRole = inferredRoleFromGroup || existingDirAssignee?.role || '';

    if (asignadoA && asignadoA !== 'Release Manager') {
      discoveredMembers.push({
        name: asignadoA,
        email: ownerEmail,
        role: assigneeRole
      });
    }

    if (abiertoPor && normalizeHeader(abiertoPor) !== normalizeHeader(asignadoA)) {
      const existingDirOpener = memberDirectory.find(m => normalizeHeader(m.name) === normalizeHeader(abiertoPor));
      discoveredMembers.push({
        name: abiertoPor,
        email: openerEmail,
        role: existingDirOpener?.role || ''
      });
    }

    // Merge involvedMembers with existing event members if updating
    const baseMembers: TeamMember[] = existingMatch ? [...existingMatch.involvedMembers] : [];
    discoveredMembers.forEach((dm, mIdx) => {
      const idxInBase = baseMembers.findIndex(bm => normalizeHeader(bm.name) === normalizeHeader(dm.name));
      if (idxInBase >= 0) {
        if (dm.role && !baseMembers[idxInBase].role) {
          baseMembers[idxInBase] = { ...baseMembers[idxInBase], role: dm.role };
        }
      } else {
        baseMembers.push({
          id: `mem-imp-${Date.now()}-${idx}-${mIdx}`,
          name: dm.name,
          email: dm.email,
          role: dm.role,
          phase: 'all',
          notified: false
        });
      }
    });

    const serviceDisplay = subcategoria ? `${categoria} / ${subcategoria}` : categoria;

    const summaryNotes = [
      `Origen: ${detectedSource === 'servicenow' ? 'ServiceNow (SNOW)' : 'JIRA'}`,
      `Tipo: ${tipo}`,
      `Estado Original: ${estadoRaw}`,
      grupoAsignacion ? `Grupo de asignación: ${grupoAsignacion}` : '',
      abiertoPor ? `Abierto por: ${abiertoPor}` : '',
      parsedOpened ? `Fecha apertura: ${parsedOpened.toLocaleString()}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const newEvent: ReleaseEvent = {
      id: existingMatch?.id || `rel-imp-${Date.now()}-${idx}`,
      googleEventId: existingMatch?.googleEventId,
      htmlLink: existingMatch?.htmlLink,
      title,
      releaseTag: folio || ticketId,
      changeTicketId: ticketId,
      service: serviceDisplay,
      environment,
      phase,
      risk: existingMatch ? existingMatch.risk : risk,
      cabStatus,
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
      color: PHASE_CONFIG[phase]?.color || '#10b981',
      downtimeExpectedMinutes: existingMatch?.downtimeExpectedMinutes ?? 0,
      rollbackPlan:
        existingMatch?.rollbackPlan ||
        `Plan de reversión estándar (${tipo}) supervisado por ${grupoAsignacion || asignadoA}.`,
      rollbackEstimateMinutes: existingMatch?.rollbackEstimateMinutes ?? 15,
      runbookUrl: existingMatch?.runbookUrl || '',
      jiraTicketUrl: existingMatch?.jiraTicketUrl || '',
      owner: {
        name: asignadoA,
        email: ownerEmail
      },
      involvedMembers: baseMembers,
      checklist: existingMatch?.checklist || [
        { id: `chk-${idx}-1`, title: `Validación de ventana ${ticketId} (${tipo})`, phase: 'pre', completed: phase === 'completed', assignedTo: asignadoA },
        { id: `chk-${idx}-2`, title: `Ejecución de cambio en ${environment.toUpperCase()}: ${serviceDisplay}`, phase: 'during', completed: phase === 'completed', assignedTo: grupoAsignacion || asignadoA },
        { id: `chk-${idx}-3`, title: 'Pruebas de sanidad y confirmación de servicio', phase: 'post', completed: phase === 'completed', assignedTo: abiertoPor || asignadoA }
      ],
      notificationsConfig: existingMatch?.notificationsConfig || {
        autoNotifyGoogleAttendees: true,
        emailAlertsEnabled: true,
        popupRemindersEnabled: true,
        remindMinutesBefore: [60, 15],
        notifyOnPhaseChange: true
      },
      notes: summaryNotes,
      updatedAt: new Date().toISOString(),
      externalMetadata: {
        sourceSystem: detectedSource,
        changeType: tipo,
        category: categoria,
        subcategory: subcategoria,
        folio,
        openedBy: abiertoPor,
        openedAt: parsedOpened ? parsedOpened.toISOString() : undefined,
        assignmentGroup: grupoAsignacion,
        rawStatus: estadoRaw,
        lastImportedAt: new Date().toISOString()
      }
    };

    previewItems.push({
      action: existingMatch ? 'update' : 'create',
      ticketKey: ticketId,
      previousPhase: existingMatch?.phase,
      previousRawStatus: existingMatch?.externalMetadata?.rawStatus,
      event: newEvent,
      discoveredMembers
    });
  });

  return {
    detectedSource,
    items: previewItems,
    totalRows: rows.length
  };
};

/**
 * Generates and downloads a sample ServiceNow .xlsx file with the exact 14 columns requested by the user
 */
export const downloadSampleSnowExcel = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const sampleData = [
    {
      'Número': 'CHG0045101',
      'Breve descripción': 'Actualización de Certificados TLS Gateway Bancario y Balanceador',
      'Tipo': 'Normal',
      'Categoría': 'Seguridad & Redes',
      'Ambiente': 'Producción',
      'Estado': 'Programado',
      'Fecha de inicio planificada': `${y}-${m}-12 21:00`,
      'Fecha límite planificada': `${y}-${m}-12 23:30`,
      'Asignado a': 'Carlos Ramírez',
      'Folio': 'REL-TLS-4.1',
      'Subcategoria': 'Balanceadores F5 / SSL',
      'Abierto por': 'Vicente Escareño',
      'Abierto': `${y}-${m}-02 10:15`,
      'Grupo de asignación': 'Infraestructura'
    },
    {
      'Número': 'CHG0045102',
      'Breve descripción': 'Despliegue Microservicio de Notificaciones Push & SMS v2.8',
      'Tipo': 'Estándar',
      'Categoría': 'Aplicaciones Core',
      'Ambiente': 'Producción',
      'Estado': 'Autorización CAB',
      'Fecha de inicio planificada': `${y}-${m}-15 20:00`,
      'Fecha límite planificada': `${y}-${m}-15 22:00`,
      'Asignado a': 'Ana Morales',
      'Folio': 'v2.8.0-PUSH',
      'Subcategoria': 'Mensajería Cloud',
      'Abierto por': 'Vicente Escareño',
      'Abierto': `${y}-${m}-03 11:30`,
      'Grupo de asignación': 'Soporte'
    },
    {
      'Número': 'CHG0045103',
      'Breve descripción': 'Mantenimiento Índices Base de Datos Transaccional Oracle',
      'Tipo': 'Normal',
      'Categoría': 'Base de Datos',
      'Ambiente': 'Staging',
      'Estado': 'Evaluación',
      'Fecha de inicio planificada': `${y}-${m}-18 22:00`,
      'Fecha límite planificada': `${y}-${m}-19 01:00`,
      'Asignado a': 'Roberto Díaz',
      'Folio': 'DB-MAINT-10',
      'Subcategoria': 'Oracle RAC',
      'Abierto por': 'Carlos Ramírez',
      'Abierto': `${y}-${m}-04 09:00`,
      'Grupo de asignación': 'DBA'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cambios_ServiceNow');
  XLSX.writeFile(wb, `Plantilla_ServiceNow_Cambios_${y}_${m}.xlsx`);
};

/**
 * Downloads a second-week ServiceNow .xlsx file with updated "Estado" values for the same tickets
 * so the user can immediately verify automatic status updates (Upsert) in the calendar
 */
export const downloadSampleSnowUpdateExcel = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const updatedData = [
    {
      'Número': 'CHG0045101',
      'Breve descripción': 'Actualización de Certificados TLS Gateway Bancario y Balanceador',
      'Tipo': 'Normal',
      'Categoría': 'Seguridad & Redes',
      'Ambiente': 'Producción',
      'Estado': 'Cerrado Exitoso',
      'Fecha de inicio planificada': `${y}-${m}-12 21:00`,
      'Fecha límite planificada': `${y}-${m}-12 23:30`,
      'Asignado a': 'Carlos Ramírez',
      'Folio': 'REL-TLS-4.1',
      'Subcategoria': 'Balanceadores F5 / SSL',
      'Abierto por': 'Vicente Escareño',
      'Abierto': `${y}-${m}-02 10:15`,
      'Grupo de asignación': 'Infraestructura'
    },
    {
      'Número': 'CHG0045102',
      'Breve descripción': 'Despliegue Microservicio de Notificaciones Push & SMS v2.8',
      'Tipo': 'Estándar',
      'Categoría': 'Aplicaciones Core',
      'Ambiente': 'Producción',
      'Estado': 'Validación QA / Pruebas',
      'Fecha de inicio planificada': `${y}-${m}-15 20:00`,
      'Fecha límite planificada': `${y}-${m}-15 22:00`,
      'Asignado a': 'Ana Morales',
      'Folio': 'v2.8.0-PUSH',
      'Subcategoria': 'Mensajería Cloud',
      'Abierto por': 'Vicente Escareño',
      'Abierto': `${y}-${m}-03 11:30`,
      'Grupo de asignación': 'Soporte'
    },
    {
      'Número': 'CHG0045103',
      'Breve descripción': 'Mantenimiento Índices Base de Datos Transaccional Oracle',
      'Tipo': 'Normal',
      'Categoría': 'Base de Datos',
      'Ambiente': 'Staging',
      'Estado': 'Programado',
      'Fecha de inicio planificada': `${y}-${m}-18 22:00`,
      'Fecha límite planificada': `${y}-${m}-19 01:00`,
      'Asignado a': 'Roberto Díaz',
      'Folio': 'DB-MAINT-10',
      'Subcategoria': 'Oracle RAC',
      'Abierto por': 'Carlos Ramírez',
      'Abierto': `${y}-${m}-04 09:00`,
      'Grupo de asignación': 'DBA'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(updatedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Actualizacion_ServiceNow');
  XLSX.writeFile(wb, `ServiceNow_Semana2_Actualizacion_Estados_${y}_${m}.xlsx`);
};

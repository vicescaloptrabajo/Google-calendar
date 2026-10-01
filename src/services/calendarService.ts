import { ReleaseEvent, ReleasePhase, Environment, RiskLevel, CABStatus, TeamMember, ChecklistItem, PHASE_CONFIG } from '../types/release';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

interface GoogleCalendarReminderOverride {
  method: 'email' | 'popup';
  minutes: number;
}

export interface GoogleCalendarEventPayload {
  id?: string;
  summary: string;
  description: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  attendees?: GoogleCalendarAttendee[];
  reminders?: {
    useDefault: boolean;
    overrides?: GoogleCalendarReminderOverride[];
  };
  colorId?: string;
  htmlLink?: string;
}

/**
 * Serializes Release Event into formatted markdown description with hidden metadata payload
 */
export const formatEventDescription = (event: ReleaseEvent): string => {
  const metadataMarker = `<!-- RELEASE_HUB_METADATA_START\n${JSON.stringify({
    releaseTag: event.releaseTag,
    changeTicketId: event.changeTicketId,
    service: event.service,
    environment: event.environment,
    phase: event.phase,
    risk: event.risk,
    cabStatus: event.cabStatus,
    color: event.color,
    downtimeExpectedMinutes: event.downtimeExpectedMinutes,
    rollbackPlan: event.rollbackPlan,
    rollbackEstimateMinutes: event.rollbackEstimateMinutes,
    runbookUrl: event.runbookUrl,
    jiraTicketUrl: event.jiraTicketUrl,
    owner: event.owner,
    involvedMembers: event.involvedMembers,
    checklist: event.checklist,
    notificationsConfig: event.notificationsConfig,
    notes: event.notes
  }, null, 2)}\nRELEASE_HUB_METADATA_END -->`;

  const humanReadableSummary = `
🚀 RELEASE MANAGEMENT & CHANGE CONTROL DOSSIER
==============================================
🏷️ Release Tag: ${event.releaseTag}
📋 Ticket de Cambio (CHG): ${event.changeTicketId}
🏢 Servicio / Microservicio: ${event.service}
🌐 Entorno: ${event.environment.toUpperCase()}
🚦 Fase: ${PHASE_CONFIG[event.phase]?.label || event.phase}
⚠️ Nivel de Riesgo: ${event.risk.toUpperCase()}
🛡️ Aprobación CAB: ${event.cabStatus.toUpperCase()}
⏱️ Indisponibilidad Esperada: ${event.downtimeExpectedMinutes > 0 ? `${event.downtimeExpectedMinutes} min` : 'Zero-Downtime'}
👤 Release Owner: ${event.owner.name} (${event.owner.email})

🔄 PLAN DE ROLLBACK & CONTINGENCIA
----------------------------------
${event.rollbackPlan || 'Sin plan de rollback especificado'}
Tiempo estimado de reversión: ${event.rollbackEstimateMinutes} min

👥 MIEMBROS INVOLUCRADOS EN ESTA FASE
------------------------------------
${event.involvedMembers.map(m => `• ${m.name} [${m.role}] (${m.email}) - Fase: ${m.phase}`).join('\n') || 'Ninguno asignado'}

✅ CHECKLIST DE VALIDACIÓN
--------------------------
${event.checklist.map(c => `[${c.completed ? 'X' : ' '}] (${c.phase.toUpperCase()}) ${c.title}`).join('\n') || 'Sin items'}

🔗 ENLACES DE LIBERACIÓN
-------------------------
${event.runbookUrl ? `• Runbook de Despliegue: ${event.runbookUrl}` : ''}
${event.jiraTicketUrl ? `• Ticket Jira / Issue: ${event.jiraTicketUrl}` : ''}

📝 Notas Adicionales:
${event.notes || 'N/A'}

${metadataMarker}
  `.trim();

  return humanReadableSummary;
};

/**
 * Extracts ReleaseEvent from Google Calendar Event payload
 */
export const parseGoogleEventToRelease = (gEvent: any): ReleaseEvent => {
  const desc = gEvent.description || '';
  let meta: any = {};

  const match = desc.match(/<!-- RELEASE_HUB_METADATA_START\n([\s\S]*?)\nRELEASE_HUB_METADATA_END -->/);
  if (match && match[1]) {
    try {
      meta = JSON.parse(match[1]);
    } catch (e) {
      console.warn('Could not parse embedded ReleaseHub metadata', e);
    }
  }

  const startIso = gEvent.start?.dateTime || gEvent.start?.date ? new Date(gEvent.start?.dateTime || gEvent.start?.date).toISOString() : new Date().toISOString();
  const endIso = gEvent.end?.dateTime || gEvent.end?.date ? new Date(gEvent.end?.dateTime || gEvent.end?.date).toISOString() : new Date(Date.now() + 3600000).toISOString();

  const phase: ReleasePhase = meta.phase || 'deployment-window';
  const environment: Environment = meta.environment || 'production';
  const risk: RiskLevel = meta.risk || 'medium';
  const cabStatus: CABStatus = meta.cabStatus || 'approved';

  // Fallback involved members from Google Calendar attendees if metadata was absent
  const attendees = (gEvent.attendees || []).map((a: any, idx: number) => ({
    id: `att-${idx}`,
    name: a.displayName || a.email.split('@')[0],
    email: a.email,
    role: 'Stakeholder' as const,
    phase: 'all' as const,
    notified: true
  }));

  return {
    id: gEvent.id || `rel-${Date.now()}`,
    googleEventId: gEvent.id,
    htmlLink: gEvent.htmlLink,
    title: gEvent.summary ? gEvent.summary.replace(/\[.*?\]\s*/g, '') : 'Despliegue Programado',
    releaseTag: meta.releaseTag || 'v1.0.0',
    changeTicketId: meta.changeTicketId || `CHG-${(gEvent.id || '').substring(0, 6)}`,
    service: meta.service || 'Servicio Principal',
    environment,
    phase,
    risk,
    cabStatus,
    startTime: startIso,
    endTime: endIso,
    color: meta.color || PHASE_CONFIG[phase]?.color || '#10b981',
    downtimeExpectedMinutes: meta.downtimeExpectedMinutes ?? 0,
    rollbackPlan: meta.rollbackPlan || 'Procedimiento estándar de marcha atrás mediante despliegue de imagen anterior o feature flags.',
    rollbackEstimateMinutes: meta.rollbackEstimateMinutes ?? 15,
    runbookUrl: meta.runbookUrl || '',
    jiraTicketUrl: meta.jiraTicketUrl || '',
    owner: meta.owner || {
      name: gEvent.organizer?.displayName || 'Release Manager',
      email: gEvent.organizer?.email || ''
    },
    involvedMembers: meta.involvedMembers?.length ? meta.involvedMembers : attendees,
    checklist: meta.checklist?.length ? meta.checklist : [
      { id: '1', title: 'Verificación de backups y migraciones DB', phase: 'pre', completed: false },
      { id: '2', title: 'Aprobación formal del Comité de Cambios (CAB)', phase: 'pre', completed: false },
      { id: '3', title: 'Ejecución del pipeline de despliegue a entorno', phase: 'during', completed: false },
      { id: '4', title: 'Smoke tests de salud y validación de endpoints', phase: 'post', completed: false },
      { id: '5', title: 'Monitoreo de latencia y tasa de error (SLOs)', phase: 'post', completed: false }
    ],
    notificationsConfig: meta.notificationsConfig || {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [60, 15],
      notifyOnPhaseChange: true
    },
    notes: meta.notes || ''
  };
};

/**
 * Prepares payload for Google Calendar API
 */
export const buildGoogleEventPayload = (event: ReleaseEvent): GoogleCalendarEventPayload => {
  const overrides: GoogleCalendarReminderOverride[] = [];
  
  if (event.notificationsConfig?.remindMinutesBefore?.length) {
    event.notificationsConfig.remindMinutesBefore.forEach(mins => {
      overrides.push({
        method: mins >= 1440 ? 'email' : 'popup',
        minutes: mins
      });
      // also ensure email alert if requested
      if (event.notificationsConfig.emailAlertsEnabled && mins < 1440) {
        overrides.push({ method: 'email', minutes: mins });
      }
    });
  } else {
    overrides.push({ method: 'popup', minutes: 30 });
    overrides.push({ method: 'email', minutes: 120 });
  }

  const attendees: GoogleCalendarAttendee[] = (event.involvedMembers || []).map(m => ({
    email: m.email,
    displayName: `${m.name} (${m.role} - ${m.phase})`
  }));

  return {
    summary: `[${event.releaseTag} | ${event.environment.toUpperCase()}] ${event.title}`,
    description: formatEventDescription(event),
    start: {
      dateTime: new Date(event.startTime).toISOString(),
    },
    end: {
      dateTime: new Date(event.endTime).toISOString(),
    },
    attendees: attendees.length > 0 ? attendees : undefined,
    reminders: {
      useDefault: false,
      overrides
    }
  };
};

/**
 * Fetch release events from Google Calendar
 */
export const fetchGoogleCalendarEvents = async (
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<ReleaseEvent[]> => {
  const url = new URL(CALENDAR_API_BASE);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '150');

  // Default time window: +/- 3 months around now
  const defaultMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const defaultMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  url.searchParams.set('timeMin', timeMin || defaultMin);
  url.searchParams.set('timeMax', timeMax || defaultMax);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const items = data.items || [];
  return items.map((item: any) => parseGoogleEventToRelease(item));
};

/**
 * Create a new event in Google Calendar with automatic notification dispatch to attendees
 */
export const createGoogleCalendarEvent = async (
  accessToken: string,
  event: ReleaseEvent
): Promise<ReleaseEvent> => {
  const payload = buildGoogleEventPayload(event);
  
  // sendUpdates=all notifies attendees by email automatically via Google Calendar
  const url = `${CALENDAR_API_BASE}?sendUpdates=all`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al crear evento en Google Calendar (${response.status}): ${errorText}`);
  }

  const created = await response.json();
  return {
    ...event,
    googleEventId: created.id,
    htmlLink: created.htmlLink
  };
};

/**
 * Update an existing event in Google Calendar
 */
export const updateGoogleCalendarEvent = async (
  accessToken: string,
  googleEventId: string,
  event: ReleaseEvent
): Promise<ReleaseEvent> => {
  const payload = buildGoogleEventPayload(event);
  const url = `${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}?sendUpdates=all`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al actualizar evento en Google Calendar (${response.status}): ${errorText}`);
  }

  const updated = await response.json();
  return {
    ...event,
    googleEventId: updated.id,
    htmlLink: updated.htmlLink
  };
};

/**
 * Delete an event in Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  accessToken: string,
  googleEventId: string
): Promise<void> => {
  const url = `${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}?sendUpdates=all`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errorText = await response.text();
    throw new Error(`Error al eliminar evento en Google Calendar (${response.status}): ${errorText}`);
  }
};

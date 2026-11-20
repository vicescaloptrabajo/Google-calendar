import { ReleaseEvent, ReleasePhase, TeamMember, NotificationLog, PHASE_CONFIG } from '../types/release';

export interface NotificationPayload {
  subject: string;
  recipients: string[];
  htmlBody: string;
  slackMarkdown: string;
  plainText: string;
}

/**
 * Generates notification content customized for the release phase and involved members
 */
export const buildPhaseNotificationPayload = (
  release: ReleaseEvent,
  phase: ReleasePhase,
  membersToAlert: TeamMember[]
): NotificationPayload => {
  const phaseMeta = PHASE_CONFIG[phase] || { label: phase };
  const recipientEmails = membersToAlert
    .map(m => (m.email || '').trim())
    .filter(e => e.includes('@'));

  const subject = `[IMPLEMENTACIÓN / CAMBIO] ${release.changeTicketId} (${release.releaseTag} | ${release.environment.toUpperCase()}) - ${release.title}`;

  const selectedTasks = (release.checklist || []).filter(c => c.includeInCalendar === true);

  const checklistSection =
    selectedTasks.length > 0
      ? `\nTAREAS DEL CAMBIO SELECCIONADAS:\n${selectedTasks
          .map(c => `• ${c.title}${c.assignedTo ? ` (${c.assignedTo})` : ''}`)
          .join('\n')}\n`
      : '';

  const plainText = `
CONVOCATORIA / FICHA DE IMPLEMENTACIÓN DE CAMBIO
================================================
Título: ${release.title}
Ticket de Cambio (CHG): ${release.changeTicketId}
Release Tag: ${release.releaseTag}
Servicio / Sistema: ${release.service}
Entorno: ${release.environment.toUpperCase()}
Fase Actual: ${phaseMeta.label}
Nivel de Riesgo: ${release.risk.toUpperCase()}
Estado CAB: ${release.cabStatus.toUpperCase()}
Indisponibilidad Estimada: ${release.downtimeExpectedMinutes} min
Ventana Programada: ${new Date(release.startTime).toLocaleString()} - ${new Date(release.endTime).toLocaleString()}

Responsable / Owner: ${release.owner.name} (${release.owner.email})
Tiempo Estimado de Rollback: ${release.rollbackEstimateMinutes} minutos

PARTICIPANTES ASIGNADOS:
${membersToAlert.map(m => `* ${m.name}${m.role ? ` (${m.role})` : ''}${m.email ? ` - ${m.email}` : ''}`).join('\n')}
${checklistSection}
PLAN DE CONTINGENCIA / ROLLBACK:
${release.rollbackPlan}
${release.notes ? `\nNOTAS ADICIONALES:\n${release.notes}` : ''}
${release.runbookUrl ? `\nRunbook: ${release.runbookUrl}` : ''}
${release.jiraTicketUrl ? `\nTicket Tracker: ${release.jiraTicketUrl}` : ''}
  `.trim();

  const slackMarkdown = `
🚨 *ALERTA DE RELEASE MANAGER: FASE ACTIVA* 🚨
*Release:* \`${release.releaseTag}\` - *${release.title}*
*Ticket:* \`${release.changeTicketId}\` | *Entorno:* \`${release.environment.toUpperCase()}\`
*Fase:* *${phaseMeta.label}* | *Riesgo:* \`${release.risk.toUpperCase()}\`
*Horario:* ${new Date(release.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} a ${new Date(release.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

👥 *Equipo Involucrado:*
${membersToAlert.map(m => `• *${m.name}* (\`${m.role}\`)`).join('\n')}

${release.runbookUrl ? `📘 <${release.runbookUrl}|Ver Runbook de Despliegue>` : ''}
${release.htmlLink ? `📅 <${release.htmlLink}|Abrir en Google Calendar>` : ''}
  `.trim();

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">
        Notificación de Cambio: ${release.releaseTag}
      </h2>
      <p>Estimado equipo, la liberación ha entrado en la fase de: <strong style="color: #2563eb;">${phaseMeta.label}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px; font-weight: bold;">Servicio:</td><td>${release.service}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Ticket:</td><td>${release.changeTicketId}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Entorno:</td><td><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${release.environment.toUpperCase()}</span></td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Riesgo:</td><td>${release.risk.toUpperCase()}</td></tr>
        <tr><td style="padding: 6px; font-weight: bold;">Rollback:</td><td>${release.rollbackEstimateMinutes} min</td></tr>
      </table>

      <div style="background: #f8fafc; padding: 12px; border-left: 4px solid #f59e0b; margin: 16px 0;">
        <strong>Plan de Reversión:</strong>
        <p style="margin: 4px 0 0 0;">${release.rollbackPlan}</p>
      </div>

      ${
        selectedTasks.length > 0
          ? `<div style="margin: 16px 0;">
              <strong>Tareas del Cambio Seleccionadas:</strong>
              <ul style="margin: 6px 0 0 18px; padding: 0;">
                ${selectedTasks.map(c => `<li>${c.title}</li>`).join('')}
              </ul>
            </div>`
          : ''
      }

      <p>Por favor revise los detalles y manténgase en contacto con el Release Manager (<strong>${release.owner.name}</strong>).</p>
      ${release.htmlLink ? `<p><a href="${release.htmlLink}" style="background: #2563eb; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Ver en Google Calendar</a></p>` : ''}
    </div>
  `;

  return {
    subject,
    recipients: recipientEmails,
    plainText,
    slackMarkdown,
    htmlBody
  };
};

/**
 * Dispatches an automated phase notification and records log
 */
export const dispatchPhaseNotification = (
  release: ReleaseEvent,
  targetPhase: ReleasePhase,
  channel: 'Google Calendar Reminder' | 'Email Notification' | 'Automated Phase Alert' | 'Slack Dispatch' = 'Automated Phase Alert'
): { log: NotificationLog; payload: NotificationPayload } => {
  // Filter members involved in this phase or marked as 'all'
  const members = release.involvedMembers.filter(
    m => m.phase === targetPhase || m.phase === 'all'
  );

  const fallbackMembers = members.length > 0 ? members : release.involvedMembers;
  const payload = buildPhaseNotificationPayload(release, targetPhase, fallbackMembers);

  const log: NotificationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    releaseId: release.id,
    releaseTag: release.releaseTag,
    releaseTitle: release.title,
    phase: targetPhase,
    recipients: payload.recipients.length > 0 ? payload.recipients : [release.owner.email],
    channel,
    status: 'sent',
    summary: `Notificación enviada a ${payload.recipients.length || 1} destinatarios para la fase ${PHASE_CONFIG[targetPhase]?.label || targetPhase}`
  };

  return { log, payload };
};

/**
 * Builds a direct Gmail Web Compose URL so the user can send the real email immediately from their browser
 */
export const buildGmailComposeUrl = (payload: NotificationPayload, customRecipient?: string): string => {
  const toList = customRecipient
    ? customRecipient.trim()
    : payload.recipients.length > 0
    ? payload.recipients.join(',')
    : 'vicescalop.trabajo@gmail.com';
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: toList,
    su: payload.subject,
    body: payload.plainText
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
};

/**
 * Builds a standard mailto: link for corporate email clients (Outlook, Mail, Thunderbird)
 */
export const buildMailtoUrl = (payload: NotificationPayload, customRecipient?: string): string => {
  const toList = customRecipient
    ? customRecipient.trim()
    : payload.recipients.length > 0
    ? payload.recipients.join(',')
    : '';
  const subject = encodeURIComponent(payload.subject);
  const body = encodeURIComponent(payload.plainText);
  return `mailto:${toList}?subject=${subject}&body=${body}`;
};

/**
 * Generates and downloads an .ics calendar invitation file with all participants as ATTENDEEs
 * Ideal for Outlook / Exchange / corporate mail when offline or without Google Calendar OAuth
 */
export const downloadReleaseIcsInvite = (release: ReleaseEvent): void => {
  const formatIcsDate = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const payload = buildPhaseNotificationPayload(release, release.phase, release.involvedMembers);
  const escapedDesc = payload.plainText.replace(/\r?\n/g, '\\n').replace(/,/g, '\\,');
  const escapedSummary = payload.subject.replace(/,/g, '\\,');

  const attendeeLines = release.involvedMembers
    .filter(m => m.email && m.email.includes('@'))
    .map(
      m =>
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${m.name}${
          m.role ? ` (${m.role})` : ''
        }":mailto:${m.email.trim()}`
    );

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReleaseHub//Change Management Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${release.changeTicketId || release.id}@releasehub.local`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(release.startTime)}`,
    `DTEND:${formatIcsDate(release.endTime)}`,
    `SUMMARY:${escapedSummary}`,
    `DESCRIPTION:${escapedDesc}`,
    `LOCATION:${release.environment.toUpperCase()} - ${release.service}`,
    release.owner.email ? `ORGANIZER;CN="${release.owner.name}":mailto:${release.owner.email}` : '',
    ...attendeeLines,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de Ventana de Liberación',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Implementacion_${(release.changeTicketId || release.releaseTag || 'Cambio').replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Builds an official Google Calendar Event Template URL (works with any @gmail.com / Workspace calendar)
 * Pre-fills title, UTC dates, description, location and guest emails (`add=...`) so Google sends the invitation.
 */
export const buildGoogleCalendarTemplateUrl = (
  release: ReleaseEvent,
  extraGuestEmails: string[] = []
): string => {
  const formatGCalDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const payload = buildPhaseNotificationPayload(release, release.phase, release.involvedMembers);
  const guestSet = new Set<string>();
  payload.recipients.forEach(email => {
    if (email && email.includes('@')) guestSet.add(email.trim());
  });
  extraGuestEmails.forEach(email => {
    if (email && email.includes('@')) guestSet.add(email.trim());
  });

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[${release.changeTicketId || release.releaseTag} | ${release.environment.toUpperCase()}] ${release.title}`,
    dates: `${formatGCalDate(release.startTime)}/${formatGCalDate(release.endTime)}`,
    details: payload.plainText,
    location: `${release.environment.toUpperCase()} - ${release.service}`
  });

  guestSet.forEach(guest => {
    params.append('add', guest);
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};




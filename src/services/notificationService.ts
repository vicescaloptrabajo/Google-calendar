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
  const recipientEmails = membersToAlert.map(m => m.email);
  
  const subject = `[RELEASE ALERT] ${release.releaseTag} (${release.environment.toUpperCase()}) - ${phaseMeta.label}`;

  const plainText = `
ALERTA DE GESTIÓN DE CAMBIOS (RELEASE MANAGER)
-----------------------------------------------
Release: ${release.releaseTag} - ${release.title}
Ticket CAB: ${release.changeTicketId}
Servicio: ${release.service}
Entorno: ${release.environment.toUpperCase()}
Fase Actual: ${phaseMeta.label}
Nivel de Riesgo: ${release.risk.toUpperCase()}
Ventana Programada: ${new Date(release.startTime).toLocaleString()} - ${new Date(release.endTime).toLocaleString()}

Responsable / Owner: ${release.owner.name} (${release.owner.email})
Tiempo Estimado de Rollback: ${release.rollbackEstimateMinutes} minutos

MIEMBROS INVOLUCRADOS EN ESTA FASE:
${membersToAlert.map(m => `* ${m.name} (${m.role}) - ${m.email}`).join('\n')}

ACCIONES REQUERIDAS:
1. Verificar checklist de liberación.
2. Mantener canal de incidentes / war-room abierto.
3. Seguir el Runbook de despliegue: ${release.runbookUrl || 'Consulte al Release Manager'}

Plan de Contingencia / Reversión:
${release.rollbackPlan}
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

      <p>Por favor revise el checklist y manténgase en contacto con el Release Manager (<strong>${release.owner.name}</strong>).</p>
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

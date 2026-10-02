import { ReleaseEvent, PHASE_CONFIG } from '../types/release';

/**
 * Generates an iCalendar (.ics) format file string for all release events
 */
export const generateIcsContent = (events: ReleaseEvent[]): string => {
  const formatDateToICS = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeIcsText = (str: string): string => {
    return (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ReleaseHub//Release Management Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ReleaseHub - Calendario de Cambios',
    'X-WR-TIMEZONE:UTC',
  ];

  events.forEach(event => {
    const phaseLabel = PHASE_CONFIG[event.phase]?.label || event.phase;
    const summary = `[${event.releaseTag} | ${event.environment.toUpperCase()}] ${event.title}`;
    const description = `Servicio: ${event.service}\\n` +
      `Ticket: ${event.changeTicketId}\\n` +
      `Fase: ${phaseLabel}\\n` +
      `Riesgo: ${event.risk.toUpperCase()}\\n` +
      `Rollback (${event.rollbackEstimateMinutes}m): ${event.rollbackPlan}\\n` +
      `Responsable: ${event.owner.name} (${event.owner.email})\\n` +
      (event.runbookUrl ? `Runbook: ${event.runbookUrl}\\n` : '') +
      (event.jiraTicketUrl ? `Jira: ${event.jiraTicketUrl}\\n` : '');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:rel-${event.id}@releasehub.app`);
    lines.push(`DTSTAMP:${formatDateToICS(new Date().toISOString())}`);
    lines.push(`DTSTART:${formatDateToICS(event.startTime)}`);
    lines.push(`DTEND:${formatDateToICS(event.endTime)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(`STATUS:CONFIRMED`);

    if (event.involvedMembers?.length) {
      event.involvedMembers.forEach(m => {
        lines.push(`ATTENDEE;CN=${escapeIcsText(m.name)};ROLE=REQ-PARTICIPANT:mailto:${m.email}`);
      });
    }

    // Reminders
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Alerta de Liberación: ${escapeIcsText(event.releaseTag)}`);
    lines.push('TRIGGER:-PT30M');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

/**
 * Triggers a browser download of the .ics file
 */
export const downloadIcsFile = (events: ReleaseEvent[], filename = 'calendario-releases.ics') => {
  const icsData = generateIcsContent(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Send, 
  Check, 
  Copy, 
  Mail, 
  MessageSquare, 
  History, 
  Users, 
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
  ExternalLink,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ReleaseEvent, ReleasePhase, NotificationLog, PHASE_CONFIG } from '../types/release';
import {
  buildPhaseNotificationPayload,
  buildGmailComposeUrl,
  buildMailtoUrl
} from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: NotificationLog[];
  events: ReleaseEvent[];
  onTriggerNotification: (release: ReleaseEvent, phase: ReleasePhase) => void;
  hasCalendarToken?: boolean;
  onOpenGoogleDiagnostics?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  logs,
  events,
  onTriggerNotification,
  hasCalendarToken = false,
  onOpenGoogleDiagnostics
}) => {
  if (!isOpen) return null;

  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(events[0]?.id || '');
  const [selectedPhase, setSelectedPhase] = useState<ReleasePhase>('deployment-window');
  const [copiedType, setCopiedType] = useState<'slack' | 'email' | 'plain' | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>('vicescalop.trabajo@gmail.com');

  const selectedRelease = events.find(e => e.id === selectedReleaseId) || events[0];

  const payloadPreview = selectedRelease
    ? buildPhaseNotificationPayload(
        selectedRelease,
        selectedPhase,
        selectedRelease.involvedMembers.filter(m => m.phase === selectedPhase || m.phase === 'all')
      )
    : null;

  const handleCopy = (text: string, type: 'slack' | 'email' | 'plain') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDispatch = () => {
    if (!selectedRelease) return;
    onTriggerNotification(selectedRelease, selectedPhase);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-emerald-500/20 border border-blue-200 dark:border-emerald-500/30 flex items-center justify-center text-blue-600 dark:text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Centro de Notificaciones Automáticas por Fase</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispara y visualiza alertas para los miembros involucrados en cada etapa del cambio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Dispatch Section */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
              Simular y Enviar Alerta Inmediata a Involucrados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 mb-1">Seleccionar Liberación</label>
                <select
                  value={selectedReleaseId}
                  onChange={e => setSelectedReleaseId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      [{ev.releaseTag}] {ev.title} ({ev.environment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 mb-1">Fase Objetivo de la Notificación</label>
                <select
                  value={selectedPhase}
                  onChange={e => setSelectedPhase(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                >
                  {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient members pill preview */}
            {payloadPreview && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Destinatarios asignados para {PHASE_CONFIG[selectedPhase]?.label}:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-emerald-400">
                    {payloadPreview.recipients.length} miembros
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {payloadPreview.recipients.map((email, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                    >
                      {email}
                    </span>
                  ))}
                  {payloadPreview.recipients.length === 0 && (
                    <span className="text-xs text-slate-500 italic">
                      Sin miembros asignados a esta fase específica (se enviará al Release Owner).
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Payload preview tabs: Slack & Email */}
            {payloadPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-300">
                    Vista Previa de Alerta (Slack / Teams):
                  </span>
                  <button
                    onClick={() => handleCopy(payloadPreview.slackMarkdown, 'slack')}
                    className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 px-2.5 py-1 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                  >
                    {copiedType === 'slack' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar para Slack</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 dark:bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                  {payloadPreview.slackMarkdown}
                </div>

                {/* Email Delivery Validator & Direct Send Actions */}
                <div className="bg-blue-50/70 dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-emerald-400">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>Validador de Envío de Correos (¿Qué se necesita para que lleguen?)</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hasCalendarToken
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {hasCalendarToken ? 'Google Calendar Activo (Envío Automático)' : 'Modo Cliente / Sin Servidor SMTP'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong>¿Por qué no llegaban los correos antes?</strong> Por seguridad, los navegadores web no pueden enviar correos silenciosos (SMTP) por sí solos sin un servidor intermedio o una cuenta autorizada. Para que los correos lleguen realmente a tu bandeja de entrada tienes <strong>3 opciones activas</strong>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">1. Gmail Web (Inmediato)</div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Abre tu Gmail con destinatarios, asunto y ficha técnica precargados listo para enviar.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">2. Cliente Outlook / Mail</div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Abre el correo corporativo instalado en tu equipo con todos los involucrados en <code>Para:</code>.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-slate-900 dark:text-white mb-0.5">3. Google Calendar API</div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Al conectar Google Calendar, Google envía el correo automáticamente (<code>sendUpdates=all</code>).
                      </p>
                    </div>
                  </div>

                  {/* Test Email Input & Direct Send Buttons */}
                  <div className="pt-2 border-t border-blue-200/70 dark:border-slate-800 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Validar envío a tu cuenta o a los miembros de la fase:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={testRecipientEmail}
                        onChange={e => setTestRecipientEmail(e.target.value)}
                        placeholder="Tu correo de prueba (ej. vicescalop.trabajo@gmail.com)"
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-white"
                      />
                      <a
                        href={buildGmailComposeUrl(payloadPreview, testRecipientEmail)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleDispatch}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar Ahora por Gmail Web</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={buildMailtoUrl(payloadPreview, testRecipientEmail)}
                        onClick={handleDispatch}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Send className="w-3.5 h-3.5 text-orange-500" />
                        <span>Abrir en Correo / Outlook</span>
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <a
                        href={buildGmailComposeUrl(payloadPreview)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleDispatch}
                        className="text-blue-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Enviar a todos los {payloadPreview.recipients.length} miembros asignados de esta fase vía Gmail</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {!hasCalendarToken && onOpenGoogleDiagnostics && (
                        <button
                          type="button"
                          onClick={onOpenGoogleDiagnostics}
                          className="text-orange-600 dark:text-orange-400 hover:underline font-bold cursor-pointer"
                        >
                          Ver requisitos de TI para envío 100% automático →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDispatch}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 dark:from-emerald-600 dark:to-teal-600 dark:hover:from-emerald-500 dark:hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 dark:shadow-emerald-600/20 cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Registrar Alerta de Fase en Bitácora de Auditoría</span>
                </button>
              </div>
            )}
          </div>

          {/* Audit Log / History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Historial de Notificaciones Disparadas ({logs.length})
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 max-h-56 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {log.releaseTag}
                      </span>
                      <span className="font-bold text-blue-700 dark:text-emerald-400">
                        {PHASE_CONFIG[log.phase]?.label || log.phase}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">{log.summary}</p>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-md">
                      Para: {log.recipients.join(', ')}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 dark:bg-emerald-500/20 text-blue-700 dark:text-emerald-300 border border-blue-200 dark:border-emerald-500/30">
                    {log.channel}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Aún no se han disparado notificaciones automáticas en esta sesión.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

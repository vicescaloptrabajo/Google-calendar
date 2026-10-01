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
  Calendar as CalendarIcon
} from 'lucide-react';
import { ReleaseEvent, ReleasePhase, NotificationLog, PHASE_CONFIG } from '../types/release';
import { buildPhaseNotificationPayload, dispatchPhaseNotification } from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: NotificationLog[];
  events: ReleaseEvent[];
  onTriggerNotification: (release: ReleaseEvent, phase: ReleasePhase) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  logs,
  events,
  onTriggerNotification
}) => {
  if (!isOpen) return null;

  const [selectedReleaseId, setSelectedReleaseId] = useState<string>(events[0]?.id || '');
  const [selectedPhase, setSelectedPhase] = useState<ReleasePhase>('deployment-window');
  const [copiedType, setCopiedType] = useState<'slack' | 'email' | 'plain' | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Centro de Notificaciones Automáticas por Fase</h3>
              <p className="text-xs text-slate-400">
                Dispara y visualiza alertas para los miembros involucrados en cada etapa del cambio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Dispatch Section */}
          <div className="bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              Simular y Enviar Alerta Inmediata a Involucrados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Liberación</label>
                <select
                  value={selectedReleaseId}
                  onChange={e => setSelectedReleaseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      [{ev.releaseTag}] {ev.title} ({ev.environment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fase Objetivo de la Notificación</label>
                <select
                  value={selectedPhase}
                  onChange={e => setSelectedPhase(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient members pill preview */}
            {payloadPreview && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Destinatarios asignados para {PHASE_CONFIG[selectedPhase]?.label}:
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {payloadPreview.recipients.length} miembros
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {payloadPreview.recipients.map((email, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
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
                  <span className="text-xs font-semibold text-slate-300">
                    Vista Previa de Alerta (Slack / Teams):
                  </span>
                  <button
                    onClick={() => handleCopy(payloadPreview.slackMarkdown, 'slack')}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
                  >
                    {copiedType === 'slack' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
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

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                  {payloadPreview.slackMarkdown}
                </div>

                <button
                  onClick={handleDispatch}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Disparar Notificación y Registrar en Historial</span>
                </button>
              </div>
            )}
          </div>

          {/* Audit Log / History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-blue-400" />
              Historial de Notificaciones Disparadas ({logs.length})
            </h4>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-850 max-h-56 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {log.releaseTag}
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {PHASE_CONFIG[log.phase]?.label || log.phase}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs">{log.summary}</p>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-md">
                      Para: {log.recipients.join(', ')}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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

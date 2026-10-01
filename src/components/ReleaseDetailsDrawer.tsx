import React from 'react';
import { 
  X, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  ShieldAlert, 
  RotateCcw, 
  Users, 
  CheckCircle2, 
  Bell, 
  Send, 
  Calendar as CalendarIcon, 
  ArrowRight, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { ReleaseEvent, ReleasePhase, PHASE_CONFIG } from '../types/release';

interface ReleaseDetailsDrawerProps {
  isOpen: boolean;
  event: ReleaseEvent | null;
  onClose: () => void;
  onEdit: (event: ReleaseEvent) => void;
  onDelete: (event: ReleaseEvent) => void;
  onToggleChecklist: (eventId: string, checklistId: string) => void;
  onTriggerNotification: (event: ReleaseEvent, phase: ReleasePhase) => void;
}

export const ReleaseDetailsDrawer: React.FC<ReleaseDetailsDrawerProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete,
  onToggleChecklist,
  onTriggerNotification
}) => {
  if (!isOpen || !event) return null;

  const phaseMeta = PHASE_CONFIG[event.phase] || { label: event.phase, color: '#10b981' };
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const now = new Date();

  // Status computation
  const isPast = endDate < now;
  const isOngoing = startDate <= now && endDate >= now;
  const isFuture = startDate > now;

  const completedChecklist = event.checklist.filter(c => c.completed).length;
  const totalChecklist = event.checklist.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div 
          className="p-5 border-b border-slate-800 bg-slate-850 flex items-start justify-between relative"
          style={{ borderTop: `4px solid ${event.color || phaseMeta.color}` }}
        >
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs bg-slate-800 text-white px-2.5 py-0.5 rounded border border-slate-700">
                {event.releaseTag}
              </span>
              <span className="font-mono text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                {event.changeTicketId}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  event.environment === 'production'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {event.environment}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mt-1">
              {event.title}
            </h3>
            <p className="text-xs text-emerald-400 font-medium">
              Servicio: <span className="text-slate-200">{event.service}</span>
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(event)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Editar liberación"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(event)}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Eliminar liberación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Phase & Window banner */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: event.color || phaseMeta.color }}
                ></span>
                <span className="text-sm font-bold text-white">
                  {phaseMeta.label}
                </span>
              </div>

              {/* Status pill */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isOngoing ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' :
                isPast ? 'bg-slate-800 text-slate-400' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {isOngoing ? '● En Ejecución' : isPast ? 'Finalizado' : 'Programado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Inicio de Ventana:</span>
                <span className="font-semibold text-slate-200">
                  {startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Fin de Ventana:</span>
                <span className="font-semibold text-slate-200">
                  {endDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Quick action: trigger notification */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Notificaciones automáticas para miembros:
              </span>
              <button
                onClick={() => onTriggerNotification(event, event.phase)}
                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3 h-3" />
                <span>Notificar Fase Actual</span>
              </button>
            </div>
          </div>

          {/* Key Change Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Riesgo</span>
              <span className={`text-xs font-bold uppercase mt-0.5 inline-block ${
                event.risk === 'critical' ? 'text-rose-400' :
                event.risk === 'high' ? 'text-amber-400' :
                event.risk === 'medium' ? 'text-yellow-400' : 'text-emerald-400'
              }`}>
                {event.risk}
              </span>
            </div>

            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Comité CAB</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 inline-block capitalize">
                {event.cabStatus}
              </span>
            </div>

            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Indisponibilidad</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 inline-block">
                {event.downtimeExpectedMinutes > 0 ? `${event.downtimeExpectedMinutes}m` : 'Zero-Downtime'}
              </span>
            </div>

            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Est. Rollback</span>
              <span className="text-xs font-bold text-rose-400 mt-0.5 inline-block">
                {event.rollbackEstimateMinutes} min
              </span>
            </div>
          </div>

          {/* Rollback Procedure Card */}
          <div className="bg-slate-850 p-4 rounded-xl border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                Plan de Contingencia / Reversión (Rollback)
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono">
                {event.rollbackEstimateMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
              {event.rollbackPlan}
            </p>
          </div>

          {/* Validation Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Checklist de Liberación ({completedChecklist}/{totalChecklist})
              </h4>
              <span className="text-xs font-semibold text-emerald-400">{checklistPercent}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${checklistPercent}%` }}
              ></div>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-850">
              {event.checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => onToggleChecklist(event.id, item.id)}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className={item.completed ? 'line-through text-slate-400' : 'font-medium'}>
                      {item.title}
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.phase}
                    </span>
                    {item.assignedTo && (
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded hidden sm:inline">
                        {item.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Involved Team Members Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Miembros Involucrados por Fase ({event.involvedMembers.length})
            </h4>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-850">
              {event.involvedMembers.map(member => (
                <div key={member.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{member.name}</div>
                      <div className="text-[10px] text-slate-400">{member.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-300">{member.role}</div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {member.phase === 'all' ? 'Todas Fases' : PHASE_CONFIG[member.phase]?.label.split(' ')[0] || member.phase}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Enlaces de Liberación</h4>
            <div className="space-y-1.5">
              {event.runbookUrl && (
                <a
                  href={event.runbookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Runbook de Despliegue</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {event.jiraTicketUrl && (
                <a
                  href={event.jiraTicketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ticket Jira ({event.changeTicketId})</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {event.htmlLink && (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Abrir en Google Calendar Web</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Owner: <strong>{event.owner.name}</strong>
          </div>
          <button
            onClick={() => onEdit(event)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Detalles</span>
          </button>
        </div>
      </div>
    </div>
  );
};

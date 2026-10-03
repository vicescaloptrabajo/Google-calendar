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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 transition-colors"
      >
        {/* Drawer Header */}
        <div 
          className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-start justify-between relative"
          style={{ borderTop: `4px solid ${event.color || phaseMeta.color}` }}
        >
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                {event.releaseTag}
              </span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {event.changeTicketId}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  event.environment === 'production'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {event.environment}
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {event.title}
            </h3>
            <p className="text-xs text-blue-700 dark:text-emerald-400 font-semibold">
              Servicio: <span className="text-slate-800 dark:text-slate-200">{event.service}</span>
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(event)}
              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Editar liberación"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(event)}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Eliminar liberación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Phase & Window banner */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-xs"
                  style={{ backgroundColor: event.color || phaseMeta.color }}
                ></span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {phaseMeta.label}
                </span>
              </div>

              {/* Status pill */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isOngoing ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 animate-pulse' :
                isPast ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
                {isOngoing ? '● En Ejecución' : isPast ? 'Finalizado' : 'Programado'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Inicio de Ventana:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {startDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Fin de Ventana:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {endDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Quick action: trigger notification */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Notificaciones automáticas para miembros:
              </span>
              <button
                onClick={() => onTriggerNotification(event, event.phase)}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Notificar Fase Actual</span>
              </button>
            </div>
          </div>

          {/* Key Change Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Riesgo</span>
              <span className={`text-xs font-bold uppercase mt-0.5 inline-block ${
                event.risk === 'critical' ? 'text-rose-600 dark:text-rose-400' :
                event.risk === 'high' ? 'text-amber-600 dark:text-amber-400' :
                event.risk === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {event.risk}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Comité CAB</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-block capitalize">
                {event.cabStatus}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Indisponibilidad</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-block">
                {event.downtimeExpectedMinutes > 0 ? `${event.downtimeExpectedMinutes}m` : 'Zero-Downtime'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Est. Rollback</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5 inline-block">
                {event.rollbackEstimateMinutes} min
              </span>
            </div>
          </div>

          {/* Rollback Procedure Card */}
          <div className="bg-rose-50/60 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                Plan de Contingencia / Reversión (Rollback)
              </div>
              <span className="text-[10px] bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded font-mono font-bold border border-rose-200 dark:border-rose-800">
                {event.rollbackEstimateMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium">
              {event.rollbackPlan}
            </p>
          </div>

          {/* Validation Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-emerald-400" />
                Checklist de Liberación ({completedChecklist}/{totalChecklist})
              </h4>
              <span className="text-xs font-bold text-blue-600 dark:text-emerald-400">{checklistPercent}%</span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all"
                style={{ width: `${checklistPercent}%` }}
              ></div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              {event.checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => onToggleChecklist(event.id, item.id)}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className={item.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'}>
                      {item.title}
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.phase}
                    </span>
                    {item.assignedTo && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded hidden sm:inline border border-slate-200 dark:border-slate-700">
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
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600 dark:text-emerald-400" />
              Miembros Involucrados por Fase ({event.involvedMembers.length})
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              {event.involvedMembers.map(member => (
                <div key={member.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-emerald-400">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{member.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{member.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{member.role}</div>
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-blue-200 dark:border-blue-800">
                      {member.phase === 'all' ? 'Todas Fases' : PHASE_CONFIG[member.phase]?.label.split(' ')[0] || member.phase}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Enlaces de Liberación</h4>
            <div className="space-y-1.5">
              {event.runbookUrl && (
                <a
                  href={event.runbookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                    <span className="font-semibold">Runbook de Despliegue</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {event.jiraTicketUrl && (
                <a
                  href={event.jiraTicketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold">Ticket Jira ({event.changeTicketId})</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
              {event.htmlLink && (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Abrir en Google Calendar Web</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Owner: <strong className="text-slate-800 dark:text-slate-200">{event.owner.name}</strong>
          </div>
          <button
            onClick={() => onEdit(event)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Detalles</span>
          </button>
        </div>
      </div>
    </div>
  );
};

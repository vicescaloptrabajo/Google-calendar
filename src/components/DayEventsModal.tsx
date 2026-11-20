import React from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { ReleaseEvent, PHASE_CONFIG } from '../types/release';

interface DayEventsModalProps {
  isOpen: boolean;
  date: Date | null;
  events: ReleaseEvent[];
  onClose: () => void;
  onSelectEvent: (event: ReleaseEvent) => void;
  onCreateAtDate: (date: Date) => void;
}

export const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  date,
  events,
  onClose,
  onSelectEvent,
  onCreateAtDate
}) => {
  if (!isOpen || !date) return null;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const formattedDate = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const prodOrCriticalCount = sortedEvents.filter(
    ev => ev.environment === 'production' || ev.risk === 'high' || ev.risk === 'critical'
  ).length;
  const hasCollision = prodOrCriticalCount >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header (styled like ReleaseModal) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-emerald-600 dark:to-teal-600 flex items-center justify-center shadow-md font-bold text-white shrink-0">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {capitalizedDate}
                </h3>
                {hasCollision && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Ventana con conflicto
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sortedEvents.length === 0
                  ? 'Sin cambios programados para esta fecha'
                  : `${sortedEvents.length} ${sortedEvents.length === 1 ? 'cambio programado' : 'cambios programados'} — haz clic en cualquiera para ver su detalle`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Day Changes List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {sortedEvents.length > 0 ? (
            sortedEvents.map(event => {
              const phaseMeta = PHASE_CONFIG[event.phase] || { label: event.phase, color: '#2563eb' };
              const startStr = new Date(event.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const endStr = new Date(event.endTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const selectedTasks = (event.checklist || []).filter(c => c.includeInCalendar === true);

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectEvent(event);
                  }}
                  style={{ borderLeftColor: event.color || phaseMeta.color }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-emerald-600 border-l-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {event.releaseTag}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                        {event.changeTicketId}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          event.environment === 'production'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : event.environment === 'staging'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {event.environment}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {phaseMeta.label}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                      <span>Ver detalle</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-emerald-400 transition-colors">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Servicio: <strong className="text-slate-800 dark:text-slate-200">{event.service}</strong>
                    </p>
                  </div>

                  {selectedTasks.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1">
                      {selectedTasks.map(task => (
                        <div
                          key={task.id}
                          className="text-[11px] text-blue-800 dark:text-emerald-300 font-medium flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {startStr} - {endStr}
                      </span>
                      <span>
                        Owner: <strong className="text-slate-800 dark:text-slate-200">{event.owner.name}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {event.involvedMembers.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          event.risk === 'critical'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : event.risk === 'high'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : event.risk === 'medium'
                            ? 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        Riesgo {event.risk}
                      </span>
                      {event.cabStatus === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CAB
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-10 px-4 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
              <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  No hay cambios programados en esta fecha
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Puedes programar una nueva liberación o cambio directamente para este día.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateAtDate(date);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar Liberación este día</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateAtDate(date);
            }}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Liberación en esta fecha</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

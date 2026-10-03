import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  Send, 
  ShieldCheck, 
  Users, 
  Calendar as CalendarIcon, 
  Sparkles 
} from 'lucide-react';
import { ReleaseEvent, ReleasePhase, Environment, PHASE_CONFIG } from '../types/release';

interface PipelineViewProps {
  events: ReleaseEvent[];
  onSelectEvent: (event: ReleaseEvent) => void;
  onAdvancePhase: (event: ReleaseEvent, nextPhase: ReleasePhase) => void;
  selectedEnv: Environment | 'all';
  onSelectEnv?: (env: Environment | 'all') => void;
}

const PIPELINE_COLUMNS: { phase: ReleasePhase; label: string; nextPhase?: ReleasePhase }[] = [
  { phase: 'planning', label: '1. Planificación', nextPhase: 'code-freeze' },
  { phase: 'code-freeze', label: '2. Code Freeze', nextPhase: 'cab-review' },
  { phase: 'cab-review', label: '3. Revisión CAB', nextPhase: 'deployment-window' },
  { phase: 'deployment-window', label: '4. En Despliegue', nextPhase: 'smoke-testing' },
  { phase: 'smoke-testing', label: '5. Smoke Testing', nextPhase: 'completed' },
  { phase: 'completed', label: '6. Liberación Exitosa' }
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  events,
  onSelectEvent,
  onAdvancePhase,
  selectedEnv,
  onSelectEnv
}) => {
  const filteredEvents = events.filter(e => {
    if (selectedEnv !== 'all' && e.environment !== selectedEnv) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            Pipeline de Ciclo de Vida del Cambio
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
              {filteredEvents.length} en curso
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Avanza una liberación a la siguiente fase para disparar las notificaciones automáticas.
          </p>
        </div>

        {onSelectEnv && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-inner text-xs shrink-0">
            {(['all', 'production', 'staging', 'pre-prod'] as const).map(env => (
              <button
                key={env}
                onClick={() => onSelectEnv(env)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedEnv === env
                    ? env === 'production'
                      ? 'bg-white dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-xs font-bold'
                      : 'bg-white dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                {env === 'all' ? 'Todos' : env === 'production' ? 'Prod' : env}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map(col => {
          const colEvents = filteredEvents.filter(e => e.phase === col.phase);
          const meta = PHASE_CONFIG[col.phase];

          return (
            <div
              key={col.phase}
              className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 flex flex-col h-[700px] shadow-2xs transition-colors"
            >
              {/* Column Header */}
              <div 
                className="pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"
                style={{ borderBottomColor: `${meta?.color || '#2563eb'}44` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: meta?.color || '#2563eb' }}
                  ></span>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.label}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                  {colEvents.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {colEvents.map(event => {
                  const completedChecklist = event.checklist.filter(c => c.completed).length;
                  const totalChecklist = event.checklist.length;
                  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 100;

                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 rounded-xl p-3 shadow-2xs cursor-pointer transition-all hover:scale-[1.01] group space-y-2.5"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {event.releaseTag}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            event.environment === 'production'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          {event.environment}
                        </span>
                      </div>

                      {/* Title & Service */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {event.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{event.service}</p>
                      </div>

                      {/* Checklist progress */}
                      {totalChecklist > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Checklist ({completedChecklist}/{totalChecklist})</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{checklistPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-orange-500 h-full rounded-full transition-all"
                              style={{ width: `${checklistPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Footer: Date & Risk & Team count */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {event.involvedMembers.length} involucrados
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            event.risk === 'critical' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                            event.risk === 'high' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                            event.risk === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {event.risk}
                        </span>
                      </div>

                      {/* Advance Phase Button */}
                      {col.nextPhase && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdvancePhase(event, col.nextPhase!);
                          }}
                          className="w-full py-1.5 px-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 hover:text-white dark:hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-800 hover:border-blue-600 transition-all cursor-pointer"
                          title="Avanzar fase y notificar miembros involucrados"
                        >
                          <span>Avanzar a {PHASE_CONFIG[col.nextPhase]?.label.split(' ')[0]}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {colEvents.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/30">
                    <span>Sin liberaciones</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  selectedEnv
}) => {
  const filteredEvents = events.filter(e => {
    if (selectedEnv !== 'all' && e.environment !== selectedEnv) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Pipeline de Ciclo de Vida del Cambio
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Gestión Ágil de Releases
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Avanza una liberación a la siguiente fase para disparar las notificaciones automáticas a los miembros involucrados.
          </p>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map(col => {
          const colEvents = filteredEvents.filter(e => e.phase === col.phase);
          const meta = PHASE_CONFIG[col.phase];

          return (
            <div
              key={col.phase}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col h-[700px] shadow-xl"
            >
              {/* Column Header */}
              <div 
                className="pb-2.5 mb-3 border-b border-slate-800 flex items-center justify-between"
                style={{ borderBottomColor: `${meta?.color || '#3b82f6'}44` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: meta?.color || '#3b82f6' }}
                  ></span>
                  <h3 className="text-xs font-bold text-slate-200">{col.label}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
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
                      className="bg-slate-850 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-xl p-3 shadow-md cursor-pointer transition-all hover:scale-[1.01] group space-y-2.5"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {event.releaseTag}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            event.environment === 'production'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {event.environment}
                        </span>
                      </div>

                      {/* Title & Service */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {event.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{event.service}</p>
                      </div>

                      {/* Checklist progress */}
                      {totalChecklist > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>Checklist ({completedChecklist}/{totalChecklist})</span>
                            <span className="font-semibold text-slate-300">{checklistPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${checklistPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Footer: Date & Risk & Team count */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          {event.involvedMembers.length} involucrados
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            event.risk === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                            event.risk === 'high' ? 'bg-amber-500/20 text-amber-400' :
                            event.risk === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-emerald-500/20 text-emerald-400'
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
                          className="w-full py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer"
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
                  <div className="h-32 flex flex-col items-center justify-center text-slate-600 text-xs border-2 border-dashed border-slate-800/80 rounded-xl">
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

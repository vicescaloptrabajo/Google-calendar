import React, { useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Users 
} from 'lucide-react';
import { ReleaseEvent, Environment, PHASE_CONFIG } from '../types/release';

interface CalendarWeekViewProps {
  events: ReleaseEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: ReleaseEvent) => void;
  onCreateAtDate: (date: Date) => void;
  selectedEnv: Environment | 'all';
  onSelectEnv?: (env: Environment | 'all') => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onCreateAtDate,
  selectedEnv,
  onSelectEnv
}) => {
  // Compute start of week (Monday)
  const weekStart = useMemo(() => {
    const d = new Date(selectedDate);
    const day = (d.getDay() + 6) % 7; // 0 is Monday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  // 7 days of the week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    onSelectDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    onSelectDate(next);
  };

  // Filter events by environment
  const filteredEvents = useMemo(() => {
    if (selectedEnv === 'all') return events;
    return events.filter(e => e.environment === selectedEnv);
  }, [events, selectedEnv]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-4">
      {/* Header Navigator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectDate(new Date())}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            Semana del {weekDays[0].toLocaleDateString([], { day: 'numeric', month: 'short' })} al {weekDays[6].toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {onSelectEnv && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-inner text-xs">
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
          
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 hidden md:inline-block">
            Línea Temporal
          </span>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs transition-colors">
        <div className="min-w-[850px]">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-10">
            <div className="p-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">Hora</div>
            {weekDays.map((day, idx) => {
              const isToday = new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0];
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-l border-slate-200 dark:border-slate-800 ${
                    isToday ? 'bg-orange-50/50 dark:bg-orange-950/30' : ''
                  }`}
                >
                  <div className={`text-xs font-semibold ${isToday ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{dayNames[idx]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-orange-600 dark:text-orange-400 font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                    {day.getDate()} {day.toLocaleDateString([], { month: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hourly rows with plotted events */}
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[52px] border-b border-slate-100 dark:border-slate-800/80">
                {/* Hour label */}
                <div className="p-2 text-right text-[11px] font-mono text-slate-400 dark:text-slate-500 select-none">
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* Day cells for this hour */}
                {weekDays.map((day, dIdx) => {
                  const dayIso = day.toISOString().split('T')[0];
                  
                  // Find events occurring in or starting in this hour on this day
                  const matchingEvents = filteredEvents.filter(ev => {
                    const evStart = new Date(ev.startTime);
                    const evDayIso = evStart.toISOString().split('T')[0];
                    if (evDayIso !== dayIso) return false;
                    return evStart.getHours() === hour;
                  });

                  return (
                    <div
                      key={dIdx}
                      onClick={() => {
                        const targetDate = new Date(day);
                        targetDate.setHours(hour, 0, 0, 0);
                        onCreateAtDate(targetDate);
                      }}
                      className="border-l border-slate-200 dark:border-slate-800 p-1 relative hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      {matchingEvents.map(event => {
                        const phaseMeta = PHASE_CONFIG[event.phase] || { label: event.phase, color: '#2563eb' };
                        const start = new Date(event.startTime);
                        const end = new Date(event.endTime);
                        const durationMinutes = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(event);
                            }}
                            style={{
                              backgroundColor: `${event.color || phaseMeta.color}15`,
                              borderColor: event.color || phaseMeta.color,
                            }}
                            className="p-1.5 rounded-lg border-l-4 border shadow-2xs text-left transition-all hover:scale-[1.02] hover:z-20 relative cursor-pointer mb-1 bg-white dark:bg-slate-800"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white truncate">
                                {event.releaseTag}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {durationMinutes}m
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                              {event.title}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>{event.service}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                event.risk === 'critical' ? 'bg-rose-500' :
                                event.risk === 'high' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

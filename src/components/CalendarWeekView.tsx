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
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onCreateAtDate,
  selectedEnv
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">
            Semana del {weekDays[0].toLocaleDateString([], { day: 'numeric', month: 'short' })} al {weekDays[6].toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Línea Temporal de Ventanas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectDate(new Date())}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-2xl">
        <div className="min-w-[850px]">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-slate-850 border-b border-slate-800 sticky top-0 z-10">
            <div className="p-3 text-center text-xs font-bold text-slate-500">Hora</div>
            {weekDays.map((day, idx) => {
              const isToday = new Date().toISOString().split('T')[0] === day.toISOString().split('T')[0];
              return (
                <div
                  key={idx}
                  className={`p-3 text-center border-l border-slate-800/80 ${
                    isToday ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="text-xs text-slate-400 font-medium">{dayNames[idx]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {day.getDate()} {day.toLocaleDateString([], { month: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hourly rows with plotted events */}
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[52px] border-b border-slate-800/40">
                {/* Hour label */}
                <div className="p-2 text-right text-[11px] font-mono text-slate-500 select-none">
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
                      className="border-l border-slate-800/60 p-1 relative hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    >
                      {matchingEvents.map(event => {
                        const phaseMeta = PHASE_CONFIG[event.phase] || { label: event.phase, color: '#10b981' };
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
                              backgroundColor: `${event.color || phaseMeta.color}22`,
                              borderColor: event.color || phaseMeta.color,
                            }}
                            className="p-1.5 rounded-lg border-l-4 border shadow-md text-left transition-all hover:scale-[1.02] hover:z-20 relative cursor-pointer mb-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-mono font-bold text-white truncate">
                                {event.releaseTag}
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1 rounded bg-slate-900/60 text-slate-300">
                                {durationMinutes}m
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-200 truncate mt-0.5">
                              {event.title}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                              <span>{event.service}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                event.risk === 'critical' ? 'bg-rose-500' :
                                event.risk === 'high' ? 'bg-amber-500' : 'bg-emerald-400'
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

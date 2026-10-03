import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Users, 
  Radio, 
  Sparkles,
  Info,
  Palette,
  RotateCcw
} from 'lucide-react';
import { ReleaseEvent, ReleasePhase, Environment, RiskLevel, PHASE_CONFIG, COLOR_PALETTE } from '../types/release';

interface CalendarMonthViewProps {
  events: ReleaseEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: ReleaseEvent) => void;
  onCreateAtDate: (date: Date) => void;
  selectedEnv: Environment | 'all';
  onSelectEnv?: (env: Environment | 'all') => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  onCreateAtDate,
  selectedEnv,
  onSelectEnv
}) => {
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<ReleasePhase | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [showLegend, setShowLegend] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onSelectDate(today);
  };

  // Filter events based on active filters
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Env
      if (selectedEnv !== 'all' && e.environment !== selectedEnv) return false;
      // Phase
      if (phaseFilter !== 'all' && e.phase !== phaseFilter) return false;
      // Risk
      if (riskFilter !== 'all' && e.risk !== riskFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesTag = e.releaseTag.toLowerCase().includes(q);
        const matchesTicket = e.changeTicketId.toLowerCase().includes(q);
        const matchesService = e.service.toLowerCase().includes(q);
        const matchesOwner = e.owner.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTag && !matchesTicket && !matchesService && !matchesOwner) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedEnv, phaseFilter, riskFilter, searchQuery]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday as start of week: 0 = Mon, ..., 6 = Sun
    let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const prevDays = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      prevDays.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    const currentDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      currentDays.push({
        date: new Date(currentYear, currentMonth, d),
        isCurrentMonth: true
      });
    }

    // Next month filler days to complete 35 or 42 cells
    const totalFilled = prevDays.length + currentDays.length;
    const remaining = (7 - (totalFilled % 7)) % 7;
    const nextDays = [];
    for (let n = 1; n <= remaining; n++) {
      nextDays.push({
        date: new Date(currentYear, currentMonth + 1, n),
        isCurrentMonth: false
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentYear, currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(e => {
      const eDate = e.startTime.split('T')[0];
      return eDate === dateStr;
    });
  };

  // Detect release collision: multiple production or critical events on same day
  const dayCollisions = useMemo(() => {
    const collisions: Record<string, ReleaseEvent[]> = {};
    filteredEvents.forEach(e => {
      const dateKey = e.startTime.split('T')[0];
      if (!collisions[dateKey]) collisions[dateKey] = [];
      collisions[dateKey].push(e);
    });

    const flaggedDates: Record<string, boolean> = {};
    Object.entries(collisions).forEach(([dateStr, dayEvents]) => {
      const prodOrHigh = dayEvents.filter(
        ev => ev.environment === 'production' || ev.risk === 'high' || ev.risk === 'critical'
      );
      if (prodOrHigh.length >= 2) {
        flaggedDates[dateStr] = true;
      }
    });
    return flaggedDates;
  }, [filteredEvents]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-3.5">
        {/* Tier 1: Month Nav + Environment Switcher + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-950/70 rounded-xl p-1 border border-slate-800 shadow-inner">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                {monthNames[currentMonth]} <span className="text-emerald-400">{currentYear}</span>
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/60">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'liberación' : 'liberaciones'}
              </span>
            </div>
          </div>

          {/* Right cluster: Environments + Search */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Environment Filter Selector Chips */}
            {onSelectEnv && (
              <div className="flex items-center bg-slate-950/70 rounded-xl p-1 border border-slate-800 shadow-inner text-xs">
                {(['all', 'production', 'staging', 'pre-prod'] as const).map(env => (
                  <button
                    key={env}
                    onClick={() => onSelectEnv(env)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedEnv === env
                        ? env === 'production'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {env === 'all' ? 'Todos' : env === 'production' ? 'Prod' : env}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar ticket, servicio..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tier 2: Refined Filters Strip & Utilities */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Filtrar:</span>
            
            {/* Phase filter */}
            <select
              value={phaseFilter}
              onChange={e => setPhaseFilter(e.target.value as any)}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="all">Todas las Fases ({Object.keys(PHASE_CONFIG).length})</option>
              {Object.entries(PHASE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Risk filter */}
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value as any)}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="all">Todos los Riesgos</option>
              <option value="critical">🔴 Riesgo Crítico</option>
              <option value="high">🟠 Riesgo Alto</option>
              <option value="medium">🟡 Riesgo Medio</option>
              <option value="low">🟢 Riesgo Bajo</option>
            </select>

            {/* Toggle Color Legend button */}
            <button
              onClick={() => setShowLegend(s => !s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all ${
                showLegend
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span>Código de Colores</span>
              <span className="text-[10px] text-slate-500">({showLegend ? 'Ocultar' : 'Ver'})</span>
            </button>

            {/* Reset Filters button if any filter is active */}
            {(phaseFilter !== 'all' || riskFilter !== 'all' || searchQuery || selectedEnv !== 'all') && (
              <button
                onClick={() => {
                  setPhaseFilter('all');
                  setRiskFilter('all');
                  setSearchQuery('');
                  if (onSelectEnv) onSelectEnv('all');
                }}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

          {/* Right indicator: Collisions warning if any */}
          {Object.keys(dayCollisions).length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{Object.keys(dayCollisions).length} ventana(s) en colisión detectadas</span>
            </div>
          )}
        </div>

        {/* Phase Color Code Legend Card (Collapsible) */}
        {showLegend && (
          <div className="pt-3 border-t border-slate-800/70 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  Filtro Rápido por Código de Fase:
                </span>
                <span className="text-[10px] text-slate-400">Haz clic en una fase para filtrar el calendario</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 text-[11px]">
                {Object.entries(PHASE_CONFIG).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setPhaseFilter(phaseFilter === key ? 'all' : key as ReleasePhase)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                      phaseFilter === key
                        ? 'ring-2 ring-white font-bold scale-[1.02]'
                        : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                    }`}
                    style={{
                      backgroundColor: meta.bgLight,
                      borderColor: meta.borderColor,
                      color: meta.color
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: meta.color }} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-slate-800/60 border-b border-slate-800 text-center py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {weekDayNames.map(day => (
            <div key={day} className="first:text-emerald-400/80">{day}</div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr gap-px bg-slate-800/50">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;
            const dayEvents = getEventsForDay(date);
            const hasCollision = dayCollisions[dateStr];

            return (
              <div
                key={index}
                onClick={() => {
                  onSelectDate(date);
                }}
                className={`min-h-[120px] sm:min-h-[145px] p-1.5 sm:p-2 bg-slate-900/90 flex flex-col justify-between transition-colors relative group hover:bg-slate-850 ${
                  !isCurrentMonth ? 'opacity-35 bg-slate-950/60' : ''
                } ${isSelected ? 'ring-2 ring-emerald-500 z-10' : ''}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                        isToday
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                          : isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {/* Collision Warning Indicator */}
                    {hasCollision && (
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5 animate-pulse"
                        title="¡Alerta de Colisión! Múltiples cambios críticos o de producción programados para esta fecha."
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                        Conflicto
                      </span>
                    )}
                  </div>

                  {/* Add Event Quick Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAtDate(date);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-400 p-1 hover:bg-slate-800 rounded transition-all text-[11px]"
                    title="Programar liberación en esta fecha"
                  >
                    +
                  </button>
                </div>

                {/* Day Events Stack */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[105px] pr-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    const phaseMeta = PHASE_CONFIG[event.phase] || { label: event.phase, color: '#10b981' };
                    const startTimeFormatted = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        style={{
                          borderLeftColor: event.color || phaseMeta.color,
                        }}
                        className="text-left p-1.5 rounded bg-slate-800/90 hover:bg-slate-750 border-l-4 border-slate-700/80 shadow-xs cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] font-mono font-bold text-slate-100 truncate">
                            {event.releaseTag}
                          </span>
                          <span
                            className={`text-[8px] font-bold uppercase px-1 rounded ${
                              event.environment === 'production'
                                ? 'bg-rose-500/20 text-rose-300'
                                : event.environment === 'staging'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {event.environment.substring(0, 4)}
                          </span>
                        </div>

                        <div className="text-[11px] font-medium text-slate-200 line-clamp-1">
                          {event.title}
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            {startTimeFormatted}
                          </span>

                          <span className="flex items-center gap-1">
                            {/* Risk dot */}
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                event.risk === 'critical' ? 'bg-red-500 ring-1 ring-red-400' :
                                event.risk === 'high' ? 'bg-amber-500' :
                                event.risk === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                              }`}
                              title={`Riesgo: ${event.risk}`}
                            ></span>
                            {/* CAB icon */}
                            {event.cabStatus === 'approved' ? (
                              <span title="Aprobado por CAB">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              </span>
                            ) : event.cabStatus === 'pending' ? (
                              <span title="Pendiente de aprobación CAB">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Show +N more if over limit */}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={() => onSelectDate(date)}
                      className="w-full text-center text-[10px] text-emerald-400 font-semibold py-0.5 bg-slate-800/80 rounded hover:bg-slate-750"
                    >
                      +{dayEvents.length - 3} más
                    </button>
                  )}
                </div>

                {/* Empty state hint */}
                {dayEvents.length === 0 && (
                  <div className="text-center py-2 text-[10px] text-slate-600 select-none">
                    Sin cambios
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

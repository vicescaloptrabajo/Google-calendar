import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Users, 
  Bell, 
  Link as LinkIcon, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  ReleaseEvent, 
  ReleasePhase, 
  Environment, 
  RiskLevel, 
  CABStatus, 
  TeamMember, 
  ChecklistItem, 
  PHASE_CONFIG, 
  COLOR_PALETTE 
} from '../types/release';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: ReleaseEvent) => Promise<void>;
  initialEvent?: ReleaseEvent | null;
  initialDate?: Date;
  hasCalendarToken: boolean;
}

export const ReleaseModal: React.FC<ReleaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  initialDate,
  hasCalendarToken
}) => {
  if (!isOpen) return null;

  // Active tab in modal
  const [activeTab, setActiveTab] = useState<'details' | 'risk' | 'team' | 'checklist'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [releaseTag, setReleaseTag] = useState(initialEvent?.releaseTag || 'v1.0.0');
  const [changeTicketId, setChangeTicketId] = useState(initialEvent?.changeTicketId || `CHG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [service, setService] = useState(initialEvent?.service || 'API Core Gateway');
  const [environment, setEnvironment] = useState<Environment>(initialEvent?.environment || 'production');
  const [phase, setPhase] = useState<ReleasePhase>(initialEvent?.phase || 'deployment-window');
  const [risk, setRisk] = useState<RiskLevel>(initialEvent?.risk || 'medium');
  const [cabStatus, setCabStatus] = useState<CABStatus>(initialEvent?.cabStatus || 'approved');
  
  // Date and Time calculation
  const defaultStart = initialDate ? new Date(initialDate) : new Date();
  if (!initialEvent && initialDate) {
    defaultStart.setHours(20, 0, 0, 0);
  }
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const [startTime, setStartTime] = useState(
    initialEvent?.startTime ? new Date(initialEvent.startTime).toISOString().slice(0, 16) : defaultStart.toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    initialEvent?.endTime ? new Date(initialEvent.endTime).toISOString().slice(0, 16) : defaultEnd.toISOString().slice(0, 16)
  );

  const [color, setColor] = useState(initialEvent?.color || PHASE_CONFIG[phase]?.color || '#10b981');
  const [downtimeExpectedMinutes, setDowntimeExpectedMinutes] = useState(initialEvent?.downtimeExpectedMinutes ?? 0);
  
  // Contingency & Links
  const [rollbackPlan, setRollbackPlan] = useState(
    initialEvent?.rollbackPlan || 'Restauración automática de pods a versión anterior mediante helm rollback y reversión de migraciones en caso de fallar smoke tests.'
  );
  const [rollbackEstimateMinutes, setRollbackEstimateMinutes] = useState(initialEvent?.rollbackEstimateMinutes ?? 10);
  const [runbookUrl, setRunbookUrl] = useState(initialEvent?.runbookUrl || 'https://wiki.company.internal/runbooks/deploy');
  const [jiraTicketUrl, setJiraTicketUrl] = useState(initialEvent?.jiraTicketUrl || 'https://jira.company.internal/browse/REL-');
  const [notes, setNotes] = useState(initialEvent?.notes || '');

  // Owner
  const [ownerName, setOwnerName] = useState(initialEvent?.owner?.name || 'Release Manager');
  const [ownerEmail, setOwnerEmail] = useState(initialEvent?.owner?.email || 'release.manager@company.com');

  // Involved Team Members
  const [involvedMembers, setInvolvedMembers] = useState<TeamMember[]>(
    initialEvent?.involvedMembers || [
      { id: '1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'all', notified: true },
      { id: '2', name: 'DevOps On-Call', email: 'devops.oncall@company.com', role: 'DevOps / SRE', phase: 'deployment-window', notified: false },
      { id: '3', name: 'QA Engineer', email: 'qa.lead@company.com', role: 'QA Lead', phase: 'smoke-testing', notified: false }
    ]
  );

  // New member inputs
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMember['role']>('DevOps / SRE');
  const [newMemberPhase, setNewMemberPhase] = useState<TeamMember['phase']>('deployment-window');

  // Notifications Config
  const [autoNotifyGoogleAttendees, setAutoNotifyGoogleAttendees] = useState(initialEvent?.notificationsConfig?.autoNotifyGoogleAttendees ?? true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(initialEvent?.notificationsConfig?.emailAlertsEnabled ?? true);
  const [popupRemindersEnabled, setPopupRemindersEnabled] = useState(initialEvent?.notificationsConfig?.popupRemindersEnabled ?? true);
  const [notifyOnPhaseChange, setNotifyOnPhaseChange] = useState(initialEvent?.notificationsConfig?.notifyOnPhaseChange ?? true);
  const [remind15m, setRemind15m] = useState(true);
  const [remind1h, setRemind1h] = useState(true);
  const [remind24h, setRemind24h] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialEvent?.checklist || [
      { id: 'c1', title: 'Backup de base de datos y validación de réplicas', phase: 'pre', completed: false, assignedTo: 'DBA' },
      { id: 'c2', title: 'Aprobación del comité de cambios (CAB Sign-off)', phase: 'pre', completed: true, assignedTo: 'Release Manager' },
      { id: 'c3', title: 'Drenado de tráfico y despliegue Canary 20%', phase: 'during', completed: false, assignedTo: 'DevOps / SRE' },
      { id: 'c4', title: 'Smoke tests de salud y validación de endpoints', phase: 'post', completed: false, assignedTo: 'QA Lead' },
      { id: 'c5', title: 'Monitoreo de métricas y tasa de error (SLOs)', phase: 'post', completed: false, assignedTo: 'DevOps / SRE' }
    ]
  );
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistPhase, setNewChecklistPhase] = useState<'pre' | 'during' | 'post'>('pre');

  // Add team member
  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    const member: TeamMember = {
      id: `mem-${Date.now()}`,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      phase: newMemberPhase,
      notified: false
    };
    setInvolvedMembers(prev => [...prev, member]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveMember = (id: string) => {
    setInvolvedMembers(prev => prev.filter(m => m.id !== id));
  };

  // Add checklist item
  const handleAddChecklistItem = () => {
    if (!newChecklistTitle.trim()) return;
    const item: ChecklistItem = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      phase: newChecklistPhase,
      completed: false
    };
    setChecklist(prev => [...prev, item]);
    setNewChecklistTitle('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, completed: !c.completed } : c));
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !service.trim()) return;

    setIsSubmitting(true);
    try {
      const reminderMinutes: number[] = [];
      if (remind15m) reminderMinutes.push(15);
      if (remind1h) reminderMinutes.push(60);
      if (remind24h) reminderMinutes.push(1440);

      const eventPayload: ReleaseEvent = {
        id: initialEvent?.id || `rel-${Date.now()}`,
        googleEventId: initialEvent?.googleEventId,
        htmlLink: initialEvent?.htmlLink,
        title: title.trim(),
        releaseTag: releaseTag.trim(),
        changeTicketId: changeTicketId.trim(),
        service: service.trim(),
        environment,
        phase,
        risk,
        cabStatus,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        color,
        downtimeExpectedMinutes: Number(downtimeExpectedMinutes) || 0,
        rollbackPlan: rollbackPlan.trim(),
        rollbackEstimateMinutes: Number(rollbackEstimateMinutes) || 15,
        runbookUrl: runbookUrl.trim(),
        jiraTicketUrl: jiraTicketUrl.trim(),
        owner: {
          name: ownerName.trim(),
          email: ownerEmail.trim()
        },
        involvedMembers,
        checklist,
        notificationsConfig: {
          autoNotifyGoogleAttendees,
          emailAlertsEnabled,
          popupRemindersEnabled,
          remindMinutesBefore: reminderMinutes,
          notifyOnPhaseChange
        },
        notes: notes.trim()
      };

      await onSave(eventPayload);
      onClose();
    } catch (err) {
      console.error('Error saving release event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md font-bold text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {initialEvent ? 'Editar Liberación / Cambio' : 'Programar Nueva Liberación'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasCalendarToken 
                  ? 'Sincronización en tiempo real con Google Calendar y envío de alertas a miembros'
                  : 'Modo local (Inicia sesión con Google para sincronizar en tu calendario real)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'details', label: '1. Datos & Ventana', icon: CalendarIcon },
            { id: 'risk', label: '2. Riesgo & Rollback', icon: ShieldAlert },
            { id: 'team', label: '3. Miembros & Alertas', icon: Users },
            { id: 'checklist', label: '4. Checklist Validación', icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 rounded-t-lg font-bold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: DETAILS & WINDOW */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Título de la Liberación *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Despliegue de Pasarela de Pagos Stripe v2"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Servicio / Sistema Afectado *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Core Banking API, Auth IAM, Checkout"
                    value={service}
                    onChange={e => setService(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Release Tag</label>
                  <input
                    type="text"
                    placeholder="v3.2.0"
                    value={releaseTag}
                    onChange={e => setReleaseTag(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Ticket de Cambio (CHG)</label>
                  <input
                    type="text"
                    placeholder="CHG-2026-104"
                    value={changeTicketId}
                    onChange={e => setChangeTicketId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Entorno de Destino</label>
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="production">Producción</option>
                    <option value="staging">Staging</option>
                    <option value="pre-prod">Pre-Producción</option>
                    <option value="disaster-recovery">DR / Contingencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Fase Inicial</label>
                  <select
                    value={phase}
                    onChange={e => {
                      const newPhase = e.target.value as ReleasePhase;
                      setPhase(newPhase);
                      setColor(PHASE_CONFIG[newPhase]?.color || color);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    {Object.entries(PHASE_CONFIG).map(([pKey, pVal]) => (
                      <option key={pKey} value={pKey}>{pVal.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start & End Window */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                  Ventana de Ejecución Programada
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha y Hora de Inicio</label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha y Hora de Término</label>
                    <input
                      type="datetime-local"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Color Representativo en Calendario
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map(item => (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => setColor(item.hex)}
                      className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center cursor-pointer ${
                        color.toLowerCase() === item.hex.toLowerCase()
                          ? 'ring-2 ring-blue-600 dark:ring-white scale-110 shadow-md'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: item.hex }}
                      title={item.name}
                    >
                      {color.toLowerCase() === item.hex.toLowerCase() && (
                        <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                      )}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{color}</span>
                  </div>
                </div>
              </div>

              {/* Downtime Expected */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Tiempo Estimado de Indisponibilidad (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 para Zero-Downtime"
                    value={downtimeExpectedMinutes}
                    onChange={e => setDowntimeExpectedMinutes(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Ingresa 0 si la liberación es transparente (Canary / Blue-Green).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Release Owner (Responsable)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RISK & CONTINGENCY */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Nivel de Riesgo del Cambio</label>
                  <select
                    value={risk}
                    onChange={e => setRisk(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="low">🟢 Bajo (Cambio estándar rutinario)</option>
                    <option value="medium">🟡 Medio (Impacto controlado)</option>
                    <option value="high">🟠 Alto (Afecta flujos de usuarios o datos)</option>
                    <option value="critical">🔴 Crítico (Core bancario / Infraestructura vital)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Estado Comité de Cambios (CAB)</label>
                  <select
                    value={cabStatus}
                    onChange={e => setCabStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs cursor-pointer"
                  >
                    <option value="approved">✅ Aprobado formalmente</option>
                    <option value="pending">⏳ Pendiente de revisión CAB</option>
                    <option value="exempt">🛡️ Exento / Emergencia P1</option>
                    <option value="rejected">❌ Rechazado / En corrección</option>
                  </select>
                </div>
              </div>

              {/* Rollback Procedure */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    Procedimiento de Marcha Atrás (Plan de Rollback)
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Tiempo estimado reversión:</span>
                    <input
                      type="number"
                      min="1"
                      className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-slate-800 dark:text-white text-center"
                      value={rollbackEstimateMinutes}
                      onChange={e => setRollbackEstimateMinutes(Number(e.target.value))}
                    />
                    <span>min</span>
                  </div>
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder="Detalla paso a paso la reversión: comandos, switch de feature flag, restauración de imágenes o backups..."
                  value={rollbackPlan}
                  onChange={e => setRollbackPlan(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs"
                />
              </div>

              {/* Technical URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-blue-600 dark:text-emerald-400" />
                    URL Runbook de Despliegue
                  </label>
                  <input
                    type="url"
                    placeholder="https://wiki.internal/runbook-release"
                    value={runbookUrl}
                    onChange={e => setRunbookUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    URL Ticket Jira / Issue Tracker
                  </label>
                  <input
                    type="url"
                    placeholder="https://jira.internal/browse/REL-120"
                    value={jiraTicketUrl}
                    onChange={e => setJiraTicketUrl(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Notas de la Liberación</label>
                <textarea
                  rows={2}
                  placeholder="Dependencias externas, canales de chat asignados, stakeholders notificados..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* TAB 3: TEAM & NOTIFICATIONS */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              {/* Notification Rules Configuration */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-emerald-400" />
                  Notificaciones Automáticas por Fase & Recordatorios Google Calendar
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={autoNotifyGoogleAttendees}
                      onChange={e => setAutoNotifyGoogleAttendees(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Invitar y notificar por email vía Google Calendar</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={notifyOnPhaseChange}
                      onChange={e => setNotifyOnPhaseChange(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Alerta automática a miembros al cambiar de fase</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={emailAlertsEnabled}
                      onChange={e => setEmailAlertsEnabled(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Generar plantilla de correo y mensaje Slack</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <span className="font-bold text-slate-800 dark:text-slate-300">Recordatorios previos:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remind15m}
                      onChange={e => setRemind15m(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500"
                    />
                    <span>15 min</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remind1h}
                      onChange={e => setRemind1h(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500"
                    />
                    <span>1 hora</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remind24h}
                      onChange={e => setRemind24h(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500"
                    />
                    <span>24 horas</span>
                  </label>
                </div>
              </div>

              {/* Add Member form */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Agregar Miembro del Equipo Involucrado:</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                  />
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                  />
                  <select
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-white shadow-2xs cursor-pointer"
                  >
                    <option value="DevOps / SRE">DevOps / SRE</option>
                    <option value="QA Lead">QA Lead</option>
                    <option value="Tech Lead">Tech Lead</option>
                    <option value="DBA">DBA</option>
                    <option value="Security Lead">Security Lead</option>
                    <option value="Release Manager">Release Manager</option>
                    <option value="Product Owner">Product Owner</option>
                    <option value="Stakeholder">Stakeholder</option>
                  </select>
                  <div className="flex gap-1">
                    <select
                      value={newMemberPhase}
                      onChange={e => setNewMemberPhase(e.target.value as any)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-white flex-1 shadow-2xs cursor-pointer"
                    >
                      <option value="all">Todas las fases</option>
                      {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label.split(' ')[0]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Miembros Asignados ({involvedMembers.length}):
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto pr-1">
                  {involvedMembers.map(member => (
                    <div key={member.id} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-emerald-400">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{member.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{member.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {member.role}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-emerald-500/10 text-blue-700 dark:text-emerald-300 border border-blue-200 dark:border-emerald-500/20">
                          {member.phase === 'all' ? 'Todas Fases' : PHASE_CONFIG[member.phase]?.label.split(' ')[0] || member.phase}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Agregar Tarea al Checklist:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Descripción de la tarea (ej. Validar certificados SSL)"
                    value={newChecklistTitle}
                    onChange={e => setNewChecklistTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                  />
                  <select
                    value={newChecklistPhase}
                    onChange={e => setNewChecklistPhase(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white shadow-2xs cursor-pointer"
                  >
                    <option value="pre">Pre-Despliegue</option>
                    <option value="during">Durante Despliegue</option>
                    <option value="post">Post-Despliegue / Validación</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Checklist items by stage */}
              {(['pre', 'during', 'post'] as const).map(stage => {
                const stageItems = checklist.filter(c => c.phase === stage);
                const stageLabel = stage === 'pre' ? 'Fase Pre-Despliegue' : stage === 'during' ? 'Fase de Ejecución' : 'Fase Post-Despliegue & Sanidad';

                return (
                  <div key={stage} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{stageLabel} ({stageItems.length})</h4>
                    <div className="space-y-1">
                      {stageItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          <label className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer flex-1 font-medium">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklist(item.id)}
                              className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className={item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                              {item.title}
                            </span>
                          </label>

                          <div className="flex items-center gap-2">
                            {item.assignedTo && (
                              <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded font-medium">
                                {item.assignedTo}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveChecklistItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {stageItems.length === 0 && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic pl-2">Sin items asignados para esta etapa.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: color }}></span>
              <span>Fase actual: <strong className="text-slate-800 dark:text-slate-200">{PHASE_CONFIG[phase]?.label}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{initialEvent ? 'Actualizar Liberación' : 'Guardar y Sincronizar'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

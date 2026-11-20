import React, { useState, useEffect } from 'react';
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
  Mail,
  Download,
  ExternalLink,
  Search,
  Loader2,
  Settings,
  Database,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ReleaseEvent, 
  ReleasePhase, 
  Environment, 
  RiskLevel, 
  CABStatus, 
  TeamMember, 
  DirectoryMember,
  ChecklistItem, 
  PHASE_CONFIG, 
  COLOR_PALETTE
} from '../types/release';
import { toLocalDateTimeInput, localInputToIso } from '../utils/dateUtils';
import {
  buildPhaseNotificationPayload,
  buildMailtoUrl,
  buildGmailComposeUrl,
  downloadReleaseIcsInvite,
  buildGoogleCalendarTemplateUrl
} from '../services/notificationService';
import {
  ServiceNowConfig,
  ScannedSnowChange,
  SnowFieldTrace,
  loadSavedSnowConfig,
  saveSnowConfigMetadata,
  checkServerSnowStatus,
  testSnowConnection,
  scanSnowChangeByNumber,
  scanSnowChangesByRange,
  mapScannedChangeToFormData,
  createDemoScannedChange
} from '../services/serviceNowService';

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: ReleaseEvent) => Promise<void>;
  initialEvent?: ReleaseEvent | null;
  initialDate?: Date;
  hasCalendarToken: boolean;
  memberDirectory?: DirectoryMember[];
  onUpsertDirectoryMember?: (member: Omit<DirectoryMember, 'id' | 'updatedAt'> & { id?: string }) => void;
}

export const ReleaseModal: React.FC<ReleaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  initialDate,
  hasCalendarToken,
  memberDirectory = [],
  onUpsertDirectoryMember
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
  
  // Date and Time calculation in LOCAL timezone (fixes UTC day shift bug)
  const defaultStart = initialDate ? new Date(initialDate) : new Date();
  if (!initialEvent && initialDate) {
    // Only set default 20:00 if the caller passed midnight (00:00) from Month View
    if (defaultStart.getHours() === 0 && defaultStart.getMinutes() === 0) {
      defaultStart.setHours(20, 0, 0, 0);
    }
  }
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const [startTime, setStartTime] = useState(
    initialEvent?.startTime ? toLocalDateTimeInput(initialEvent.startTime) : toLocalDateTimeInput(defaultStart)
  );
  const [endTime, setEndTime] = useState(
    initialEvent?.endTime ? toLocalDateTimeInput(initialEvent.endTime) : toLocalDateTimeInput(defaultEnd)
  );

  const handleStartTimeChange = (newStartStr: string) => {
    setStartTime(newStartStr);
    const parsedStart = new Date(localInputToIso(newStartStr));
    const parsedEnd = new Date(localInputToIso(endTime));
    if (!isNaN(parsedStart.getTime())) {
      // Automatically keep endTime 2 hours after startTime when moving to a new date or if end <= start
      if (isNaN(parsedEnd.getTime()) || parsedEnd.getTime() <= parsedStart.getTime() || Math.abs(parsedEnd.getTime() - parsedStart.getTime()) > 24 * 3600 * 1000) {
        const autoEnd = new Date(parsedStart.getTime() + 2 * 60 * 60 * 1000);
        setEndTime(toLocalDateTimeInput(autoEnd));
      }
    }
  };

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
  const [newMemberPhase, setNewMemberPhase] = useState<TeamMember['phase']>('deployment-window');

  // Notifications Config
  const [autoNotifyGoogleAttendees, setAutoNotifyGoogleAttendees] = useState(initialEvent?.notificationsConfig?.autoNotifyGoogleAttendees ?? true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(initialEvent?.notificationsConfig?.emailAlertsEnabled ?? true);
  const [popupRemindersEnabled, setPopupRemindersEnabled] = useState(initialEvent?.notificationsConfig?.popupRemindersEnabled ?? true);
  const [notifyOnPhaseChange, setNotifyOnPhaseChange] = useState(initialEvent?.notificationsConfig?.notifyOnPhaseChange ?? true);
  const [remind15m, setRemind15m] = useState(true);
  const [remind1h, setRemind1h] = useState(true);
  const [remind24h, setRemind24h] = useState(false);
  const [openEmailOnSave, setOpenEmailOnSave] = useState(false);
  const [quickTestGmail, setQuickTestGmail] = useState('');

  // ServiceNow API Scanner State
  const [isSnowPanelOpen, setIsSnowPanelOpen] = useState(!initialEvent);
  const [showSnowSettings, setShowSnowSettings] = useState(false);
  const [snowScanMode, setSnowScanMode] = useState<'number' | 'range'>('number');
  const [snowConfig, setSnowConfig] = useState<ServiceNowConfig>(() => loadSavedSnowConfig());
  const [snowServerConfigured, setSnowServerConfigured] = useState(false);
  const [snowChangeQuery, setSnowChangeQuery] = useState('');
  const [snowRangeStart, setSnowRangeStart] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [snowRangeEnd, setSnowRangeEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [snowStateFilter, setSnowStateFilter] = useState('all');
  const [snowGroupFilter, setSnowGroupFilter] = useState('');
  const [snowTextFilter, setSnowTextFilter] = useState('');
  const [isScanningSnow, setIsScanningSnow] = useState(false);
  const [snowError, setSnowError] = useState<string | null>(null);
  const [snowStatusMsg, setSnowStatusMsg] = useState<string | null>(null);
  const [scannedResults, setScannedResults] = useState<ScannedSnowChange[]>([]);
  const [fieldTraces, setFieldTraces] = useState<Record<string, SnowFieldTrace>>({});

  useEffect(() => {
    checkServerSnowStatus().then(status => {
      setSnowServerConfigured(status.configuredOnServer);
      if (status.instanceUrl && !snowConfig.instanceUrl) {
        setSnowConfig(prev => ({
          ...prev,
          instanceUrl: status.instanceUrl || prev.instanceUrl,
          username: status.username || prev.username
        }));
      }
    });
  }, []);

  const applyScannedChangeToForm = (scanned: ScannedSnowChange) => {
    const mapped = mapScannedChangeToFormData(scanned);
    setTitle(mapped.title);
    setService(mapped.service);
    setReleaseTag(mapped.releaseTag);
    setChangeTicketId(mapped.changeTicketId);
    setEnvironment(mapped.environment);
    setPhase(mapped.phase);
    setRisk(mapped.risk);
    setCabStatus(mapped.cabStatus);
    setStartTime(toLocalDateTimeInput(mapped.startTimeIso));
    setEndTime(toLocalDateTimeInput(mapped.endTimeIso));
    setColor(mapped.color);
    setRollbackPlan(mapped.rollbackPlan);
    setNotes(mapped.notes);
    setOwnerName(mapped.ownerName);
    if (mapped.ownerEmail) setOwnerEmail(mapped.ownerEmail);
    if (mapped.involvedMembers.length > 0) {
      setInvolvedMembers(prev => {
        const merged = [...prev];
        mapped.involvedMembers.forEach(nm => {
          const idx = merged.findIndex(m => m.name.trim().toLowerCase() === nm.name.trim().toLowerCase());
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              email: nm.email || merged[idx].email,
              role: nm.role || merged[idx].role
            };
          } else {
            merged.unshift(nm);
          }
        });
        return merged;
      });
    }
    setChecklist(mapped.checklist);
    setFieldTraces(mapped.fieldTraces);
    setSnowStatusMsg(
      `Datos cargados desde ServiceNow (${scanned.number}): ventana, checklist (${mapped.checklist.length} tareas), rollback y participantes listos para editar.`
    );
    setSnowError(null);
  };

  const handleTestSnowConnection = async () => {
    saveSnowConfigMetadata(snowConfig);
    setIsScanningSnow(true);
    setSnowError(null);
    setSnowStatusMsg(null);
    try {
      const msg = await testSnowConnection(snowConfig);
      setSnowStatusMsg(msg);
    } catch (err: any) {
      setSnowError(err?.message || 'Error al probar conexión con ServiceNow.');
    } finally {
      setIsScanningSnow(false);
    }
  };

  const handleScanSnowByNumber = async () => {
    if (!snowChangeQuery.trim()) {
      setSnowError('Escribe un # de cambio de ServiceNow (ej. CHG0034512).');
      return;
    }
    saveSnowConfigMetadata(snowConfig);
    setIsScanningSnow(true);
    setSnowError(null);
    setSnowStatusMsg(null);
    setScannedResults([]);
    try {
      const scanned = await scanSnowChangeByNumber(snowConfig, snowChangeQuery);
      setScannedResults([scanned]);
      applyScannedChangeToForm(scanned);
    } catch (err: any) {
      setSnowError(err?.message || 'No se pudo escanear el cambio en ServiceNow.');
    } finally {
      setIsScanningSnow(false);
    }
  };

  const handleScanSnowByRange = async () => {
    saveSnowConfigMetadata(snowConfig);
    setIsScanningSnow(true);
    setSnowError(null);
    setSnowStatusMsg(null);
    setScannedResults([]);
    try {
      const list = await scanSnowChangesByRange(snowConfig, {
        startDate: snowRangeStart,
        endDate: snowRangeEnd,
        stateFilter: snowStateFilter,
        assignmentGroup: snowGroupFilter,
        searchQuery: snowTextFilter
      });
      setScannedResults(list);
      if (list.length === 0) {
        setSnowStatusMsg('No se encontraron cambios en ServiceNow con ese rango y filtros.');
      } else {
        setSnowStatusMsg(`Se encontraron ${list.length} cambios en ServiceNow. Haz clic en "Cargar en Formulario" en cualquiera.`);
      }
    } catch (err: any) {
      setSnowError(err?.message || 'Error al escanear el rango en ServiceNow.');
    } finally {
      setIsScanningSnow(false);
    }
  };

  const handleSimulateSnowScan = () => {
    setIsScanningSnow(true);
    setSnowError(null);
    setSnowStatusMsg(null);
    setTimeout(() => {
      const demo = createDemoScannedChange(snowChangeQuery || 'CHG0045821');
      setScannedResults([demo]);
      applyScannedChangeToForm(demo);
      setIsScanningSnow(false);
    }, 650);
  };

  const renderSnowBadge = (fieldKey: string) => {
    const trace = fieldTraces[fieldKey];
    if (!trace) return null;
    return (
      <span
        className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-emerald-950/60 text-indigo-700 dark:text-emerald-300 border border-indigo-200 dark:border-emerald-800"
        title={`Valor extraído de ServiceNow (${trace.snowColumn}): ${trace.rawValue}`}
      >
        <Database className="w-2.5 h-2.5" />
        SNOW: {trace.snowColumn}
      </span>
    );
  };

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

  // Add team member (pulls role/email from directory if registered, otherwise blank role)
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const cleanName = newMemberName.trim();
    const matchedInDir = memberDirectory.find(
      m => m.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    const cleanEmail = newMemberEmail.trim() || matchedInDir?.email || '';
    const memberRole = matchedInDir?.role || '';

    const member: TeamMember = {
      id: `mem-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: memberRole,
      phase: newMemberPhase,
      notified: false
    };

    setInvolvedMembers(prev => {
      const existingIdx = prev.findIndex(m => m.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          email: cleanEmail || copy[existingIdx].email,
          role: memberRole || copy[existingIdx].role,
          phase: newMemberPhase
        };
        return copy;
      }
      return [...prev, member];
    });

    if (onUpsertDirectoryMember) {
      onUpsertDirectoryMember({
        name: cleanName,
        email: cleanEmail,
        role: memberRole,
        defaultPhase: newMemberPhase
      });
    }

    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleUpdateAssignedMemberPhase = (memberId: string, updatedPhase: ReleasePhase | 'all') => {
    setInvolvedMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, phase: updatedPhase } : m))
    );
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

  // Helper to build the current ReleaseEvent payload from form state (used both for saving and for sending email/invite)
  const buildDraftEventPayload = (): ReleaseEvent => {
    const reminderMinutes: number[] = [];
    if (remind15m) reminderMinutes.push(15);
    if (remind1h) reminderMinutes.push(60);
    if (remind24h) reminderMinutes.push(1440);

    // Ensure members have their latest email/role from memberDirectory if available
    const resolvedMembers: TeamMember[] = involvedMembers.map(m => {
      const dirMatch = memberDirectory.find(
        d => d.name.trim().toLowerCase() === m.name.trim().toLowerCase()
      );
      return {
        ...m,
        email: m.email || dirMatch?.email || '',
        role: dirMatch?.role !== undefined ? dirMatch.role : m.role
      };
    });

    return {
      id: initialEvent?.id || `rel-${Date.now()}`,
      googleEventId: initialEvent?.googleEventId,
      htmlLink: initialEvent?.htmlLink,
      title: title.trim() || 'Nueva Liberación Programada',
      releaseTag: releaseTag.trim() || 'v1.0.0',
      changeTicketId: changeTicketId.trim() || 'CHG-PENDIENTE',
      service: service.trim() || 'Servicio Principal',
      environment,
      phase,
      risk,
      cabStatus,
      startTime: localInputToIso(startTime),
      endTime: localInputToIso(endTime),
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
      involvedMembers: resolvedMembers,
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
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !service.trim()) return;

    setIsSubmitting(true);
    try {
      const eventPayload = buildDraftEventPayload();
      await onSave(eventPayload);

      if (openEmailOnSave) {
        const payload = buildPhaseNotificationPayload(
          eventPayload,
          eventPayload.phase,
          eventPayload.involvedMembers
        );
        window.location.href = buildMailtoUrl(payload);
      }

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
              {/* ServiceNow API Scanner Card */}
              <div className="rounded-2xl border border-indigo-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white dark:from-slate-800/90 dark:via-slate-800/70 dark:to-slate-900 overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 bg-indigo-50/80 dark:bg-slate-800/90 border-b border-indigo-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setIsSnowPanelOpen(prev => !prev)}
                    className="flex items-center gap-2 text-xs font-black text-indigo-950 dark:text-emerald-300 cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-indigo-600 dark:text-emerald-400" />
                    <span>Escanear Cambio desde ServiceNow (API)</span>
                    {isScanningSnow && <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />}
                    {isSnowPanelOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSnowPanelOpen(true);
                        setShowSnowSettings(prev => !prev);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
                        snowServerConfigured || snowConfig.instanceUrl
                          ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-emerald-300 border-indigo-200 dark:border-emerald-800'
                          : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                      }`}
                      title="Configura aquí tu Instancia, Usuario y Contraseña/Token API de ServiceNow"
                    >
                      <Settings className="w-3 h-3" />
                      <span>
                        {snowServerConfigured
                          ? 'Cuenta API (Servidor)'
                          : snowConfig.instanceUrl
                          ? 'Cuenta API Configurada'
                          : 'Configurar Cuenta API'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateSnowScan}
                      disabled={isScanningSnow}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                      title="Simula un escaneo de cambio de ServiceNow para ver cómo se auto-llena cada campo del formulario"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Probar Demo SNOW</span>
                    </button>
                  </div>
                </div>

                {isSnowPanelOpen && (
                  <div className="p-3.5 space-y-3">
                    {/* API Credentials Drawer */}
                    {showSnowSettings && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Cuenta API de ServiceNow (se usa para consultar <code>change_request</code> y <code>change_task</code>)
                          </span>
                          {snowServerConfigured && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ Variables cargadas en servidor/Docker
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="url"
                            placeholder="https://tuempresa.service-now.com"
                            value={snowConfig.instanceUrl}
                            onChange={e => setSnowConfig(prev => ({ ...prev, instanceUrl: e.target.value }))}
                            className="sm:col-span-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                          />
                          <select
                            value={snowConfig.authMode}
                            onChange={e => setSnowConfig(prev => ({ ...prev, authMode: e.target.value as 'basic' | 'bearer' }))}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-white cursor-pointer"
                          >
                            <option value="basic">Usuario + Contraseña (Basic)</option>
                            <option value="bearer">Token OAuth (Bearer)</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleTestSnowConnection}
                            disabled={isScanningSnow}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isScanningSnow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Validar Cuenta</span>
                          </button>
                        </div>

                        {snowConfig.authMode === 'basic' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Usuario API ServiceNow (ej. svc_releasehub)"
                              value={snowConfig.username}
                              onChange={e => setSnowConfig(prev => ({ ...prev, username: e.target.value }))}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                            />
                            <input
                              type="password"
                              placeholder="Contraseña de la cuenta API"
                              value={snowConfig.password || ''}
                              onChange={e => setSnowConfig(prev => ({ ...prev, password: e.target.value }))}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                            />
                          </div>
                        ) : (
                          <input
                            type="password"
                            placeholder="Pega aquí tu Bearer Access Token de ServiceNow"
                            value={snowConfig.bearerToken || ''}
                            onChange={e => setSnowConfig(prev => ({ ...prev, bearerToken: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                          />
                        )}
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          También puedes dejar fija esta cuenta en tu contenedor Docker editando las variables <code>SNOW_INSTANCE_URL</code>, <code>SNOW_USERNAME</code> y <code>SNOW_PASSWORD</code> en <code>docker-compose.yml</code>.
                        </p>
                      </div>
                    )}

                    {/* Mode Switcher: By CHG Number vs Date Range & Filters */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSnowScanMode('number')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          snowScanMode === 'number'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Por # de Cambio (CHG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSnowScanMode('range')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          snowScanMode === 'range'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Filter className="w-3 h-3" />
                        <span>Por Rango de Fechas y Filtros</span>
                      </button>
                    </div>

                    {snowScanMode === 'number' ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Ingresa el # de Cambio (ej. CHG0034512)"
                          value={snowChangeQuery}
                          onChange={e => setSnowChangeQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleScanSnowByNumber();
                            }
                          }}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white placeholder-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleScanSnowByNumber}
                          disabled={isScanningSnow}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                        >
                          {isScanningSnow ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Escaneando SNOW...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              <span>Escanear y Auto-llenar</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Desde</label>
                            <input
                              type="date"
                              value={snowRangeStart}
                              onChange={e => setSnowRangeStart(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Hasta</label>
                            <input
                              type="date"
                              value={snowRangeEnd}
                              onChange={e => setSnowRangeEnd(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Estado SNOW</label>
                            <select
                              value={snowStateFilter}
                              onChange={e => setSnowStateFilter(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-white cursor-pointer"
                            >
                              <option value="all">Todos los estados</option>
                              <option value="-2">Programado (Scheduled)</option>
                              <option value="-3">Autorizar (Authorize)</option>
                              <option value="-4">Evaluar (Assess)</option>
                              <option value="-1">Implementar (Implement)</option>
                              <option value="0">Revisión (Review)</option>
                              <option value="-5">Nuevo (New)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Grupo de Asignación</label>
                            <input
                              type="text"
                              placeholder="Ej. Infraestructura"
                              value={snowGroupFilter}
                              onChange={e => setSnowGroupFilter(e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            placeholder="Filtro adicional (servicio, CI o palabra clave)..."
                            value={snowTextFilter}
                            onChange={e => setSnowTextFilter(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleScanSnowByRange}
                            disabled={isScanningSnow}
                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            {isScanningSnow ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Buscando en SNOW...</span>
                              </>
                            ) : (
                              <>
                                <Search className="w-3.5 h-3.5" />
                                <span>Escanear Rango</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Loading / Status / Error Feedback */}
                    {isScanningSnow && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-xs font-semibold text-blue-800 dark:text-emerald-300">
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Consultando API de ServiceNow (change_request &amp; change_task) y extrayendo fechas, tareas y responsables...</span>
                      </div>
                    )}

                    {snowError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
                        {snowError}
                      </div>
                    )}

                    {snowStatusMsg && !isScanningSnow && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{snowStatusMsg}</span>
                      </div>
                    )}

                    {/* Scanned Results List (when range returns multiple or single for selection) */}
                    {scannedResults.length > 0 && snowScanMode === 'range' && (
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                        {scannedResults.map(item => (
                          <div key={item.number} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-emerald-400">{item.number}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                                  {item.state || 'Programado'}
                                </span>
                                {item.startDate && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.startDate}</span>
                                )}
                              </div>
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {item.shortDescription}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => applyScannedChangeToForm(item)}
                              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              Cargar en Formulario
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Título de la Liberación *
                    {renderSnowBadge('title')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Despliegue de Pasarela de Pagos Stripe v2"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-2xs ${isScanningSnow ? 'opacity-60 animate-pulse' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Servicio / Sistema Afectado *
                    {renderSnowBadge('service')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Core Banking API, Auth IAM, Checkout"
                    value={service}
                    onChange={e => setService(e.target.value)}
                    className={`w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-2xs ${isScanningSnow ? 'opacity-60 animate-pulse' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Release Tag
                    {renderSnowBadge('releaseTag')}
                  </label>
                  <input
                    type="text"
                    placeholder="v3.2.0"
                    value={releaseTag}
                    onChange={e => setReleaseTag(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Ticket (CHG)
                    {renderSnowBadge('changeTicketId')}
                  </label>
                  <input
                    type="text"
                    placeholder="CHG-2026-104"
                    value={changeTicketId}
                    onChange={e => setChangeTicketId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Entorno
                    {renderSnowBadge('environment')}
                  </label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Fase Inicial
                    {renderSnowBadge('phase')}
                  </label>
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
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha y Hora de Inicio
                      {renderSnowBadge('startTime')}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={startTime}
                      onChange={e => handleStartTimeChange(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:ring-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha y Hora de Término
                      {renderSnowBadge('endTime')}
                    </label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Release Owner (Responsable)
                    {renderSnowBadge('owner')}
                  </label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Nivel de Riesgo del Cambio
                    {renderSnowBadge('risk')}
                  </label>
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
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Estado Comité de Cambios (CAB)
                    {renderSnowBadge('cabStatus')}
                  </label>
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
                    {renderSnowBadge('rollbackPlan')}
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

              {/* Add Member form (Name, Email, Phase only - no autocomplete chips, no Area dropdown) */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Agregar Miembro del Equipo Involucrado:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newMemberName}
                    onChange={e => {
                      const val = e.target.value;
                      setNewMemberName(val);
                      const matched = memberDirectory.find(
                        m => m.name.trim().toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched && !newMemberEmail && matched.email) {
                        setNewMemberEmail(matched.email);
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                  />
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                  />
                  <div className="flex gap-1">
                    <select
                      value={newMemberPhase}
                      onChange={e => setNewMemberPhase(e.target.value as any)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 dark:text-white flex-1 shadow-2xs cursor-pointer"
                    >
                      <option value="all">Todas las fases</option>
                      {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
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

              {/* Members List: Area/Role non-editable, Phase editable */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Miembros Asignados ({involvedMembers.length}):
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  {involvedMembers.map(member => {
                    const dirMatch = memberDirectory.find(
                      d => d.name.trim().toLowerCase() === member.name.trim().toLowerCase()
                    );
                    const displayRole = dirMatch?.role !== undefined ? dirMatch.role : member.role;
                    const displayEmail = member.email || dirMatch?.email || '';

                    return (
                      <div key={member.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-emerald-400 shrink-0">
                            {member.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{member.name}</div>
                            {displayEmail && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">{displayEmail}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Non-editable Area / Role badge (shows member's role if assigned, stays blank if empty) */}
                          {displayRole ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {displayRole}
                            </span>
                          ) : null}

                          {/* Editable Phase Selector */}
                          <select
                            value={member.phase}
                            onChange={e => handleUpdateAssignedMemberPhase(member.id, e.target.value as any)}
                            className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-emerald-500/10 text-blue-700 dark:text-emerald-300 border border-blue-200 dark:border-emerald-500/20 cursor-pointer"
                          >
                            <option value="all">Todas las Fases</option>
                            {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Direct Button to Send Event / Implementation to Participants' Inboxes & Gmail Calendar */}
              {(() => {
                const draftEvent = buildDraftEventPayload();
                const emailPayload = buildPhaseNotificationPayload(
                  draftEvent,
                  draftEvent.phase,
                  draftEvent.involvedMembers
                );
                const extraGuests = quickTestGmail.trim() ? [quickTestGmail.trim()] : [];
                const mailtoHref = buildMailtoUrl(emailPayload, extraGuests[0]);
                const gmailHref = buildGmailComposeUrl(emailPayload, extraGuests[0]);
                const googleCalInviteHref = buildGoogleCalendarTemplateUrl(draftEvent, extraGuests);

                return (
                  <div className="bg-blue-50/70 dark:bg-emerald-950/25 p-3.5 rounded-xl border border-blue-200 dark:border-emerald-800/70 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="text-xs font-bold text-blue-950 dark:text-emerald-300 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-600 dark:text-emerald-400" />
                        <span>Enviar Implementación a Correos e Invitación Gmail ({emailPayload.recipients.length} con correo)</span>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">
                        Incluye ventana, ticket CHG, riesgo, rollback y checklist
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="Correo Gmail adicional para probar invitación (ej. tucorreo@gmail.com)"
                        value={quickTestGmail}
                        onChange={e => setQuickTestGmail(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={googleCalInviteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Abre tu Google Calendar con el evento listo y todos los invitados agregados para enviar invitación real a Gmail"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>Invitar en Google Calendar (Gmail)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => downloadReleaseIcsInvite(draftEvent)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Descarga el archivo de calendario .ics con todos los participantes para compartirlo después o abrirlo en Outlook/Google Calendar"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                        <span>Descargar Invitación (.ics)</span>
                      </button>

                      <a
                        href={mailtoHref}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Abre Outlook o tu cliente de correo con todos los participantes en Para: y toda la ficha de implementación lista para enviar"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Enviar Evento a Correos (Outlook)</span>
                      </a>

                      <a
                        href={gmailHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Abre Gmail Web con todos los participantes y la ficha técnica precargada"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                        <span>Enviar por Gmail Web</span>
                      </a>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={openEmailOnSave}
                        onChange={e => setOpenEmailOnSave(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 dark:text-emerald-500 w-4 h-4"
                      />
                      <span>
                        Al dar clic en <strong>"{initialEvent ? 'Actualizar Liberación' : 'Guardar y Sincronizar'}"</strong>, abrir automáticamente el correo hacia los participantes
                      </span>
                    </label>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
                  Agregar Tarea al Checklist:
                  {renderSnowBadge('checklist')}
                </span>
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

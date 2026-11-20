/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  setCachedAccessToken,
  GoogleAuthErrorDetails
} from './services/auth';
import { 
  fetchGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent 
} from './services/calendarService';
import { dispatchPhaseNotification } from './services/notificationService';
import { ImportPreviewItem } from './services/importService';
import { INITIAL_RELEASES, INITIAL_MEMBER_DIRECTORY } from './data/seedReleases';
import { ReleaseEvent, ReleasePhase, Environment, NotificationLog, DirectoryMember } from './types/release';
import { Navbar } from './components/Navbar';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { PipelineView } from './components/PipelineView';
import { MembersView } from './components/MembersView';
import { ReleaseModal } from './components/ReleaseModal';
import { ReleaseDetailsDrawer } from './components/ReleaseDetailsDrawer';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ShareModal } from './components/ShareModal';
import { ImportModal } from './components/ImportModal';
import { GoogleDiagnosticsModal } from './components/GoogleDiagnosticsModal';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<GoogleAuthErrorDetails | null>(null);
  const [isGoogleDiagnosticsOpen, setIsGoogleDiagnosticsOpen] = useState(false);

  // App data state (persisted in localStorage)
  const [events, setEvents] = useState<ReleaseEvent[]>(() => {
    try {
      const saved = localStorage.getItem('releasehub_events_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_RELEASES;
  });

  const [memberDirectory, setMemberDirectory] = useState<DirectoryMember[]>(() => {
    try {
      const saved = localStorage.getItem('releasehub_directory_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_MEMBER_DIRECTORY;
  });

  const [serverStorageAvailable, setServerStorageAvailable] = useState(false);

  // Load persisted data from Docker container server (/api/storage) if running in container
  useEffect(() => {
    let mounted = true;
    fetch('/api/storage')
      .then(res => {
        if (!res.ok) throw new Error('No server storage');
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('Not JSON');
        return res.json();
      })
      .then(data => {
        if (!mounted) return;
        setServerStorageAvailable(true);
        if (data && !data.empty) {
          if (Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events);
          }
          if (Array.isArray(data.memberDirectory) && data.memberDirectory.length > 0) {
            setMemberDirectory(data.memberDirectory);
          }
        }
      })
      .catch(() => {
        // Running on static host (e.g. GitHub Pages) - uses localStorage fallback automatically
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('releasehub_events_v2', JSON.stringify(events));
    } catch {
      // ignore storage quota errors
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('releasehub_directory_v1', JSON.stringify(memberDirectory));
    } catch {
      // ignore
    }
  }, [memberDirectory]);

  useEffect(() => {
    if (!serverStorageAvailable) return;
    fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, memberDirectory, updatedAt: new Date().toISOString() })
    }).catch(() => {
      // ignore
    });
  }, [events, memberDirectory, serverStorageAvailable]);

  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([
    {
      id: 'init-log-1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      releaseId: 'rel-seed-01',
      releaseTag: 'v3.2.0-PROD',
      releaseTitle: 'Despliegue Core Payments v3.2 & Pasarela 3DS',
      phase: 'deployment-window',
      recipients: ['vicescalop.trabajo@gmail.com', 'amorales.sre@company.com'],
      channel: 'Google Calendar Reminder',
      status: 'sent',
      summary: 'Recordatorio automático configurado en Google Calendar (120m, 30m y 10m antes).'
    },
    {
      id: 'init-log-2',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      releaseId: 'rel-seed-04',
      releaseTag: 'CAB-SES-102',
      releaseTitle: 'Comité de Cambios Extraordinario (CAB) - Expansión Cloud',
      phase: 'cab-review',
      recipients: ['vicescalop.trabajo@gmail.com', 'cmendoza.sec@company.com', 'mherrera.po@company.com'],
      channel: 'Automated Phase Alert',
      status: 'sent',
      summary: 'Convocatoria automática enviada a los miembros del comité CAB.'
    }
  ]);

  // Views & Filters
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'pipeline' | 'notifications'>('month');
  const [selectedEnv, setSelectedEnv] = useState<Environment | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 8, 30)); // 2026-09-30 local time

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ReleaseEvent | null>(null);
  const [drawerEvent, setDrawerEvent] = useState<ReleaseEvent | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<ReleaseEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [creationPresetDate, setCreationPresetDate] = useState<Date | undefined>(undefined);

  // Theme State: 'light' (clean white/blue/orange) or 'dark' (cyber dark slate)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('releasehub_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('releasehub_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Toast Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setCalendarToken(token);
        }
      },
      () => {
        setUser(null);
        setCalendarToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Google Calendar events when token is present
  const syncWithGoogleCalendar = useCallback(async (token?: string) => {
    const activeToken = token || calendarToken;
    if (!activeToken) return;

    setIsSyncing(true);
    try {
      const gEvents = await fetchGoogleCalendarEvents(activeToken);
      if (gEvents && gEvents.length > 0) {
        // Merge with initial releases without duplicates
        setEvents(prev => {
          const map = new Map<string, ReleaseEvent>();
          // keep local non-google events
          prev.forEach(ev => {
            map.set(ev.id, ev);
          });
          // merge google events
          gEvents.forEach(gEv => {
            map.set(gEv.id, gEv);
          });
          return Array.from(map.values());
        });
        showToast(`Sincronizados ${gEvents.length} eventos de Google Calendar exitosamente.`);
      } else {
        showToast('Google Calendar conectado. No se encontraron eventos de liberación en el rango actual.');
      }
    } catch (err: any) {
      console.error('Error syncing Google Calendar:', err);
      showToast('Error al conectar con Google Calendar: ' + (err.message || 'Verifica permisos'), 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [calendarToken]);

  // Handle successful login
  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    setCalendarToken(token);
    setCachedAccessToken(token);
    setLastAuthError(null);
    showToast(`Conectado como ${loggedInUser.displayName || loggedInUser.email}. Sincronizando calendario...`);
    syncWithGoogleCalendar(token);
  };

  // Handle manual OAuth token validation from Google Diagnostics Modal
  const handleManualTokenSuccess = (email: string, name: string, token: string) => {
    const syntheticUser = {
      uid: `manual-${Date.now()}`,
      email,
      displayName: name,
      photoURL: null
    } as unknown as User;
    setUser(syntheticUser);
    setCalendarToken(token);
    setCachedAccessToken(token);
    setLastAuthError(null);
    showToast(`Token OAuth validado para ${email}. Sincronizando con Google Calendar...`);
    syncWithGoogleCalendar(token);
  };

  // Upsert a member into the global Member Directory (preserving or evolving their role across changes)
  const handleUpsertDirectoryMember = useCallback(
    (memberInput: Omit<DirectoryMember, 'id' | 'updatedAt'> & { id?: string }) => {
      setMemberDirectory(prev => {
        const normName = memberInput.name.trim().toLowerCase();
        const existingIdx = prev.findIndex(
          m => (memberInput.id && m.id === memberInput.id) || (!memberInput.id && m.name.trim().toLowerCase() === normName)
        );
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const updatedRole =
            memberInput.id !== undefined
              ? memberInput.role
              : memberInput.role && memberInput.role.trim() !== ''
              ? memberInput.role
              : existing.role;

          const updatedEmail =
            memberInput.id !== undefined
              ? memberInput.email
              : memberInput.email.trim() || existing.email;

          const updated: DirectoryMember = {
            ...existing,
            name: memberInput.name,
            email: updatedEmail,
            role: updatedRole,
            defaultPhase: memberInput.defaultPhase || existing.defaultPhase,
            updatedAt: new Date().toISOString()
          };
          const copy = [...prev];
          copy[existingIdx] = updated;
          return copy;
        }

        const created: DirectoryMember = {
          id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: memberInput.name.trim(),
          email: memberInput.email.trim(),
          role: memberInput.role || '',
          defaultPhase: memberInput.defaultPhase || 'deployment-window',
          updatedAt: new Date().toISOString()
        };
        return [created, ...prev];
      });

      // If edited directly from Members Modal, also sync role/email into existing events' involvedMembers
      if (memberInput.id !== undefined) {
        const norm = memberInput.name.trim().toLowerCase();
        setEvents(prevEvents =>
          prevEvents.map(ev => {
            const hasMatch = ev.involvedMembers.some(im => im.name.trim().toLowerCase() === norm);
            if (!hasMatch) return ev;
            return {
              ...ev,
              involvedMembers: ev.involvedMembers.map(im =>
                im.name.trim().toLowerCase() === norm
                  ? { ...im, email: memberInput.email || im.email, role: memberInput.role }
                  : im
              )
            };
          })
        );
      }
    },
    []
  );

  const handleDeleteDirectoryMember = useCallback((id: string) => {
    setMemberDirectory(prev => prev.filter(m => m.id !== id));
    showToast('Miembro eliminado del directorio.', 'info');
  }, []);

  // Apply ServiceNow / JIRA Excel Import (Upsert: Create new + Update existing statuses)
  const handleApplyImport = (items: ImportPreviewItem[], source: 'servicenow' | 'jira') => {
    if (items.length === 0) return;

    const createdCount = items.filter(i => i.action === 'create').length;
    const updatedCount = items.filter(i => i.action === 'update').length;

    setEvents(prev => {
      const next = [...prev];
      items.forEach(item => {
        const idx = next.findIndex(
          e =>
            e.id === item.event.id ||
            e.changeTicketId.trim().toLowerCase() === item.event.changeTicketId.trim().toLowerCase()
        );
        if (idx >= 0) {
          next[idx] = item.event;
        } else {
          next.unshift(item.event);
        }
      });
      return next;
    });

    // Sync discovered members from ServiceNow / JIRA into Member Directory
    items.forEach(item => {
      item.discoveredMembers.forEach(dm => {
        handleUpsertDirectoryMember({
          name: dm.name,
          email: dm.email,
          role: dm.role,
          defaultPhase: item.event.phase
        });
      });
    });

    // Navigate calendar to the first imported event's date so the user immediately sees the changes
    const firstDate = new Date(items[0].event.startTime);
    if (!isNaN(firstDate.getTime())) {
      setSelectedDate(firstDate);
    }

    showToast(
      `Importación ${source === 'servicenow' ? 'ServiceNow' : 'JIRA'} aplicada: ${createdCount} nuevos y ${updatedCount} actualizados en el calendario.`
    );
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (eventData: ReleaseEvent) => {
    let savedEvent = { ...eventData };

    if (calendarToken) {
      try {
        if (editingEvent?.googleEventId) {
          savedEvent = await updateGoogleCalendarEvent(calendarToken, editingEvent.googleEventId, savedEvent);
          showToast(`Evento actualizado en Google Calendar y notificaciones refrescadas.`);
        } else {
          savedEvent = await createGoogleCalendarEvent(calendarToken, savedEvent);
          showToast(`Liberación creada y sincronizada en Google Calendar con alertas para el equipo.`);
        }
      } catch (err: any) {
        console.error('Error saving to Google Calendar:', err);
        showToast(`Guardado localmente. Error en Google Calendar: ${err.message}`, 'info');
      }
    } else {
      showToast(editingEvent ? 'Liberación actualizada en la fecha seleccionada.' : 'Liberación guardada en la fecha seleccionada.');
    }

    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === savedEvent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = savedEvent;
        return copy;
      }
      return [savedEvent, ...prev];
    });

    // Sync involved members into Member Directory so their roles evolve automatically across changes
    savedEvent.involvedMembers.forEach(m => {
      handleUpsertDirectoryMember({
        name: m.name,
        email: m.email,
        role: m.role,
        defaultPhase: m.phase
      });
    });

    // Navigate the calendar to the saved event's start date in local time so the user sees it immediately
    const targetDate = new Date(savedEvent.startTime);
    if (!isNaN(targetDate.getTime())) {
      setSelectedDate(targetDate);
    }

    // Update active drawer if it was being inspected
    if (drawerEvent?.id === savedEvent.id) {
      setDrawerEvent(savedEvent);
    }

    // Auto-dispatch notification log if configured
    if (savedEvent.notificationsConfig?.notifyOnPhaseChange) {
      const { log } = dispatchPhaseNotification(savedEvent, savedEvent.phase, 'Automated Phase Alert');
      setNotificationLogs(prev => [log, ...prev]);
    }

    setEditingEvent(null);
  };

  // Delete Event with Mandatory Confirmation Dialog
  const handleConfirmDelete = async () => {
    if (!deleteEvent) return;

    setIsDeleting(true);
    try {
      if (calendarToken && deleteEvent.googleEventId) {
        await deleteGoogleCalendarEvent(calendarToken, deleteEvent.googleEventId);
        showToast(`Evento eliminado de Google Calendar.`);
      } else {
        showToast(`Liberación ${deleteEvent.releaseTag} eliminada.`);
      }

      setEvents(prev => prev.filter(e => e.id !== deleteEvent.id));

      if (drawerEvent?.id === deleteEvent.id) {
        setDrawerEvent(null);
      }
      setDeleteEvent(null);
    } catch (err: any) {
      console.error('Error deleting event:', err);
      showToast(`Error al eliminar: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Advance Phase in Pipeline
  const handleAdvancePhase = async (event: ReleaseEvent, nextPhase: ReleasePhase) => {
    const updated: ReleaseEvent = {
      ...event,
      phase: nextPhase,
      updatedAt: new Date().toISOString()
    };

    // Update in Google Calendar if synced
    if (calendarToken && event.googleEventId) {
      try {
        await updateGoogleCalendarEvent(calendarToken, event.googleEventId, updated);
      } catch (e) {
        console.warn('Could not update phase in Google Calendar', e);
      }
    }

    setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
    if (drawerEvent?.id === event.id) {
      setDrawerEvent(updated);
    }

    // Trigger automatic notification for members of that phase
    const { log } = dispatchPhaseNotification(updated, nextPhase, 'Automated Phase Alert');
    setNotificationLogs(prev => [log, ...prev]);

    showToast(`Fase avanzada a "${nextPhase.toUpperCase()}". Se envió notificación automática a ${log.recipients.length} miembros.`);
  };

  // Manual Trigger Notification for Phase
  const handleTriggerPhaseNotification = (event: ReleaseEvent, phase: ReleasePhase) => {
    const { log } = dispatchPhaseNotification(event, phase, 'Automated Phase Alert');
    setNotificationLogs(prev => [log, ...prev]);
    showToast(`Alerta de fase "${phase}" registrada para ${log.recipients.length} miembros asignados.`);
  };

  // Toggle Checklist Item completed
  const handleToggleChecklist = (eventId: string, checklistId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const updatedChecklist = e.checklist.map(c => 
        c.id === checklistId ? { ...c, completed: !c.completed } : c
      );
      const updated = { ...e, checklist: updatedChecklist };
      if (drawerEvent?.id === eventId) setDrawerEvent(updated);
      return updated;
    }));
  };

  // Toggle Task visibility in Calendar & Sharing
  const handleToggleTaskCalendar = (eventId: string, checklistId: string) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const updatedChecklist = e.checklist.map(c =>
        c.id === checklistId ? { ...c, includeInCalendar: !c.includeInCalendar } : c
      );
      const updated = { ...e, checklist: updatedChecklist };
      if (drawerEvent?.id === eventId) setDrawerEvent(updated);
      return updated;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
            toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
            toast.type === 'info' ? 'bg-blue-950/90 border-blue-500/50 text-blue-200' :
            'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}>
            {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> :
             toast.type === 'info' ? <Info className="w-4 h-4 text-blue-400" /> :
             <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        user={user}
        hasCalendarToken={!!calendarToken}
        isSyncing={isSyncing}
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedEnv={selectedEnv}
        setSelectedEnv={setSelectedEnv}
        onOpenCreateModal={() => {
          setEditingEvent(null);
          setCreationPresetDate(undefined);
          setIsCreateModalOpen(true);
        }}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenMembersModal={() => setIsMembersModalOpen(true)}
        onSyncCalendar={() => syncWithGoogleCalendar()}
        unreadNotificationsCount={notificationLogs.length}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onLoginSuccess={handleLoginSuccess}
        onAuthError={details => {
          setLastAuthError(details);
          setIsGoogleDiagnosticsOpen(true);
        }}
        onOpenGoogleDiagnostics={() => setIsGoogleDiagnosticsOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'month' && (
          <CalendarMonthView
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={ev => setDrawerEvent(ev)}
            onCreateAtDate={date => {
              setEditingEvent(null);
              setCreationPresetDate(date);
              setIsCreateModalOpen(true);
            }}
            selectedEnv={selectedEnv}
            onSelectEnv={setSelectedEnv}
          />
        )}

        {currentView === 'week' && (
          <CalendarWeekView
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onSelectEvent={ev => setDrawerEvent(ev)}
            onCreateAtDate={date => {
              setEditingEvent(null);
              setCreationPresetDate(date);
              setIsCreateModalOpen(true);
            }}
            selectedEnv={selectedEnv}
            onSelectEnv={setSelectedEnv}
          />
        )}

        {currentView === 'pipeline' && (
          <PipelineView
            events={events}
            onSelectEvent={ev => setDrawerEvent(ev)}
            onAdvancePhase={handleAdvancePhase}
            selectedEnv={selectedEnv}
            onSelectEnv={setSelectedEnv}
          />
        )}
      </main>

      {/* Members List & Directory Modal (Opened via User Icon in Navbar) */}
      <MembersView
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        directory={memberDirectory}
        events={events}
        onUpsertDirectoryMember={handleUpsertDirectoryMember}
        onDeleteDirectoryMember={handleDeleteDirectoryMember}
      />

      {/* Release Create / Edit Modal */}
      <ReleaseModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
        initialDate={creationPresetDate}
        hasCalendarToken={!!calendarToken}
        memberDirectory={memberDirectory}
        onUpsertDirectoryMember={handleUpsertDirectoryMember}
      />

      {/* Import ServiceNow / JIRA Excel Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingEvents={events}
        memberDirectory={memberDirectory}
        onApplyImport={handleApplyImport}
      />

      {/* Google Connection & IT Diagnostics Modal */}
      <GoogleDiagnosticsModal
        isOpen={isGoogleDiagnosticsOpen}
        onClose={() => setIsGoogleDiagnosticsOpen(false)}
        lastAuthError={lastAuthError}
        hasCalendarToken={!!calendarToken}
        userEmail={user?.email}
        onLoginSuccess={handleLoginSuccess}
        onManualTokenSuccess={handleManualTokenSuccess}
      />

      {/* Release Details Slide-Over Drawer */}
      <ReleaseDetailsDrawer
        isOpen={!!drawerEvent}
        event={drawerEvent}
        onClose={() => setDrawerEvent(null)}
        onEdit={ev => {
          setEditingEvent(ev);
          setIsCreateModalOpen(true);
        }}
        onDelete={ev => setDeleteEvent(ev)}
        onToggleChecklist={handleToggleChecklist}
        onToggleTaskCalendar={handleToggleTaskCalendar}
        onTriggerNotification={handleTriggerPhaseNotification}
      />

      {/* Delete Confirmation Modal (MANDATORY User Confirmation for Destructive Operations) */}
      <DeleteConfirmationModal
        isOpen={!!deleteEvent}
        event={deleteEvent}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteEvent(null)}
        isDeleting={isDeleting}
        hasCalendarToken={!!calendarToken}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        logs={notificationLogs}
        events={events}
        onTriggerNotification={handleTriggerPhaseNotification}
        hasCalendarToken={!!calendarToken}
        onOpenGoogleDiagnostics={() => {
          setIsNotificationModalOpen(false);
          setIsGoogleDiagnosticsOpen(true);
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        events={events}
      />
    </div>
  );
}

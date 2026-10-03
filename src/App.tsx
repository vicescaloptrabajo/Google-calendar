/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  getAccessToken, 
  setCachedAccessToken 
} from './services/auth';
import { 
  fetchGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent 
} from './services/calendarService';
import { dispatchPhaseNotification } from './services/notificationService';
import { INITIAL_RELEASES } from './data/seedReleases';
import { ReleaseEvent, ReleasePhase, Environment, NotificationLog } from './types/release';
import { Navbar } from './components/Navbar';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { PipelineView } from './components/PipelineView';
import { ReleaseModal } from './components/ReleaseModal';
import { ReleaseDetailsDrawer } from './components/ReleaseDetailsDrawer';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ShareModal } from './components/ShareModal';
import { CheckCircle2, AlertTriangle, Info, Bell, RefreshCw } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // App data state
  const [events, setEvents] = useState<ReleaseEvent[]>(INITIAL_RELEASES);
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
    showToast(`Conectado como ${loggedInUser.displayName || loggedInUser.email}. Sincronizando calendario...`);
    syncWithGoogleCalendar(token);
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
      showToast(editingEvent ? 'Liberación actualizada localmente.' : 'Liberación guardada localmente.');
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
    showToast(`Alerta de fase "${phase}" enviada a ${log.recipients.length} miembros asignados.`);
  };

  // Toggle Checklist Item
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
        onSyncCalendar={() => syncWithGoogleCalendar()}
        unreadNotificationsCount={notificationLogs.length}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onLoginSuccess={handleLoginSuccess}
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

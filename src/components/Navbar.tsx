import React from 'react';
import { User } from 'firebase/auth';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Bell, 
  RefreshCw, 
  LogOut, 
  Layers, 
  Clock, 
  Kanban, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Share2,
  Sun,
  Moon
} from 'lucide-react';
import { googleSignIn, logout } from '../services/auth';
import { Environment } from '../types/release';

interface NavbarProps {
  user: User | null;
  hasCalendarToken: boolean;
  isSyncing: boolean;
  currentView: 'month' | 'week' | 'pipeline' | 'notifications';
  setCurrentView: (view: 'month' | 'week' | 'pipeline' | 'notifications') => void;
  selectedEnv: Environment | 'all';
  setSelectedEnv: (env: Environment | 'all') => void;
  onOpenCreateModal: () => void;
  onSyncCalendar: () => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onLoginSuccess: (user: User, token: string) => void;
  onOpenShareModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  hasCalendarToken,
  isSyncing,
  currentView,
  setCurrentView,
  selectedEnv,
  setSelectedEnv,
  onOpenCreateModal,
  onSyncCalendar,
  unreadNotificationsCount,
  onOpenNotifications,
  onLoginSuccess,
  onOpenShareModal,
  theme,
  onToggleTheme
}) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onLoginSuccess(res.user, res.accessToken);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-emerald-500 dark:to-teal-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold ring-2 ring-blue-100 dark:ring-emerald-500/20">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                  Release<span className="text-blue-600 dark:text-emerald-400">Hub</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60">
                  Release Ops
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:block leading-none mt-0.5 font-medium">
                Control de Cambios & Calendario
              </p>
            </div>
          </div>

          {/* Navigation Views Switcher */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-inner">
            <button
              onClick={() => setCurrentView('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'month'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white border border-slate-200 dark:border-slate-600 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setCurrentView('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'week'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white border border-slate-200 dark:border-slate-600 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setCurrentView('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'pipeline'
                  ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-white border border-slate-200 dark:border-slate-600 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
              <span>Pipeline</span>
            </button>
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dark / Light Mode Switcher */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a Modo Claro (Blanco/Azul/Naranja)' : 'Cambiar a Modo Oscuro (Cyber Dark)'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
              )}
            </button>

            {/* Share with Team Trigger */}
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Compartir calendario con tu equipo"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Compartir</span>
            </button>

            {/* Notification Center Trigger */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
              title="Centro de Notificaciones Automáticas por Fase"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-orange-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Google Calendar Sync Button or Official Sign-In */}
            {hasCalendarToken && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSyncCalendar}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  title="Sincronizar eventos con Google Calendar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Google Cal</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
                </button>

                <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 dark:border-slate-700">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full ring-2 ring-blue-500/30" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {(user.displayName || user.email || 'RM').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleGoogleLogin} 
                disabled={isSigningIn}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap border border-slate-300 dark:border-slate-700"
                title="Conectar con Google Calendar para sincronizar eventos y alertas automáticas"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="hidden sm:inline">{isSigningIn ? 'Conectando...' : 'Google Calendar'}</span>
                <span className="sm:hidden">{isSigningIn ? '...' : 'Google'}</span>
              </button>
            )}

            {/* Create Release Button in Warm Orange / Sunset Accent */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Liberación</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

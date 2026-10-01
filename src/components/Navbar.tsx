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
  AlertTriangle 
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
  onLoginSuccess
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
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl ring-2 ring-emerald-400/30">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Release<span className="text-emerald-400">Hub</span></span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Release Manager
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Control de Cambios & Sincronización Google Calendar</p>
            </div>
          </div>

          {/* Navigation Views Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setCurrentView('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'month'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Mes
            </button>
            <button
              onClick={() => setCurrentView('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'week'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Línea Temporal
            </button>
            <button
              onClick={() => setCurrentView('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'pipeline'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline de Fases
            </button>
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Environment Filter */}
            <div className="hidden lg:flex items-center bg-slate-800/70 rounded-lg p-1 border border-slate-700/60 text-xs">
              {(['all', 'production', 'staging', 'pre-prod'] as const).map(env => (
                <button
                  key={env}
                  onClick={() => setSelectedEnv(env)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-all ${
                    selectedEnv === env
                      ? env === 'production'
                        ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                        : 'bg-slate-700 text-emerald-400 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {env === 'all' ? 'Todos Entornos' : env}
                </button>
              ))}
            </div>

            {/* Notification Center Trigger */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-colors"
              title="Centro de Notificaciones Automáticas por Fase"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-all"
                  title="Sincronizar eventos con Google Calendar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Google Calendar</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                </button>

                <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full ring-2 ring-emerald-500/40" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                      {(user.displayName || user.email || 'RM').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleGoogleLogin} 
                disabled={isSigningIn}
                className="gsi-material-button shadow-sm cursor-pointer"
                title="Conectar con Google Calendar para sincronizar eventos y alertas automáticas"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-xs font-semibold">
                    {isSigningIn ? 'Conectando...' : 'Sincronizar Google'}
                  </span>
                </div>
              </button>
            )}

            {/* Create Release Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Liberación</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800">
          <button
            onClick={() => setCurrentView('month')}
            className={`flex items-center gap-1 text-xs py-1 px-3 rounded-md font-medium ${
              currentView === 'month' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Mes
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`flex items-center gap-1 text-xs py-1 px-3 rounded-md font-medium ${
              currentView === 'week' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Semana
          </button>
          <button
            onClick={() => setCurrentView('pipeline')}
            className={`flex items-center gap-1 text-xs py-1 px-3 rounded-md font-medium ${
              currentView === 'pipeline' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            Pipeline
          </button>
        </div>
      </div>
    </header>
  );
};

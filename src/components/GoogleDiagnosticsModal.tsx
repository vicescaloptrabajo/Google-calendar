import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  Globe,
  Key,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Server,
  HelpCircle
} from 'lucide-react';
import {
  firebaseConfig,
  GoogleAuthErrorDetails,
  testGoogleApiConnectivity,
  validateManualGoogleToken,
  googleSignIn,
  explainGoogleAuthError
} from '../services/auth';
import { User } from 'firebase/auth';

interface GoogleDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastAuthError: GoogleAuthErrorDetails | null;
  hasCalendarToken: boolean;
  userEmail?: string | null;
  onLoginSuccess: (user: User, token: string) => void;
  onManualTokenSuccess: (email: string, name: string, token: string) => void;
}

export const GoogleDiagnosticsModal: React.FC<GoogleDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  lastAuthError,
  hasCalendarToken,
  userEmail,
  onLoginSuccess,
  onManualTokenSuccess
}) => {
  const [netStatus, setNetStatus] = useState<{
    loading: boolean;
    online: boolean;
    googleReachable: boolean;
    latencyMs: number;
    details: string;
  }>({
    loading: true,
    online: true,
    googleReachable: true,
    latencyMs: 0,
    details: 'Verificando comunicación con servidores de Google...'
  });

  const [localError, setLocalError] = useState<GoogleAuthErrorDetails | null>(lastAuthError);
  const [isRetryingPopup, setIsRetryingPopup] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Manual token validation state
  const [manualToken, setManualToken] = useState('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setLocalError(lastAuthError);
  }, [lastAuthError]);

  const runNetworkCheck = async () => {
    setNetStatus(prev => ({ ...prev, loading: true }));
    const res = await testGoogleApiConnectivity();
    setNetStatus({
      loading: false,
      ...res
    });
  };

  useEffect(() => {
    if (isOpen) {
      runNetworkCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  const handleRetryGoogleLogin = async () => {
    setIsRetryingPopup(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setLocalError(null);
        onLoginSuccess(res.user, res.accessToken);
        onClose();
      }
    } catch (err: any) {
      const explained = explainGoogleAuthError(err);
      setLocalError(explained);
    } finally {
      setIsRetryingPopup(false);
    }
  };

  const handleValidateManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setIsTestingToken(true);
    setTokenFeedback(null);
    const result = await validateManualGoogleToken(manualToken);
    setIsTestingToken(false);

    if (result.valid) {
      setTokenFeedback({
        ok: true,
        msg: `¡Conexión validada con éxito! Conectado al calendario de ${result.email}.`
      });
      setTimeout(() => {
        onManualTokenSuccess(
          result.email || 'vicescalop.trabajo@gmail.com',
          result.name || 'Release Manager',
          manualToken.trim()
        );
        onClose();
      }, 900);
    } else {
      setTokenFeedback({
        ok: false,
        msg: result.error || 'Token inválido o expirado.'
      });
    }
  };

  const itTechnicalReport = `
====================================================================
REPORTE TÉCNICO PARA DEPARTAMENTO DE TI - INTEGRACIÓN GOOGLE WORKSPACE
Sistema: ReleaseHub (Calendario de Control de Cambios & Liberaciones)
====================================================================

1. DIAGNÓSTICO DE RED Y NAVEGADOR:
- Estado de Red hacia *.googleapis.com: ${netStatus.googleReachable ? `CONECTADO (${netStatus.latencyMs} ms)` : 'BLOQUEADO / SIN RESPUESTA'}
- Dominio actual de despliegue (Host): ${currentDomain}
- Origen completo (Origin): ${currentOrigin}
- Ejecución en contenedor (iFrame): ${isIframe ? 'Sí (Vista previa embebida)' : 'No (Ventana directa)'}
- Último evento de ventana OAuth: ${localError ? `${localError.code} - ${localError.title}` : hasCalendarToken ? 'Conectado correctamente' : 'Pendiente de autorización de dominio'}

2. PARÁMETROS OAUTH 2.0 / FIREBASE A AUTORIZAR POR TI:
- Firebase Project ID: ${firebaseConfig.projectId}
- Firebase Auth Domain: ${firebaseConfig.authDomain}
- Google OAuth 2.0 Client ID: ${firebaseConfig.oAuthClientId}
- Scope requerido (Mínimo privilegio): https://www.googleapis.com/auth/calendar.events

3. ACCIONES REQUERIDAS POR EL DEPARTAMENTO DE TI:
A) En Firebase Console (https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings):
   -> Ir a "Authentication" > "Settings" > "Authorized domains"
   -> Agregar el dominio: ${currentDomain}

B) En Google Cloud Console > APIs & Services > Credentials:
   -> En el OAuth 2.0 Client ID (${firebaseConfig.oAuthClientId}), agregar en "Authorized JavaScript origins":
      ${currentOrigin}
   -> Verificar que "Google Calendar API" esté habilitada.

C) Reglas de Firewall / Proxy Corporativo (Puerto 443 HTTPS):
   -> Permitir acceso a:
      - https://accounts.google.com
      - https://www.googleapis.com
      - https://${firebaseConfig.authDomain}
      - https://apis.google.com
====================================================================
  `.trim();

  const handleCopyReport = () => {
    navigator.clipboard.writeText(itTechnicalReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Validador de Conexión Google Calendar & Diagnóstico para TI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verifica por qué se cierra la ventana emergente, comprueba la red y genera el reporte para el área de TI
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Network Reachability */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                  1. Conexión a Google
                </span>
                {netStatus.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                ) : netStatus.googleReachable ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Online ({netStatus.latencyMs}ms)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Sin Alcance
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {netStatus.details}
              </p>
            </div>

            {/* 2. Domain & Iframe Check */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                  2. Dominio Actual
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {isIframe ? 'Vista Previa (iFrame)' : 'Directo'}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate" title={currentDomain}>
                {currentDomain}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Debe estar autorizado en Firebase Auth / GCP.
              </p>
            </div>

            {/* 3. Session Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
                  3. Estado OAuth
                </span>
                {hasCalendarToken ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Conectado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Modo Local
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {hasCalendarToken
                  ? `Sincronizado con ${userEmail || 'Google Calendar'}`
                  : 'Listo para conectar o validar con token.'}
              </p>
            </div>
          </div>

          {/* Explanation of why popup opens and closes */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {localError
                    ? `Diagnóstico detectado (${localError.code}): ${localError.title}`
                    : '¿Por qué la ventana de "Conectar con Google" se abre y se cierra sola?'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetryGoogleLogin}
                disabled={isRetryingPopup}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingPopup ? 'animate-spin' : ''}`} />
                <span>{isRetryingPopup ? 'Probando Popup...' : 'Probar Botón Google Ahora'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {localError ? (
                localError.explanation
              ) : (
                <>
                  <strong>Sí hay conexión a internet</strong> ({netStatus.latencyMs}ms a Google APIs). Sin embargo, cuando el popup de Google se abre y se cierra en 1 segundo, se debe a que el dominio temporal o corporativo donde corre la app (<code>{currentDomain}</code>) <strong>aún no está en la lista blanca ("Authorized Domains") de Firebase / Google Cloud</strong>, o bien el navegador bloquea cookies de terceros dentro de una vista previa embebida.
                </>
              )}
            </p>

            {localError && (
              <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 text-xs text-slate-800 dark:text-slate-200">
                <strong className="text-amber-700 dark:text-amber-400">Acción para TI: </strong>
                {localError.itActionRequired}
              </div>
            )}
          </div>

          {/* Direct Validation via OAuth Token (So the user can validate Google Calendar right now!) */}
          <form
            onSubmit={handleValidateManualToken}
            className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-600 dark:text-emerald-400" />
                <span>Validar Conexión Real mediante Token OAuth (Sin esperar al Popup):</span>
              </div>
              <a
                href="https://developers.google.com/oauthplayground/#step1&apisSelect=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=unchecked"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Obtener token de prueba en Google OAuth Playground</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Si deseas validar que la sincronización con tu cuenta <code>vicescalop.trabajo@gmail.com</code> funciona antes de que TI autorice el dominio del popup, puedes pegar aquí un <strong>Access Token</strong> con el permiso <code>calendar.events</code>:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Pega aquí tu Google OAuth Access Token (ya29.a0...)"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isTestingToken || !manualToken.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isTestingToken ? 'Validando con Google...' : 'Validar y Conectar Calendario'}
              </button>
            </div>

            {tokenFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  tokenFeedback.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {tokenFeedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{tokenFeedback.msg}</span>
              </div>
            )}
          </form>

          {/* Technical Report for IT Department */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-orange-500" />
                <span>Ficha Técnica para Entregar al Departamento de TI:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Reporte Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Reporte para TI</span>
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-900 dark:bg-slate-950 text-slate-200 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
              {itTechnicalReport}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <button
            type="button"
            onClick={runNetworkCheck}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Volver a verificar red</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

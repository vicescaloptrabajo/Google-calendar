import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export { firebaseConfig };

export interface GoogleAuthErrorDetails {
  code: string;
  title: string;
  explanation: string;
  itActionRequired: string;
  currentDomain: string;
  isIframe: boolean;
  timestamp: string;
}

/**
 * Translates Firebase Auth / Popup errors into actionable Spanish diagnostics for the user and IT department
 */
export const explainGoogleAuthError = (error: any): GoogleAuthErrorDetails => {
  const code = error?.code || 'auth/unknown-error';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'desconocido';
  const isIframe = typeof window !== 'undefined' ? window.self !== window.top : false;

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      title: 'Dominio actual aún no autorizado en Firebase / Google Cloud',
      explanation: `La ventana de Google se abre y se cierra inmediatamente porque el dominio actual (${currentDomain}) no está registrado en la lista de dominios autorizados del proyecto Firebase.`,
      itActionRequired: `El departamento de TI o administrador de Firebase debe agregar "${currentDomain}" en Firebase Console → Authentication → Settings → Authorized domains.`,
      currentDomain,
      isIframe,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      title: 'La ventana emergente de Google se cerró antes de completar el acceso',
      explanation: isIframe
        ? `Estás ejecutando la aplicación dentro de un contenedor de vista previa (iframe) en "${currentDomain}". Muchos navegadores corporativos o políticas de cookies de terceros cierran automáticamente el popup de OAuth o requieren que el dominio esté autorizado.`
        : 'La ventana de inicio de sesión se cerró manualmente o fue interceptada por una política de seguridad del navegador.',
      itActionRequired: `1) Verificar que "${currentDomain}" esté en Authorized Domains de Firebase Auth. 2) Permitir ventanas emergentes y cookies de terceros para accounts.google.com y ${ firebaseConfig.authDomain }.`,
      currentDomain,
      isIframe,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: 'Ventana emergente (Popup) bloqueada por el navegador',
      explanation: 'El navegador bloqueó la apertura de la ventana de autenticación de Google.',
      itActionRequired: `Habilitar ventanas emergentes (popups) en el navegador para el sitio ${currentDomain}.`,
      currentDomain,
      isIframe,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      title: 'Sin conexión a los servidores de autenticación de Google',
      explanation: 'No fue posible establecer comunicación de red con Google / Firebase Auth (posible bloqueo de proxy o firewall corporativo).',
      itActionRequired: 'Permitir tráfico HTTPS (puerto 443) hacia *.googleapis.com, *.firebaseapp.com y accounts.google.com en el firewall o proxy.',
      currentDomain,
      isIframe,
      timestamp: new Date().toLocaleTimeString()
    };
  }

  return {
    code,
    title: 'Error de conexión con Google OAuth',
    explanation: error?.message || 'La ventana de autenticación no pudo devolver la credencial de acceso.',
    itActionRequired: `Revisar configuración del OAuth Client ID (${firebaseConfig.oAuthClientId}) y autorizar el dominio ${currentDomain} en Google Cloud Console.`,
    currentDomain,
    isIframe,
    timestamp: new Date().toLocaleTimeString()
  };
};

/**
 * Validates network connectivity to Google Calendar API and optionally tests a manual OAuth token
 */
export const testGoogleApiConnectivity = async (): Promise<{
  online: boolean;
  googleReachable: boolean;
  latencyMs: number;
  details: string;
}> => {
  const start = Date.now();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!online) {
    return {
      online: false,
      googleReachable: false,
      latencyMs: 0,
      details: 'El navegador reporta que no hay conexión a Internet (navigator.onLine = false).'
    };
  }

  try {
    // Unauthenticated call to Calendar API returns 401/403 JSON if reachable
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      method: 'GET'
    });
    const latencyMs = Date.now() - start;
    // Status 401 or 403 proves that www.googleapis.com is reachable through the network/firewall
    if (res.status === 401 || res.status === 403 || res.status === 200) {
      return {
        online: true,
        googleReachable: true,
        latencyMs,
        details: `Conexión de red exitosa hacia www.googleapis.com (${latencyMs} ms). Los servidores de Google responden correctamente.`
      };
    }
    return {
      online: true,
      googleReachable: true,
      latencyMs,
      details: `Respuesta recibida de Google APIs con código HTTP ${res.status} (${latencyMs} ms).`
    };
  } catch (err: any) {
    return {
      online,
      googleReachable: false,
      latencyMs: Date.now() - start,
      details: `Bloqueo de red o firewall al intentar conectar con https://www.googleapis.com (${err?.message || 'Network Error'}).`
    };
  }
};

/**
 * Validates a manual OAuth access token directly against Google APIs so the user can test Calendar sync
 */
export const validateManualGoogleToken = async (
  rawToken: string
): Promise<{ valid: boolean; email?: string; name?: string; error?: string }> => {
  const token = rawToken.trim();
  if (!token) return { valid: false, error: 'El token está vacío.' };

  try {
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!calRes.ok) {
      return {
        valid: false,
        error: `Google Calendar rechazó el token (HTTP ${calRes.status}). Asegúrate de que tenga el permiso https://www.googleapis.com/auth/calendar.events.`
      };
    }

    // Try to get user email from userinfo or primary calendar
    let email = 'usuario.google@gmail.com';
    let name = 'Usuario Google Calendar';
    try {
      const primaryRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (primaryRes.ok) {
        const primaryData = await primaryRes.json();
        if (primaryData.id) email = primaryData.id;
        if (primaryData.summary) name = primaryData.summary;
      }
    } catch {
      // ignore fallback
    }

    cachedAccessToken = token;
    return { valid: true, email, name };
  } catch (err: any) {
    return {
      valid: false,
      error: `Error de red al validar el token: ${err?.message || 'Desconocido'}`
    };
  }
};

// Configure Google Auth Provider with Google Calendar scope
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
// Prompt user to select account and ensure consent
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory (MANDATORY: Never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged in to Firebase, but access token needs popup refresh
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup and acquire Google Calendar OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth credential');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sets access token manually if refreshed
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Sign out and clear in-memory tokens
 */
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

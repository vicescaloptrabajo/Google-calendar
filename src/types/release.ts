/**
 * Types and interfaces for Release Manager & Change Control Calendar
 */

export type Environment = 'production' | 'staging' | 'pre-prod' | 'disaster-recovery';

export type ReleasePhase = 
  | 'planning' 
  | 'code-freeze' 
  | 'cab-review' 
  | 'deployment-window' 
  | 'smoke-testing' 
  | 'maintenance-window' 
  | 'hotfix-emergency' 
  | 'completed'
  | 'rollback';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CABStatus = 'pending' | 'approved' | 'rejected' | 'exempt';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Release Manager' | 'DevOps / SRE' | 'Tech Lead' | 'QA Lead' | 'DBA' | 'Security Lead' | 'Product Owner' | 'Stakeholder';
  phase: ReleasePhase | 'all';
  notified?: boolean;
  lastNotifiedAt?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  phase: 'pre' | 'during' | 'post';
  completed: boolean;
  assignedTo?: string;
  completedAt?: string;
}

export interface NotificationsConfig {
  autoNotifyGoogleAttendees: boolean;
  emailAlertsEnabled: boolean;
  popupRemindersEnabled: boolean;
  remindMinutesBefore: number[]; // e.g. [15, 60, 1440]
  notifyOnPhaseChange: boolean;
  slackWebhookActive?: boolean;
}

export interface ReleaseEvent {
  id: string;
  googleEventId?: string;
  htmlLink?: string;
  title: string;
  releaseTag: string; // e.g. v2.4.0
  changeTicketId: string; // e.g. CHG-2026-089
  service: string; // e.g. Core Banking API, Auth Microservice, Checkout Flow
  environment: Environment;
  phase: ReleasePhase;
  risk: RiskLevel;
  cabStatus: CABStatus;
  startTime: string; // ISO string
  endTime: string; // ISO string
  color: string; // Hex color code
  downtimeExpectedMinutes: number;
  rollbackPlan: string;
  rollbackEstimateMinutes: number;
  runbookUrl?: string;
  jiraTicketUrl?: string;
  owner: {
    name: string;
    email: string;
  };
  involvedMembers: TeamMember[];
  checklist: ChecklistItem[];
  notificationsConfig: NotificationsConfig;
  notes?: string;
  updatedAt?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  releaseId: string;
  releaseTag: string;
  releaseTitle: string;
  phase: ReleasePhase;
  recipients: string[];
  channel: 'Google Calendar Reminder' | 'Email Notification' | 'Automated Phase Alert' | 'Slack Dispatch';
  status: 'sent' | 'pending' | 'failed';
  summary: string;
}

export interface PhaseMetadata {
  id: ReleasePhase;
  label: string;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
}

export const PHASE_CONFIG: Record<ReleasePhase, PhaseMetadata> = {
  'planning': {
    id: 'planning',
    label: 'Planificación de Release',
    color: '#3b82f6', // blue
    bgLight: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    description: 'Definición de alcance, historias y criterios de aceptación.'
  },
  'code-freeze': {
    id: 'code-freeze',
    label: 'Code Freeze & RC',
    color: '#8b5cf6', // purple
    bgLight: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8b5cf6',
    description: 'Congelamiento de código fuente para estabilización y pruebas finales.'
  },
  'cab-review': {
    id: 'cab-review',
    label: 'Comité de Cambios (CAB)',
    color: '#f59e0b', // amber
    bgLight: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
    description: 'Evaluación y aprobación de riesgos por el Change Advisory Board.'
  },
  'deployment-window': {
    id: 'deployment-window',
    label: 'Ventana de Despliegue',
    color: '#10b981', // emerald
    bgLight: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    description: 'Ejecución del pipeline en entorno productivo o staging.'
  },
  'smoke-testing': {
    id: 'smoke-testing',
    label: 'Smoke Test & Validación',
    color: '#06b6d4', // cyan
    bgLight: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
    description: 'Pruebas de humo, validación de métricas y verificación de negocio.'
  },
  'maintenance-window': {
    id: 'maintenance-window',
    label: 'Ventana de Mantenimiento',
    color: '#f97316', // orange
    bgLight: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    description: 'Mantenimiento de infraestructura, base de datos o migraciones críticas.'
  },
  'hotfix-emergency': {
    id: 'hotfix-emergency',
    label: 'Hotfix de Emergencia',
    color: '#ef4444', // red
    bgLight: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    description: 'Liberación urgente para resolución de incidente en producción P1/P2.'
  },
  'completed': {
    id: 'completed',
    label: 'Liberación Exitosa',
    color: '#14b8a6', // teal
    bgLight: 'rgba(20, 184, 166, 0.15)',
    borderColor: '#14b8a6',
    description: 'Cambio cerrado satisfactoriamente sin incidencias activas.'
  },
  'rollback': {
    id: 'rollback',
    label: 'Rollback / Reversión',
    color: '#e11d48', // rose
    bgLight: 'rgba(225, 29, 72, 0.15)',
    borderColor: '#e11d48',
    description: 'Procedimiento de marcha atrás ejecutado ante anomalías.'
  }
};

export const COLOR_PALETTE = [
  { name: 'Emerald (Deploy Seguro)', hex: '#10b981' },
  { name: 'Blue (Planificación)', hex: '#3b82f6' },
  { name: 'Purple (Code Freeze/RC)', hex: '#8b5cf6' },
  { name: 'Amber (CAB / Revisión)', hex: '#f59e0b' },
  { name: 'Cyan (Smoke Tests)', hex: '#06b6d4' },
  { name: 'Orange (Mantenimiento)', hex: '#f97316' },
  { name: 'Red (Hotfix / Emergencia)', hex: '#ef4444' },
  { name: 'Indigo (Infraestructura)', hex: '#6366f1' },
  { name: 'Rose (Rollback Drill)', hex: '#f43f5e' },
  { name: 'Teal (Post-Deploy)', hex: '#14b8a6' }
];

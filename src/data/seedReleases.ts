import { ReleaseEvent } from '../types/release';

export const INITIAL_RELEASES: ReleaseEvent[] = [
  {
    id: 'rel-seed-01',
    title: 'Despliegue Core Payments v3.2 & Pasarela 3DS',
    releaseTag: 'v3.2.0-PROD',
    changeTicketId: 'CHG-2026-1042',
    service: 'Core Payments & Checkout API',
    environment: 'production',
    phase: 'deployment-window',
    risk: 'high',
    cabStatus: 'approved',
    // September 30, 2026 21:00 - 23:00
    startTime: '2026-09-30T21:00:00.000Z',
    endTime: '2026-09-30T23:30:00.000Z',
    color: '#10b981', // emerald
    downtimeExpectedMinutes: 0,
    rollbackPlan: 'Canary deployment con rollback automático si tasa de error 5xx supera el 0.5% en 3 minutos. Restauración de imagen Docker v3.1.9 en Kubernetes.',
    rollbackEstimateMinutes: 8,
    runbookUrl: 'https://runbooks.internal/payments/v3-deployment',
    jiraTicketUrl: 'https://jira.internal/browse/PAY-8821',
    owner: {
      name: 'Vicente Escareño',
      email: 'vicescalop.trabajo@gmail.com'
    },
    involvedMembers: [
      { id: 'm1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'all', notified: true },
      { id: 'm2', name: 'Alejandro Morales', email: 'amorales.sre@company.com', role: 'DevOps / SRE', phase: 'deployment-window', notified: true },
      { id: 'm3', name: 'Elena Torres', email: 'etorres.qa@company.com', role: 'QA Lead', phase: 'smoke-testing', notified: false },
      { id: 'm4', name: 'Carlos Mendoza', email: 'cmendoza.sec@company.com', role: 'Security Lead', phase: 'cab-review', notified: true },
      { id: 'm5', name: 'Lucía Vega', email: 'lvega.dba@company.com', role: 'DBA', phase: 'planning', notified: true }
    ],
    checklist: [
      { id: 'chk-1', title: 'Snapshot y Backup de réplica PostgreSQL de Pagos', phase: 'pre', completed: true, assignedTo: 'Lucía Vega' },
      { id: 'chk-2', title: 'Aprobación unánime en sesión de CAB ordinario', phase: 'pre', completed: true, assignedTo: 'Vicente Escareño' },
      { id: 'chk-3', title: 'Despliegue progresivo 10% -> 50% -> 100% de pods', phase: 'during', completed: false, assignedTo: 'Alejandro Morales' },
      { id: 'chk-4', title: 'Validación de webhook con Stripe y Visa Tokenization', phase: 'post', completed: false, assignedTo: 'Elena Torres' },
      { id: 'chk-5', title: 'Verificación de SLOs en Datadog por 30 minutos', phase: 'post', completed: false, assignedTo: 'Alejandro Morales' }
    ],
    notificationsConfig: {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [120, 30, 10],
      notifyOnPhaseChange: true
    },
    notes: 'Liberación mayor para cumplir con requerimientos PCI-DSS 4.0. Se requiere presencia obligatoria en sala virtual de despliegue.'
  },
  {
    id: 'rel-seed-02',
    title: 'Migración Particionamiento Base de Datos Usuarios',
    releaseTag: 'v1.18.4-DB-MIG',
    changeTicketId: 'CHG-2026-1039',
    service: 'PostgreSQL User Cluster & Sharding',
    environment: 'production',
    phase: 'maintenance-window',
    risk: 'critical',
    cabStatus: 'approved',
    // October 1, 2026 03:00 - 05:00 UTC
    startTime: '2026-10-01T03:00:00.000Z',
    endTime: '2026-10-01T05:00:00.000Z',
    color: '#f97316', // orange
    downtimeExpectedMinutes: 15,
    rollbackPlan: 'Conmutación a réplica de lectura en espera mediante PgBouncer. Script revert_partitioning.sql listo para ejecución si timeout > 10 min.',
    rollbackEstimateMinutes: 12,
    runbookUrl: 'https://runbooks.internal/dba/sharding-phase2',
    jiraTicketUrl: 'https://jira.internal/browse/DATA-4402',
    owner: {
      name: 'Lucía Vega',
      email: 'lvega.dba@company.com'
    },
    involvedMembers: [
      { id: 'm5', name: 'Lucía Vega', email: 'lvega.dba@company.com', role: 'DBA', phase: 'all', notified: true },
      { id: 'm1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'all', notified: true },
      { id: 'm2', name: 'Alejandro Morales', email: 'amorales.sre@company.com', role: 'DevOps / SRE', phase: 'maintenance-window', notified: false }
    ],
    checklist: [
      { id: 'db-1', title: 'Activar página de mantenimiento temporal en Cloudflare', phase: 'pre', completed: false, assignedTo: 'Alejandro Morales' },
      { id: 'db-2', title: 'Drenar conexiones inactivas de PgBouncer', phase: 'pre', completed: false, assignedTo: 'Lucía Vega' },
      { id: 'db-3', title: 'Ejecutar script DDL concurrente sin lock de tablas', phase: 'during', completed: false, assignedTo: 'Lucía Vega' },
      { id: 'db-4', title: 'Verificar latencia de consultas < 15ms en réplicas', phase: 'post', completed: false, assignedTo: 'Lucía Vega' }
    ],
    notificationsConfig: {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [1440, 120, 15],
      notifyOnPhaseChange: true
    },
    notes: 'Ventana nocturna aprobada por el negocio. Se comunicó a soporte al cliente sobre interrupción controlada.'
  },
  {
    id: 'rel-seed-03',
    title: 'Code Freeze Release Trimestral Q4 Mobile & Web',
    releaseTag: 'v4.0.0-RC1',
    changeTicketId: 'CHG-2026-1050',
    service: 'Mobile iOS/Android & Web Frontend',
    environment: 'staging',
    phase: 'code-freeze',
    risk: 'medium',
    cabStatus: 'approved',
    // October 2, 2026 18:00 - 22:00 UTC
    startTime: '2026-10-02T18:00:00.000Z',
    endTime: '2026-10-02T22:00:00.000Z',
    color: '#8b5cf6', // purple
    downtimeExpectedMinutes: 0,
    rollbackPlan: 'Desbloqueo de ramas principales y cherry-pick selectivo solo para correcciones P1 autorizadas por Release Manager.',
    rollbackEstimateMinutes: 5,
    runbookUrl: 'https://runbooks.internal/release/freeze-guidelines',
    jiraTicketUrl: 'https://jira.internal/browse/REL-901',
    owner: {
      name: 'Vicente Escareño',
      email: 'vicescalop.trabajo@gmail.com'
    },
    involvedMembers: [
      { id: 'm1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'all', notified: true },
      { id: 'm3', name: 'Elena Torres', email: 'etorres.qa@company.com', role: 'QA Lead', phase: 'code-freeze', notified: true },
      { id: 'm6', name: 'Sofía Castro', email: 'scastro.tech@company.com', role: 'Tech Lead', phase: 'code-freeze', notified: true }
    ],
    checklist: [
      { id: 'cf-1', title: 'Bloqueo de merge en rama release/v4.0 en GitHub', phase: 'pre', completed: true, assignedTo: 'Vicente Escareño' },
      { id: 'cf-2', title: 'Compilación de Release Candidates (IPA y APK)', phase: 'during', completed: false, assignedTo: 'Sofía Castro' },
      { id: 'cf-3', title: 'Inicio de suite de pruebas de regresión automatizada', phase: 'post', completed: false, assignedTo: 'Elena Torres' }
    ],
    notificationsConfig: {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [1440, 60],
      notifyOnPhaseChange: true
    },
    notes: 'Ningún pull request que no sea corrección de bugs críticos será admitido en la rama v4.0.0.'
  },
  {
    id: 'rel-seed-04',
    title: 'Comité de Cambios Extraordinario (CAB) - Expansión Cloud',
    releaseTag: 'CAB-SES-102',
    changeTicketId: 'CHG-2026-1055',
    service: 'Multi-Region Infrastructure & Kubernetes',
    environment: 'production',
    phase: 'cab-review',
    risk: 'high',
    cabStatus: 'pending',
    // October 5, 2026 15:00 - 16:30 UTC
    startTime: '2026-10-05T15:00:00.000Z',
    endTime: '2026-10-05T16:30:00.000Z',
    color: '#f59e0b', // amber
    downtimeExpectedMinutes: 0,
    rollbackPlan: 'En caso de rechazo del comité, se ajusta la arquitectura en entorno pre-prod para la siguiente revisión ordinaria.',
    rollbackEstimateMinutes: 0,
    runbookUrl: 'https://docs.internal/cab/presentation-1055',
    jiraTicketUrl: 'https://jira.internal/browse/INFRA-5112',
    owner: {
      name: 'Vicente Escareño',
      email: 'vicescalop.trabajo@gmail.com'
    },
    involvedMembers: [
      { id: 'm1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'cab-review', notified: true },
      { id: 'm4', name: 'Carlos Mendoza', email: 'cmendoza.sec@company.com', role: 'Security Lead', phase: 'cab-review', notified: false },
      { id: 'm7', name: 'Marcos Herrera', email: 'mherrera.po@company.com', role: 'Product Owner', phase: 'cab-review', notified: false }
    ],
    checklist: [
      { id: 'cab-1', title: 'Revisión de matriz de riesgos e impacto comercial', phase: 'pre', completed: true, assignedTo: 'Vicente Escareño' },
      { id: 'cab-2', title: 'Validación de políticas de seguridad y SOC2', phase: 'during', completed: false, assignedTo: 'Carlos Mendoza' },
      { id: 'cab-3', title: 'Firma de autorización por los miembros del CAB', phase: 'post', completed: false, assignedTo: 'Vicente Escareño' }
    ],
    notificationsConfig: {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [1440, 120, 15],
      notifyOnPhaseChange: true
    },
    notes: 'Revisión obligatoria previa a la activación de la región secundaria en Europa.'
  },
  {
    id: 'rel-seed-05',
    title: 'Hotfix Parche de Seguridad Token Auth Expired',
    releaseTag: 'v3.1.10-HOTFIX',
    changeTicketId: 'CHG-2026-1061',
    service: 'Authentication Microservice (IAM)',
    environment: 'production',
    phase: 'hotfix-emergency',
    risk: 'critical',
    cabStatus: 'exempt',
    // September 29, 2026 14:00 - 15:30 UTC
    startTime: '2026-09-29T14:00:00.000Z',
    endTime: '2026-09-29T15:30:00.000Z',
    color: '#ef4444', // red
    downtimeExpectedMinutes: 0,
    rollbackPlan: 'Reversión instantánea mediante switch de Blue/Green deployment en AWS Route53.',
    rollbackEstimateMinutes: 3,
    runbookUrl: 'https://runbooks.internal/iam/emergency-patch',
    jiraTicketUrl: 'https://jira.internal/browse/SEC-9912',
    owner: {
      name: 'Vicente Escareño',
      email: 'vicescalop.trabajo@gmail.com'
    },
    involvedMembers: [
      { id: 'm1', name: 'Vicente Escareño', email: 'vicescalop.trabajo@gmail.com', role: 'Release Manager', phase: 'all', notified: true },
      { id: 'm4', name: 'Carlos Mendoza', email: 'cmendoza.sec@company.com', role: 'Security Lead', phase: 'hotfix-emergency', notified: true },
      { id: 'm2', name: 'Alejandro Morales', email: 'amorales.sre@company.com', role: 'DevOps / SRE', phase: 'hotfix-emergency', notified: true }
    ],
    checklist: [
      { id: 'hf-1', title: 'Validación en entorno aislado Staging', phase: 'pre', completed: true, assignedTo: 'Carlos Mendoza' },
      { id: 'hf-2', title: 'Despliegue directo por procedimiento de emergencia', phase: 'during', completed: true, assignedTo: 'Alejandro Morales' },
      { id: 'hf-3', title: 'Verificación de renovación de JWT en clientes activos', phase: 'post', completed: true, assignedTo: 'Elena Torres' },
      { id: 'hf-4', title: 'Documentación post-mortem para el comité', phase: 'post', completed: true, assignedTo: 'Vicente Escareño' }
    ],
    notificationsConfig: {
      autoNotifyGoogleAttendees: true,
      emailAlertsEnabled: true,
      popupRemindersEnabled: true,
      remindMinutesBefore: [15],
      notifyOnPhaseChange: true
    },
    notes: 'Cambio de emergencia cerrado exitosamente. Cero interrupciones reportadas.'
  }
];

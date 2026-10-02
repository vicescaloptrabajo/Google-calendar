import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Calendar as CalendarIcon, 
  Download, 
  ExternalLink, 
  Globe, 
  Mail, 
  ShieldCheck, 
  Building2,
  HelpCircle,
  Container,
  Terminal
} from 'lucide-react';
import { ReleaseEvent } from '../types/release';
import { downloadIcsFile } from '../services/icsExport';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ReleaseEvent[];
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  events
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'direct-url' | 'gcalendar' | 'ics' | 'embed' | 'docker'>('direct-url');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedDocker, setCopiedDocker] = useState(false);

  // App URLs from environment / metadata
  const sharedAppUrl = 'https://ais-pre-b7by5g7nlda6cmfbjzxx4t-93454846268.us-east1.run.app';
  const embedCode = `<iframe src="${sharedAppUrl}" width="100%" height="750" frameborder="0" style="border: 1px solid #1e293b; border-radius: 12px;"></iframe>`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handleDownloadIcs = () => {
    downloadIcsFile(events);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Compartir Calendario con el Equipo</h3>
              <p className="text-xs text-slate-400">
                Opciones para compartir si tu empresa restringe el dominio de AI Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-4 pt-2 gap-1 overflow-x-auto text-xs">
          {[
            { id: 'direct-url', label: '1. URL Independiente (Sin AI Studio)', icon: Globe },
            { id: 'gcalendar', label: '2. Google Calendar Nativo', icon: CalendarIcon },
            { id: 'ics', label: '3. Exportar .ICS (Outlook/Apple)', icon: Download },
            { id: 'embed', label: '4. Incrustar en Intranet', icon: Building2 },
            { id: 'docker', label: '5. Docker / Servidor Propio', icon: Container }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-400 bg-slate-800/40 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: Direct URL */}
          {activeTab === 'direct-url' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tu app NO está en aistudio.google.com — Está en Google Cloud Run</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Esta aplicación está desplegada en su propia URL independiente bajo el dominio de Google Cloud Run (<strong>*.run.app</strong>).
                  Tus compañeros de equipo <strong>no necesitan tener acceso a AI Studio ni una cuenta de AI Studio</strong> para abrir y utilizar este calendario.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Enlace Directo para tu Equipo (URL de Producción / Compartida):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sharedAppUrl}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Puedes enviar este enlace por Slack, Microsoft Teams, correo o chat interno. Cualquiera en tu red puede abrirlo.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <a
                  href={sharedAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-semibold"
                >
                  <span>Abrir enlace en pestaña nueva</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: Google Calendar Native */}
          {activeTab === 'gcalendar' && (
            <div className="space-y-4">
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-400" />
                  Sincronización Directa en el Google Calendar Corporativo
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Si tu empresa utiliza Google Workspace (Gmail corporativo / Google Calendar):
                </p>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <div>
                      <strong className="text-white block">Invitaciones automáticas a los miembros:</strong>
                      Al asignar los correos de tu equipo en cada fase, Google Calendar envía automáticamente la invitación al calendario oficial de cada miembro.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <div>
                      <strong className="text-white block">Compartir un Calendario Secundario de Release:</strong>
                      En Google Calendar (web), puedes crear un calendario llamado <em>"Releases & Cambios de TI"</em> y darle acceso a tu grupo de distribución o dominio de la empresa (ej. <code>equipo-ingenieria@tuempresa.com</code>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <div>
                      <strong className="text-white block">Cero dependencia de AI Studio:</strong>
                      Tus compañeros consultarán y recibirán recordatorios directamente en su app de Google Calendar en su celular, Mac o Windows sin tocar ningún enlace externo.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ICS Export */}
          {activeTab === 'ics' && (
            <div className="space-y-4">
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Descargar archivo iCalendar (.ICS) universal
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Si tu empresa utiliza <strong>Microsoft Outlook</strong>, <strong>Exchange</strong> o <strong>Apple Calendar</strong>, puedes generar un archivo <code>.ics</code> con todos los eventos de liberación, planes de rollback y contactos:
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-semibold text-white block">calendario-releases.ics</span>
                    <span className="text-[11px] text-slate-400">{events.length} liberaciones y ventanas programadas</span>
                  </div>
                  <button
                    onClick={handleDownloadIcs}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .ICS</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                  <p>• <strong>En Outlook:</strong> Archivo &gt; Abrir y exportar &gt; Abrir calendario (.ics).</p>
                  <p>• <strong>En Google Calendar:</strong> Configuración &gt; Importar y exportar &gt; Seleccionar archivo del equipo.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Embed */}
          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Incrustar en Confluence, Notion, SharePoint o Portal Interno
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Puedes incrustar la vista completa de este calendario directamente dentro de la wiki o intranet de tu empresa:
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Código iframe:</span>
                    <button
                      onClick={handleCopyEmbed}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      {copiedEmbed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEmbed ? '¡Copiado!' : 'Copiar código'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto select-all">
                    {embedCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Docker & Self-Hosted */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Container className="w-4 h-4 text-emerald-400" />
                    Ejecutar en Contenedor Docker en la Infraestructura de tu Empresa
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Autohospedado 100%
                  </span>
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  El proyecto ya incluye un <strong>Dockerfile</strong> multi-stage con Nginx optimizado y <strong>docker-compose.yml</strong> listo para desplegar en tus servidores internos (On-Premise, AWS ECS, GCP Cloud Run, Azure o Kubernetes) sin depender de AI Studio.
                </p>

                {/* Docker Compose snippet */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      Opción A: Iniciar con Docker Compose (1 solo comando)
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('docker compose up -d --build');
                        setCopiedDocker(true);
                        setTimeout(() => setCopiedDocker(false), 2000);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      {copiedDocker ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDocker ? '¡Copiado!' : 'Copiar comando'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-emerald-300 font-mono select-all">
                    docker compose up -d --build
                  </pre>
                  <p className="text-[10px] text-slate-400">
                    Levantará el servicio en el puerto <strong>8080</strong> (o el que configure tu equipo de DevOps).
                  </p>
                </div>

                {/* Docker Build snippet */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    Opción B: Construcción estándar de imagen Docker
                  </span>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono select-all">
                    docker build -t releasehub-calendar:latest .
                    docker run -d -p 8080:80 --name releasehub releasehub-calendar:latest
                  </pre>
                </div>

                {/* Files included notice */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                  <strong className="text-white block">Archivos incluidos en el repositorio:</strong>
                  <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
                    <li><code>Dockerfile</code>: Multi-stage build con Node 22 y Nginx Alpine.</li>
                    <li><code>docker-compose.yml</code>: Orquestación con reinicio automático y healthchecks.</li>
                    <li><code>DEPLOYMENT.md</code>: Guía completa para Kubernetes, AWS S3, Cloudflare y Nginx.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Funciona en cualquier navegador moderno sin VPN ni accesos especiales.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Download,
  AlertCircle,
  ArrowRight,
  Layers,
  Users
} from 'lucide-react';
import {
  ReleaseEvent,
  DirectoryMember,
  PHASE_CONFIG
} from '../types/release';
import {
  ImportSourceSystem,
  ImportPreviewItem,
  parseAndPreviewImportFile,
  downloadSampleSnowExcel,
  downloadSampleSnowUpdateExcel
} from '../services/importService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEvents: ReleaseEvent[];
  memberDirectory: DirectoryMember[];
  onApplyImport: (
    items: ImportPreviewItem[],
    source: 'servicenow' | 'jira'
  ) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  existingEvents,
  memberDirectory,
  onApplyImport
}) => {
  const [sourceChoice, setSourceChoice] = useState<ImportSourceSystem>('servicenow');
  const [detectedSource, setDetectedSource] = useState<'servicenow' | 'jira'>('servicenow');
  const [fileName, setFileName] = useState<string>('');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrorMsg(null);

    try {
      const result = await parseAndPreviewImportFile(
        file,
        sourceChoice,
        existingEvents,
        memberDirectory
      );
      setDetectedSource(result.detectedSource);
      setPreviewItems(result.items);
      if (result.items.length === 0) {
        setErrorMsg(
          'No se detectaron filas válidas. Verifica que el archivo contenga columnas como "Número", "Breve descripción", "Estado", "Fecha de inicio planificada".'
        );
      }
    } catch (err: any) {
      console.error('Error parsing Excel/CSV file:', err);
      setErrorMsg(`Error al leer el archivo: ${err.message || 'Formato no válido'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const newCount = previewItems.filter(i => i.action === 'create').length;
  const updateCount = previewItems.filter(i => i.action === 'update').length;

  const handleConfirm = () => {
    if (previewItems.length === 0) return;
    onApplyImport(previewItems, detectedSource);
    setPreviewItems([]);
    setFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Importar / Actualizar Concentrado ServiceNow (SNOW) & JIRA
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sube tu archivo .xlsx o .csv para crear nuevos cambios o actualizar el estado de cambios ya programados
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
          {/* Source Selector + Sample Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                1. Selecciona el Sistema de Origen:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { id: 'servicenow', label: 'ServiceNow (SNOW)' },
                  { id: 'jira', label: 'Atlassian JIRA' },
                  { id: 'auto', label: 'Auto-Detectar Columnas' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceChoice(opt.id as ImportSourceSystem)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      sourceChoice === opt.id
                        ? 'bg-blue-600 dark:bg-emerald-600 text-white border-blue-600 dark:border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={downloadSampleSnowExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-emerald-400 border border-blue-200 dark:border-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Descargar archivo Excel de ejemplo con las 14 columnas de ServiceNow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1. Plantilla SNOW (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={downloadSampleSnowUpdateExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Descargar archivo de 2da semana con cambios de Estado para probar la actualización automática"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>2. Ejemplo Actualización Estados (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Recognized Columns Banner */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5">
            <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Columnas soportadas automáticamente (ServiceNow / JIRA):</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
              Número | Breve descripción | Tipo | Categoría | Ambiente | Estado | Fecha de inicio planificada | Fecha límite planificada | Asignado a | Folio | Subcategoria | Abierto por | Abierto | Grupo de asignación
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              💡 <strong>Sincronización Inteligente (Upsert):</strong> Si vuelves a subir el archivo la siguiente semana y un ticket (ej. <code>CHG0045101</code>) cambió su columna <strong>Estado</strong> (por ejemplo de <em>Programado</em> a <em>Cerrado</em>), el calendario actualizará automáticamente su estado, color y fechas sin duplicarlo.
            </p>
          </div>

          {/* File Drop / Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-emerald-950/60 text-blue-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {fileName ? `Archivo cargado: ${fileName}` : 'Haz clic aquí para seleccionar tu archivo Excel (.xlsx, .xls) o CSV'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Exportado directamente desde ServiceNow o JIRA
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Vista Previa de Importación ({previewItems.length} registros):
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" />
                    {newCount} Nuevos
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {updateCount} Actualizaciones de Estado
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Acción</th>
                      <th className="py-2.5 px-3 font-bold">Número / Folio</th>
                      <th className="py-2.5 px-3 font-bold">Breve Descripción / Categoría</th>
                      <th className="py-2.5 px-3 font-bold">Ambiente</th>
                      <th className="py-2.5 px-3 font-bold">Estado / Fase</th>
                      <th className="py-2.5 px-3 font-bold">Inicio Planificado</th>
                      <th className="py-2.5 px-3 font-bold">Asignado a / Grupo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {previewItems.map((item, idx) => {
                      const ev = item.event;
                      const newPhaseLabel = PHASE_CONFIG[ev.phase]?.label || ev.phase;
                      const prevPhaseLabel = item.previousPhase ? PHASE_CONFIG[item.previousPhase]?.label : null;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="py-2 px-3">
                            {item.action === 'update' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Actualizar
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Nuevo
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            <div>{ev.changeTicketId}</div>
                            {ev.releaseTag !== ev.changeTicketId && (
                              <div className="text-[10px] text-slate-500">{ev.releaseTag}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 max-w-xs">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{ev.title}</div>
                            <div className="text-[10px] text-slate-500 truncate">{ev.service}</div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {ev.environment}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {item.action === 'update' && prevPhaseLabel && prevPhaseLabel !== newPhaseLabel ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] line-through text-slate-400">{prevPhaseLabel}</span>
                                <ArrowRight className="w-3 h-3 text-amber-500" />
                                <span className="font-bold text-amber-600 dark:text-amber-400">{newPhaseLabel}</span>
                              </div>
                            ) : (
                              <span
                                className="font-bold text-[11px]"
                                style={{ color: PHASE_CONFIG[ev.phase]?.color }}
                              >
                                {newPhaseLabel}
                              </span>
                            )}
                            {ev.externalMetadata?.rawStatus && (
                              <div className="text-[10px] text-slate-400">({ev.externalMetadata.rawStatus})</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {new Date(ev.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{ev.owner.name}</div>
                            {ev.externalMetadata?.assignmentGroup && (
                              <div className="text-[10px] text-blue-600 dark:text-emerald-400 font-medium">
                                {ev.externalMetadata.assignmentGroup}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-emerald-400" />
            <span>Los responsables y grupos de asignación se agregarán también al Directorio de Miembros.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={previewItems.length === 0 || isParsing}
              onClick={handleConfirm}
              className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Aplicar al Calendario ({newCount} nuevos, {updateCount} actualizados)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ReleaseEvent } from '../types/release';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  event: ReleaseEvent | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
  hasCalendarToken: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  event,
  onConfirm,
  onCancel,
  isDeleting,
  hasCalendarToken
}) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">¿Eliminar Liberación y Evento de Calendario?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esta acción no se puede deshacer. Se removerá la liberación del tablero de cambios
              {hasCalendarToken && event.googleEventId ? ' y se cancelará el evento sincronizado en Google Calendar enviando actualización a los involucrados.' : '.'}
            </p>
          </div>
        </div>

        {/* Event Summary Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
              {event.releaseTag}
            </span>
            <span className="text-rose-700 dark:text-rose-300 font-bold uppercase text-[10px] bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
              {event.environment}
            </span>
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-200">
            {event.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
            <span>Ticket: {event.changeTicketId}</span>
            <span>{event.involvedMembers.length} miembros asignados</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Eliminación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">¿Eliminar Liberación y Evento de Calendario?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Esta acción no se puede deshacer. Se removerá la liberación del tablero de cambios
              {hasCalendarToken && event.googleEventId ? ' y se cancelará el evento sincronizado en Google Calendar enviando actualización a los involucrados.' : '.'}
            </p>
          </div>
        </div>

        {/* Event Summary Card */}
        <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {event.releaseTag}
            </span>
            <span className="text-rose-400 font-bold uppercase text-[10px]">
              {event.environment}
            </span>
          </div>
          <div className="font-semibold text-slate-200">
            {event.title}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Ticket: {event.changeTicketId}</span>
            <span>{event.involvedMembers.length} miembros asignados</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

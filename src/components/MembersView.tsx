import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Trash2,
  Mail,
  Filter,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import {
  DirectoryMember,
  ReleaseEvent,
  MEMBER_ROLE_OPTIONS
} from '../types/release';
import { parseMembersFromExcelFile } from '../services/importService';

interface MembersViewProps {
  isOpen: boolean;
  onClose: () => void;
  directory: DirectoryMember[];
  events: ReleaseEvent[];
  onUpsertDirectoryMember: (member: Omit<DirectoryMember, 'id' | 'updatedAt'> & { id?: string }) => void;
  onDeleteDirectoryMember: (id: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  isOpen,
  onClose,
  directory,
  onUpsertDirectoryMember,
  onDeleteDirectoryMember
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Member Form State (Area blank '' by default, Email optional)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('');

  const filteredDirectory = useMemo(() => {
    return directory.filter(m => {
      if (roleFilter === '__blank__' && m.role !== '') return false;
      if (roleFilter !== 'all' && roleFilter !== '__blank__' && m.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [directory, roleFilter, searchQuery]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onUpsertDirectoryMember({
      name: newName.trim(),
      email: newEmail.trim(), // Can be empty if not known yet
      role: newRole // Can be '' (blank)
    });

    setNewName('');
    setNewEmail('');
    setNewRole('');
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const extracted = await parseMembersFromExcelFile(file, directory);
      if (extracted.length === 0) {
        setImportFeedback('No se encontraron nombres en las columnas "Asignado a" o "Nombre" del archivo.');
      } else {
        extracted.forEach(item => {
          onUpsertDirectoryMember({
            name: item.name,
            email: item.email,
            role: item.role
          });
        });
        setImportFeedback(`Se importaron/actualizaron ${extracted.length} miembros desde "${file.name}".`);
        setTimeout(() => setImportFeedback(null), 5000);
      }
    } catch (err) {
      console.error('Error importing members from Excel:', err);
      setImportFeedback('Error al leer el archivo Excel.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-emerald-500 dark:to-teal-600 flex items-center justify-center shadow-md text-white shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Lista de Miembros del Equipo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-emerald-950/50 text-blue-700 dark:text-emerald-300 border border-blue-200 dark:border-emerald-800">
                  {directory.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Da de alta miembros, edita su correo o área, o impórtalos desde la columna "Asignado a" de tu Excel (.xlsx)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-emerald-950/40 hover:bg-blue-100 dark:hover:bg-emerald-900/50 text-blue-700 dark:text-emerald-300 border border-blue-200 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
              title="Subir archivo Excel (.xlsx) para crear miembros desde la cuenta de asignación"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Subir XLSX Miembros</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {importFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{importFeedback}</span>
            </div>
          )}

          {/* Create / Register Member Form */}
          <form
            onSubmit={handleAdd}
            className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
          >
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-orange-500" />
              <span>Dar de Alta Nuevo Miembro:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                placeholder="Nombre *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Correo (opcional, se puede agregar después)"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                aria-label="Área o Rol"
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-white cursor-pointer"
              >
                {MEMBER_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="py-1.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Agregar Miembro</span>
              </button>
            </div>
          </form>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Área:
              </span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Todas ({directory.length})</option>
                <option value="__blank__">Sin área</option>
                {MEMBER_ROLE_OPTIONS.filter(o => o.value !== '').map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o área..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Members List Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="grid grid-cols-12 gap-2 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <div className="col-span-4">Nombre</div>
              <div className="col-span-4">Correo Electrónico</div>
              <div className="col-span-3">Área / Rol</div>
              <div className="col-span-1 text-right">Acción</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[46vh] overflow-y-auto">
              {filteredDirectory.map(member => (
                <div
                  key={member.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3.5 py-2.5 items-center hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name */}
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {member.name.substring(0, 2).toUpperCase()}
                    </div>
                    <input
                      type="text"
                      value={member.name}
                      onChange={e =>
                        onUpsertDirectoryMember({
                          id: member.id,
                          name: e.target.value,
                          email: member.email,
                          role: member.role,
                          defaultPhase: member.defaultPhase
                        })
                      }
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Email (editable - can be empty initially and added later) */}
                  <div className="sm:col-span-4 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      placeholder="Agregar correo..."
                      value={member.email || ''}
                      onChange={e =>
                        onUpsertDirectoryMember({
                          id: member.id,
                          name: member.name,
                          email: e.target.value,
                          role: member.role,
                          defaultPhase: member.defaultPhase
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Area / Role */}
                  <div className="sm:col-span-3">
                    <select
                      value={
                        MEMBER_ROLE_OPTIONS.some(o => o.value === member.role)
                          ? member.role
                          : member.role || ''
                      }
                      onChange={e =>
                        onUpsertDirectoryMember({
                          id: member.id,
                          name: member.name,
                          email: member.email,
                          role: e.target.value,
                          defaultPhase: member.defaultPhase
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      {MEMBER_ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      {member.role && !MEMBER_ROLE_OPTIONS.some(o => o.value === member.role) && (
                        <option value={member.role}>{member.role}</option>
                      )}
                    </select>
                  </div>

                  {/* Delete */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onDeleteDirectoryMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Eliminar miembro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredDirectory.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No se encontraron miembros con ese filtro.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Los cambios realizados en nombre, correo o área se guardan automáticamente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

import { X, Globe, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { generateId, emptyKeyValueRow } from "../utils";
import type { KeyValuePair } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  globals: Record<string, string>;
  onSave: (variables: Record<string, string>) => void;
};

export function GlobalVariablesModal({ isOpen, onClose, globals, onSave }: Props) {
  const [rows, setRows] = useState<KeyValuePair[]>([]);

  useEffect(() => {
    if (isOpen) {
      const initialRows = Object.entries(globals).map(([key, value]) => ({
        id: generateId(),
        key,
        value,
        enabled: true,
      }));
      setRows(initialRows.length > 0 ? [...initialRows, emptyKeyValueRow()] : [emptyKeyValueRow()]);
    }
  }, [isOpen, globals]);

  const handleUpdateRow = (id: string, updates: Partial<KeyValuePair>) => {
    const newRows = rows.map((r) => (r.id === id ? { ...r, ...updates } : r));
    
    // Add new empty row if last one is being edited
    const lastRow = newRows[newRows.length - 1];
    if (lastRow.id === id && (updates.key || updates.value)) {
      newRows.push(emptyKeyValueRow());
    }
    
    setRows(newRows);
  };

  const handleDeleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    } else {
      setRows([emptyKeyValueRow()]);
    }
  };

  const handleSave = () => {
    const variables: Record<string, string> = {};
    rows.forEach((row) => {
      if (row.key.trim()) {
        variables[row.key.trim()] = row.value;
      }
    });
    onSave(variables);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-surface border border-border shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-gray-100">Global Variables</h2>
              <p className="text-[11px] text-muted">Variables available across all collections and environments.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-md text-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 px-2 pb-2 text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border/50">
              <div className="w-8"></div>
              <div className="flex-1">Variable</div>
              <div className="flex-1">Value</div>
              <div className="w-8"></div>
            </div>
            {rows.map((row) => (
              <div key={row.id} className="flex items-center space-x-2 group">
                <div className="w-8 flex justify-center">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => handleUpdateRow(row.id, { enabled: e.target.checked })}
                    className="rounded border-border bg-background text-primary focus:ring-primary/20"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Variable"
                  value={row.key}
                  onChange={(e) => handleUpdateRow(row.id, { key: e.target.value })}
                  className="flex-1 bg-transparent px-2 py-1.5 text-[13px] font-mono text-gray-200 placeholder-muted/30 focus:outline-none focus:bg-white/5 rounded-md transition-colors"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={row.value}
                  onChange={(e) => handleUpdateRow(row.id, { value: e.target.value })}
                  className="flex-1 bg-transparent px-2 py-1.5 text-[13px] font-mono text-gray-200 placeholder-muted/30 focus:outline-none focus:bg-white/5 rounded-md transition-colors"
                />
                <button
                  onClick={() => handleDeleteRow(row.id)}
                  className="w-8 flex items-center justify-center text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface-hover/30 border-t border-border flex justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-[13px] font-bold text-gray-400 hover:text-gray-100 hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-[13px] font-bold flex items-center space-x-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
          >
            <Save size={16} />
            <span>Save Globals</span>
          </button>
        </div>
      </div>
    </div>
  );
}

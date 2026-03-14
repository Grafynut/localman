import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Globe, Layers, AlertCircle } from "lucide-react";
import type { Environment } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  onCreate: (name: string) => void;
  onUpdate: (id: string, name: string, variables: string) => void;
  onDelete: (id: string) => void;
};

export function EnvironmentManager({
  isOpen,
  onClose,
  environments,
  onCreate,
  onUpdate,
  onDelete
}: Props) {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingVariables, setEditingVariables] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (selectedEnvId) {
      const env = environments.find(e => e.id === selectedEnvId);
      if (env) {
        setEditingName(env.name);
        setEditingVariables(env.variables);
        setIsDirty(false);
      }
    } else {
      setEditingName("");
      setEditingVariables("");
      setIsDirty(false);
    }
  }, [selectedEnvId, environments]);

  if (!isOpen) return null;

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  const handleSave = () => {
    if (selectedEnvId && (editingName.trim())) {
      try {
        // Validate JSON
        JSON.parse(editingVariables);
        onUpdate(selectedEnvId, editingName.trim(), editingVariables);
        setIsDirty(false);
      } catch (e) {
        alert("Invalid JSON format in variables");
      }
    }
  };

  const handleCreate = () => {
    const name = "New Environment";
    onCreate(name);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => {
          if (isDirty) {
            if (confirm("Unsaved changes will be lost. Close anyway?")) onClose();
          } else onClose();
        }}
      />
      
      <div className="relative w-full max-w-4xl h-[600px] bg-surface border border-border rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-background/50 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-[13px] font-black uppercase tracking-widest text-white">Environments</h3>
            <button 
              onClick={handleCreate}
              className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-all active:scale-95"
              title="Create Global Environment"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            {environments.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Globe size={32} className="mx-auto text-muted/30 mb-2" />
                <p className="text-[11px] text-muted font-medium">No environments yet.</p>
              </div>
            ) : (
              environments.map(env => (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`px-4 py-3 cursor-pointer transition-all flex items-center space-x-3 ${
                    selectedEnvId === env.id 
                      ? "bg-primary/10 border-r-2 border-primary" 
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className={selectedEnvId === env.id ? "text-primary" : "text-muted"}>
                    {env.collection_id ? <Layers size={14} /> : <Globe size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-bold truncate ${selectedEnvId === env.id ? "text-white" : "text-gray-400"}`}>
                      {env.name}
                    </div>
                    {env.collection_id && (
                      <div className="text-[9px] font-bold text-muted uppercase">Local</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-surface/50">
            <div className="flex items-center space-x-3">
              <h2 className="text-[15px] font-bold text-white">
                {selectedEnv ? "Edit Environment" : "Environment Settings"}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-muted hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {!selectedEnv ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-surface-hover rounded-2xl flex items-center justify-center mb-4 border border-border">
                  <Activity size={32} className="text-muted" />
                </div>
                <h3 className="text-white font-bold mb-2">Select an environment</h3>
                <p className="text-[13px] text-muted leading-relaxed">
                  Choose an environment from the sidebar or create a new one to manage global and local variables.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted ml-1">Environment Name</label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => {
                      setEditingName(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. Production, Staging"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>

                <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted">Variables (JSON)</label>
                    <div className="flex items-center space-x-2 text-[10px] text-muted-foreground">
                      <AlertCircle size={10} />
                      <span>Use format: {"{\"key\": \"value\"}"}</span>
                    </div>
                  </div>
                  <textarea
                    value={editingVariables}
                    onChange={(e) => {
                      setEditingVariables(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder='{"apiUrl": "https://api.example.com"}'
                    className="w-full flex-1 bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-[13px] font-mono text-gray-300 focus:outline-none focus:border-primary/50 transition-all resize-none min-h-[300px]"
                  />
                </div>
              </div>
            )}
          </div>

          {selectedEnv && (
            <div className="p-4 border-t border-border bg-background/30 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm(`Delete "${selectedEnv.name}"?`)) {
                    onDelete(selectedEnv.id);
                    setSelectedEnvId(null);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 text-method-delete hover:bg-method-delete/10 rounded-lg transition-all text-[12px] font-bold"
              >
                <Trash2 size={16} />
                <span>Delete Environment</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedEnvId(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-all text-[12px] font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={!isDirty || !editingName.trim()}
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg shadow-primary/20 text-[12px] font-black uppercase tracking-wider"
                >
                  <Save size={16} />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Activity({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

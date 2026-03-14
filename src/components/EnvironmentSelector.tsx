import { useRef, useState, useEffect } from "react";
import { ChevronDown, Globe, Layers, Settings2 } from "lucide-react";
import type { Environment } from "../types";

type Props = {
  environments: Environment[];
  activeEnvId: string | null;
  onSetActiveEnv: (id: string | null) => void;
  onOpenManager: () => void;
};

export function EnvironmentSelector({ 
  environments, 
  activeEnvId, 
  onSetActiveEnv,
  onOpenManager
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeEnv = environments.find(e => e.id === activeEnvId);

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all cursor-pointer border group active:scale-[0.98] ${
          activeEnv 
            ? "bg-primary/5 border-primary/30 hover:border-primary/50" 
            : "bg-background/30 border-border hover:border-muted"
        }`}
      >
        {activeEnv ? (
          <Layers size={14} className="text-primary" />
        ) : (
          <Globe size={14} className="text-muted" />
        )}
        <div className={`text-[12px] font-bold truncate max-w-[120px] ${activeEnv ? "text-primary" : "text-muted"}`}>
          {activeEnv?.name || "No Environment"}
        </div>
        <ChevronDown 
          size={12} 
          className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        />
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-surface-hover border border-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-border bg-background/50">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Environments</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
            <div
              onClick={() => {
                onSetActiveEnv(null);
                setIsOpen(false);
              }}
              className={`px-3 py-2 text-[12px] font-semibold cursor-pointer transition-colors flex items-center space-x-2 ${
                !activeEnvId 
                  ? "bg-primary/20 text-primary border-r-2 border-primary" 
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Globe size={14} />
              <span>No Environment</span>
            </div>

            {environments.map((env) => (
              <div
                key={env.id}
                onClick={() => {
                  onSetActiveEnv(env.id);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-[12px] font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                  env.id === activeEnvId 
                    ? "bg-primary/20 text-primary border-r-2 border-primary" 
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Layers size={14} className={env.id === activeEnvId ? "text-primary" : "text-muted"} />
                  <span className="truncate">{env.name}</span>
                </div>
                {env.collection_id && (
                  <span className="text-[9px] font-bold text-muted bg-surface px-1.5 py-0.5 rounded border border-border">Local</span>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-1">
            <button
              onClick={() => {
                onOpenManager();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-white/5 text-gray-300 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all"
            >
              <Settings2 size={14} />
              <span>Manage Environments</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

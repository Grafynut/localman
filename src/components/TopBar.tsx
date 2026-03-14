import { useRef, useState, useEffect } from "react";
import { Activity, ChevronDown, Plus, Search, Settings, User, Users, Keyboard } from "lucide-react";
import type { Workspace, Environment } from "../types";
import { EnvironmentSelector } from "./EnvironmentSelector";

type Props = {
  peersCount: number;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  onCreateWorkspace: () => void;
  environments: Environment[];
  activeEnvId: string | null;
  onSetActiveEnv: (id: string | null) => void;
  onOpenEnvManager: () => void;
  onOpenShortcuts: () => void;
};

export function TopBar({ 
  peersCount, 
  workspaces, 
  activeWorkspaceId, 
  setActiveWorkspaceId,
  onCreateWorkspace,
  environments,
  activeEnvId,
  onSetActiveEnv,
  onOpenEnvManager,
  onOpenShortcuts
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 text-primary">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <span className="font-black text-[18px] tracking-tight text-white uppercase italic">DevCollab</span>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center bg-background/50 border border-border hover:border-primary/50 px-3 py-1.5 rounded-md transition-all cursor-pointer min-w-[180px] group active:scale-[0.98]"
          >
            <div className="flex-1 text-[13px] font-bold text-gray-200 truncate">
              {activeWorkspace?.name || "Select Workspace"}
            </div>
            <ChevronDown 
              size={14} 
              className={`text-muted transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} 
            />
          </div>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-surface-hover border border-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Filter workspaces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-md pl-8 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-primary/50 transition-all font-medium text-gray-200"
                  />
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto py-1 custom-scrollbar">
                {filteredWorkspaces.length > 0 ? (
                  filteredWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className={`px-3 py-2 text-[12px] font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                        ws.id === activeWorkspaceId 
                          ? "bg-primary/20 text-primary border-r-2 border-primary" 
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === activeWorkspaceId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-muted text-[11px] font-medium">
                    No workspaces found
                  </div>
                )}
              </div>
              <div className="border-t border-border p-1">
                <button
                  onClick={() => {
                    onCreateWorkspace();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-white/5 text-primary text-[11px] font-black uppercase tracking-wider transition-all"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>New Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onCreateWorkspace}
          className="p-1.5 hover:bg-surface-hover rounded-md border border-border hover:border-primary/50 text-muted hover:text-primary transition-all active:scale-95"
          title="Create New Workspace"
        >
          <Plus size={16} />
        </button>

        <div className="h-6 w-px bg-border/50 mx-2" />

        <EnvironmentSelector 
          environments={environments}
          activeEnvId={activeEnvId}
          onSetActiveEnv={onSetActiveEnv}
          onOpenManager={onOpenEnvManager}
        />
      </div>

      <div className="flex-1 max-w-2xl px-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search size={16} className="text-muted group-focus-within:text-primary transition-colors" />
          </div>
          <input
            id="global-search-input"
            type="text"
            placeholder="Search API resources, collections, environments..."
            className="w-full bg-background border border-border text-[13px] rounded-full pl-11 pr-16 py-2 text-gray-200 placeholder-muted/50 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-[10px] font-black font-mono text-muted/60 bg-surface/80 px-2 py-0.5 rounded border border-border">⌘ K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2 bg-method-get/10 border border-method-get/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-method-get shadow-[0_0_8px_rgba(12,187,82,0.4)] animate-pulse"></span>
          <span className="text-method-get font-black text-[11px] uppercase tracking-widest">Connect: Online</span>
        </div>

        <div className="flex items-center space-x-2 text-muted hover:text-gray-100 cursor-pointer transition-colors group">
          <Users size={18} className="group-hover:text-primary transition-colors" />
          <span className="text-[13px] font-bold">{peersCount}</span>
        </div>

        <div className="flex items-center space-x-2 text-muted hover:text-gray-100 cursor-pointer transition-colors group">
          <Activity size={18} className="group-hover:text-primary transition-colors" />
        </div>

        <div className="h-4 w-px bg-border"></div>

        <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center cursor-pointer hover:border-primary transition-all active:scale-90">
          <User size={16} className="text-gray-400" />
        </div>

        <div onClick={onOpenShortcuts} className="text-muted hover:text-primary cursor-pointer transition-all hover:scale-110 active:scale-90" title="Keyboard Shortcuts (?)">
          <Keyboard size={20} />
        </div>

        <div className="text-muted hover:text-primary cursor-pointer transition-all hover:rotate-45 active:scale-90">
          <Settings size={20} />
        </div>
      </div>
    </div>
  );
}

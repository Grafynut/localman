import { useRef, useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, Plus, Search, Settings, User, Users, Keyboard, PanelLeft, PanelRight, Globe, Monitor, Trash2 } from "lucide-react";
import type { Workspace, Environment } from "../types";
import { EnvironmentSelector } from "./EnvironmentSelector";

type Props = {
  peers: Record<string, string>;
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
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  isInspectorVisible: boolean;
  onToggleInspector: () => void;
  onOpenGlobals: () => void;
  onShareWorkspace: (id: string) => void;
  localIdentity: { instance_name: string; ip_address: string } | null;
  onOpenSettings: () => void;
};

export function TopBar({
  peers,
  peersCount,
  workspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  onCreateWorkspace,
  environments,
  activeEnvId,
  onSetActiveEnv,
  onOpenEnvManager,
  onOpenShortcuts,
  isSidebarVisible,
  onToggleSidebar,
  isInspectorVisible,
  onToggleInspector,
  onOpenGlobals,
  onShareWorkspace,
  localIdentity,
  onOpenSettings
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPeersOpen, setIsPeersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [manualIp, setManualIp] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const peersRef = useRef<HTMLDivElement | null>(null);

  const handleManualAdd = async () => {
    if (!manualIp.trim()) return;
    try {
      await invoke("add_manual_peer", { ip: manualIp.trim() });
      setManualIp("");
    } catch (error) {
      console.error("Failed to add manual peer:", error);
    }
  };

  const handleRemovePeer = async (name: string) => {
    try {
      await invoke("remove_peer", { name });
    } catch (err) {
      console.error("Failed to remove peer:", err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (peersRef.current && !peersRef.current.contains(event.target as Node)) {
        setIsPeersOpen(false);
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
    <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 z-20">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-md transition-all active:scale-95 ${isSidebarVisible ? "text-primary bg-primary/10 border border-primary/20" : "text-muted hover:text-gray-200 border border-transparent hover:border-border"}`}
          title="Toggle Sidebar (Ctrl+[)"
        >
          <PanelLeft size={18} />
        </button>

        <div className="flex items-center space-x-2 text-primary">
          <div className="w-6 h-6 flex items-center justify-center">
            <img src={logo} alt="Localman Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-2 py-1.5 flex items-center space-x-2 text-sm font-medium hover:bg-white/5 rounded-md transition-colors border border-transparent hover:border-white/10"
            >
              <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary">
                <Globe size={12} />
              </div>
              <span className="max-w-[120px] truncate">{activeWorkspace?.name || "Loading..."}</span>
              <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <button
              onClick={() => onShareWorkspace(activeWorkspaceId)}
              className="ml-1 p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition-all active:scale-90"
              title="Share Workspace to all Peers"
            >
              <Users size={16} />
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-surface-hover border border-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl z-50">
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
                      className={`px-3 py-2 text-[12px] font-semibold cursor-pointer transition-colors flex items-center justify-between ${ws.id === activeWorkspaceId
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


        <div className="h-5 w-px bg-border/50 mx-1" />

        <EnvironmentSelector
          environments={environments}
          activeEnvId={activeEnvId}
          onSetActiveEnv={onSetActiveEnv}
          onOpenManager={onOpenEnvManager}
        />
      </div>

      <div className="flex-1 max-w-md px-4 md:px-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search size={14} className="text-muted group-focus-within:text-primary transition-colors" />
          </div>
          <input
            id="global-search-input"
            type="text"
            placeholder="Search API..."
            className="w-full bg-surface/50 border border-border text-[12px] rounded-full pl-10 pr-16 py-1.5 text-gray-200 placeholder-muted/40 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
          />
          <div className="absolute inset-y-0 right-0 hidden md:flex items-center pr-3 pointer-events-none">
            <span className="text-[9px] font-black font-mono text-muted/40 bg-surface/80 px-1.5 py-0.5 rounded border border-border/50">⌘ K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-sm">
        <div className="relative" ref={peersRef}>
          <div
            onClick={() => setIsPeersOpen(!isPeersOpen)}
            className="flex items-center space-x-2 text-muted hover:text-gray-100 cursor-pointer transition-colors group px-2 py-1.5 rounded-md hover:bg-surface-hover border border-transparent hover:border-border/50"
            title="Online Peers"
          >
            <div className="relative">
              <Users size={18} className={`${peersCount > 0 ? "text-primary" : "text-muted"} group-hover:text-primary transition-colors`} />
              <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-surface bg-method-get shadow-[0_0_8px_rgba(12,187,82,0.4)] animate-pulse`}></div>
            </div>
            <span className="text-[13px] font-bold">{peersCount}</span>
          </div>

          {isPeersOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-border bg-surface-hover/30">
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Discovered Devices</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto py-1 custom-scrollbar">
                {localIdentity && (
                  <div className="px-3 py-2 bg-primary/5 border-b border-border/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
                        <User size={12} className="text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-black text-primary truncate">THIS DEVICE</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-200 truncate">{localIdentity.instance_name.split(".")[0]}</span>
                        <span className="text-[9px] font-mono text-primary/80">{localIdentity.ip_address}</span>
                      </div>
                    </div>
                  </div>
                )}

                {peersCount > 0 ? (
                  Object.entries(peers).map(([name, ip]) => (
                    <div key={name} className="px-3 py-2 hover:bg-white/5 transition-colors group/peer">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Monitor size={12} className="text-primary" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] font-bold text-gray-200 truncate">{name.split(".")[0]}</span>
                          <span className="text-[9px] font-mono text-muted">{ip}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePeer(name);
                          }}
                          className="opacity-0 group-hover/peer:opacity-100 p-1 text-muted hover:text-red-400 transition-all active:scale-95"
                          title="Remove Collaborator"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-muted text-[11px] font-medium italic">
                    Scanning for Localman instances...
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-border bg-surface-hover/20">
                <p className="text-[9px] text-muted text-center leading-relaxed">
                  Devices running Localman on your network will appear here automatically.
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="text"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                    placeholder="Add by IP (e.g. 192.168.1.10)"
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-gray-200 placeholder:text-muted/40 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleManualAdd}
                    className="p-1 hover:bg-primary/20 text-primary rounded transition-colors"
                    title="Add Peer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group/user overflow-hidden">
          <User size={16} className="text-muted group-hover/user:text-primary transition-colors" />
        </div>

        <div className="flex items-center space-x-1.5 bg-surface-hover/30 p-1 rounded-lg border border-border/50">
          <div onClick={onOpenShortcuts} className="p-1.5 text-muted hover:text-primary cursor-pointer transition-all hover:scale-105 active:scale-95" title="Keyboard Shortcuts (?)">
            <Keyboard size={18} />
          </div>

          <div onClick={onOpenGlobals} className="p-1.5 text-muted hover:text-primary cursor-pointer transition-all hover:scale-105 active:scale-95" title="Global Variables">
            <Globe size={18} />
          </div>

          <div 
            onClick={onOpenSettings}
            className="p-1.5 text-muted hover:text-primary cursor-pointer transition-all hover:rotate-45 active:scale-95" 
            title="Settings"
          >
            <Settings size={18} />
          </div>
        </div>

        <button
          onClick={onToggleInspector}
          className={`p-1.5 rounded-md transition-all active:scale-95 ${isInspectorVisible ? "text-primary bg-primary/10 border border-primary/20" : "text-muted hover:text-gray-200 border border-transparent hover:border-border"}`}
          title="Toggle Inspector (Ctrl+])"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </div>
  );
}

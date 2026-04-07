import { useRef, useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, Plus, Search, Settings, User, Users, Keyboard, PanelLeft, PanelRight, Globe, Monitor, Trash2, Code } from "lucide-react";
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
  onOpenSearch: () => void;
  onOpenCode: () => void;
  onOpenCookies: () => void;
  hasActiveTab: boolean;
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
  onOpenSettings,
  onOpenSearch,
  onOpenCode,
  onOpenCookies,
  hasActiveTab
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
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <img src={logo} alt="Localman Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[14px] font-black tracking-tighter text-gray-100 select-none hidden sm:inline">LOCALMAN</span>
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
            <Search size={14} className="text-gray-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            id="global-search-input"
            type="text"
            placeholder="Search API..."
            readOnly
            onClick={onOpenSearch}
            className="w-full bg-surface/50 border border-border text-[12px] rounded-full pl-10 pr-16 py-1.5 text-gray-200 placeholder-muted/40 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-medium cursor-pointer"
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
            className="flex items-center space-x-2 text-muted hover:text-gray-100 cursor-pointer transition-colors group px-2.5 py-1.5 rounded-full hover:bg-primary/10 border border-transparent hover:border-primary/20 bg-surface-hover/30"
            title="Collaboration & Network Center"
          >
            <div className="relative">
              <Users size={18} className={`${peersCount > 0 ? "text-primary filter drop-shadow-[0_0_4px_rgba(var(--primary-rgb),0.5)]" : "text-muted"} group-hover:text-primary transition-all duration-300`} />
              {peersCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)] animate-pulse" />
              )}
            </div>
            <span className="text-[13px] font-black tracking-tight">{peersCount}</span>
          </div>

          {isPeersOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl">
              <div className="px-4 py-3 border-b border-border bg-surface-hover/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe size={14} className="text-primary" />
                  <span className="text-[11px] font-black text-gray-100 uppercase tracking-[0.15em]">Collaboration Center</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary animate-pulse">DISCOVERY ACTIVE</div>
              </div>
              
              <div className="max-h-[320px] overflow-y-auto py-2 custom-scrollbar space-y-1">
                {localIdentity && (
                  <div className="px-3 mx-2 mb-2 p-3 rounded-xl bg-primary/5 border border-primary/10 group/local">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-inner group-hover/local:scale-105 transition-transform">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">My Identity</span>
                          <div className="flex items-center space-x-1">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <span className="text-[9px] font-bold text-primary">LIVE</span>
                          </div>
                        </div>
                        <span className="text-[13px] font-bold text-gray-100 truncate">{localIdentity.instance_name.split("-")[0]}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                           <span className="text-[10px] font-mono text-muted bg-background/50 px-1.5 rounded-md border border-border/50">{localIdentity.ip_address}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4 py-1">
                   <h4 className="text-[10px] font-black text-muted/60 uppercase tracking-widest mb-2">Remote Peers</h4>
                   {peersCount > 0 ? (
                     <div className="space-y-1">
                       {Object.entries(peers).map(([name, ip]) => (
                         <div key={name} className="p-2 hover:bg-white/5 rounded-xl transition-all group/peer relative border border-transparent hover:border-border/50">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center border border-border group-hover/peer:border-primary/30 group-hover/peer:bg-primary/5 transition-all">
                               <Monitor size={14} className="text-muted group-hover/peer:text-primary transition-colors" />
                             </div>
                             <div className="flex flex-col min-w-0 flex-1">
                               <span className="text-[12px] font-bold text-gray-200 truncate group-hover/peer:text-gray-100">{name.split("-")[0]}</span>
                               <span className="text-[10px] font-mono text-muted/70">{ip}</span>
                             </div>
                             <div className="flex items-center space-x-1">
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleRemovePeer(name);
                                 }}
                                 className="opacity-0 group-hover/peer:opacity-100 p-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all active:scale-95"
                                 title="Disconnect"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="py-8 px-4 text-center space-y-3">
                       <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-dashed border-border">
                          <Users size={20} className="text-muted/40" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-[11px] font-bold text-muted">No peers found yet</p>
                         <p className="text-[9px] text-muted/50 max-w-[160px] mx-auto">
                           Automatic discovery is active. Ensure peers are on the same WiFi.
                         </p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="p-4 border-t border-border bg-surface-hover/20">
                <div className="flex items-center justify-between mb-3 px-1">
                   <span className="text-[10px] font-black text-muted uppercase tracking-widest">Manual Connection</span>
                   <Plus size={12} className="text-muted" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 group/input">
                    <input
                      type="text"
                      value={manualIp}
                      onChange={(e) => setManualIp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                      placeholder="Enter target IP address..."
                      className="w-full bg-background/50 border border-border rounded-xl px-3 py-2 text-[11px] text-gray-200 placeholder:text-muted/40 focus:outline-none focus:border-primary/50 focus:bg-background transition-all font-medium"
                    />
                  </div>
                  <button
                    onClick={handleManualAdd}
                    className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all border border-primary/20 active:scale-95"
                    title="Connect to Peer"
                  >
                    <Plus size={18} strokeWidth={3} />
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
          <div onClick={onOpenShortcuts} className="p-1.5 text-gray-400 hover:text-primary cursor-pointer transition-all hover:scale-105 active:scale-95" title="Keyboard Shortcuts (?)">
            <Keyboard size={18} />
          </div>

          <div onClick={onOpenGlobals} className="p-1.5 text-gray-400 hover:text-primary cursor-pointer transition-all hover:scale-105 active:scale-95" title="Global Variables">
            <Globe size={18} />
          </div>

          <div 
            onClick={onOpenSettings}
            className="p-1.5 text-gray-400 hover:text-primary cursor-pointer transition-all hover:rotate-45 active:scale-95" 
            title="Settings"
          >
            <Settings size={18} />
          </div>

          <div 
            onClick={onOpenCookies}
            className="p-1.5 text-gray-400 hover:text-primary cursor-pointer transition-all hover:scale-110 active:scale-95" 
            title="Manage Cookies"
          >
            <Globe size={18} className="text-blue-400/60 group-hover:text-blue-400" />
          </div>
        </div>

        <button
          onClick={onOpenCode}
          disabled={!hasActiveTab}
          className={`p-1.5 rounded-md transition-all active:scale-95 text-gray-400 hover:text-primary border border-transparent hover:border-border disabled:opacity-20`}
          title="Generate Code Snippet"
        >
          <Code size={18} />
        </button>

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

import { useEffect, useRef, useState } from "react";
import { Activity, ChevronDown, Search, Settings, User, Users } from "lucide-react";

type Props = {
  peersCount: number;
  workspaceOptions: string[];
};

export function TopBar({ peersCount, workspaceOptions }: Props) {
  const [workspace, setWorkspace] = useState(workspaceOptions[0] || "Workspace");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (workspaceOptions.length === 0) {
      setWorkspace("Workspace");
      return;
    }
    if (!workspaceOptions.includes(workspace)) {
      setWorkspace(workspaceOptions[0]);
    }
  }, [workspaceOptions, workspace]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setWorkspaceOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-primary">
          <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-wide text-white">DevCollab</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              if (workspaceOptions.length > 1) {
                setWorkspaceOpen((prev) => !prev);
              }
            }}
            className="flex items-center space-x-1 hover:bg-white/5 px-2 py-1 rounded ml-4 text-sm"
          >
            <span className="text-gray-300">{workspace}</span>
            <ChevronDown size={14} className={`text-muted transition-transform ${workspaceOpen ? "rotate-180" : ""}`} />
          </button>
          {workspaceOpen && workspaceOptions.length > 1 && (
            <div className="absolute left-0 top-9 min-w-[170px] rounded-md border border-border bg-surface shadow-lg z-30">
              {workspaceOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setWorkspace(item);
                    setWorkspaceOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-white/5 ${item === workspace ? "text-primary" : "text-gray-300"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-xl px-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={14} className="text-muted group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search Bar"
            className="w-full bg-[#121212]/50 border border-border/80 text-sm rounded-md pl-9 pr-14 py-1.5 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:bg-[#121212] focus:ring-1 focus:ring-primary/50 transition-all font-medium"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <span className="text-[10px] font-mono font-medium text-gray-500/80 border border-border bg-surface/50 px-1.5 py-0.5 rounded">Ctrl+K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-5 text-sm">
        <div className="flex items-center space-x-2 bg-green-900/10 border border-green-800/30 px-2.5 py-1 rounded-md">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          <span className="text-green-500 font-medium text-[13px]">LAN Mode Active</span>
        </div>

        <div className="flex items-center space-x-1.5 text-muted hover:text-gray-200 cursor-pointer">
          <Users size={15} />
          <span className="text-[13px] font-medium">{peersCount} Peers</span>
        </div>

        <div className="flex items-center space-x-1.5 text-muted hover:text-gray-200 cursor-pointer">
          <Activity size={15} />
          <span className="text-[13px] font-medium">Synced</span>
        </div>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 cursor-pointer hover:border-primary/60 transition-colors">
          <User size={14} className="text-primary" />
        </div>

        <div className="text-muted hover:text-gray-200 cursor-pointer">
          <Settings size={16} />
        </div>
      </div>
    </div>
  );
}

import { ChevronDown, Monitor, MoreHorizontal } from "lucide-react";
import { useState } from "react";

type Props = {
  peers: Record<string, string>;
  activeCollectionName: string;
  activeRequestsCount: number;
  connectedPeerIps: Record<string, boolean>;
  sharingPeerIp: string | null;
  onTogglePeerConnection: (peerIp: string) => void;
  onSharePeer: (peerName: string, peerIp: string) => void;
  onHide?: () => void;
};

export function RightInspector({
  peers,
  activeCollectionName,
  activeRequestsCount,
  connectedPeerIps,
  sharingPeerIp,
  onTogglePeerConnection,
  onSharePeer,
  onHide,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(true);
  const [collabOpen, setCollabOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(true);
  const peerMembers = Object.entries(peers).map(([name, ip]) => ({
    id: name,
    name: name.split(".")[0],
    role: "Collaborator",
    initials: name.slice(0, 2).toUpperCase(),
    detail: ip,
  }));

  return (
    <div className="w-[260px] bg-surface flex flex-col border-l border-border shrink-0 z-10 selection:bg-primary/20">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-border bg-surface/30">
          <button onClick={() => setInfoOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-3 group">
            <div className="flex items-center space-x-2">
               {onHide && (
                 <button 
                  onClick={(e) => { e.stopPropagation(); onHide(); }}
                  className="p-1 hover:bg-surface-hover rounded text-muted hover:text-primary transition-colors"
                  title="Hide Inspector (Ctrl+])"
                 >
                   <ChevronDown size={14} className="-rotate-90" />
                 </button>
               )}
               <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest group-hover:text-gray-200 transition-colors">Collection Info</h3>
            </div>
            <ChevronDown size={14} className={`text-muted transition-transform ${infoOpen ? "" : "-rotate-90"}`} />
          </button>
          {infoOpen && (
            <div className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">Author</span>
                <span className="text-gray-200 font-bold">You</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">Active</span>
                <span className="text-gray-200 font-bold truncate max-w-[150px]">{activeCollectionName || "None"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted font-medium">Resources</span>
                <span className="text-primary font-bold">{activeRequestsCount}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-border bg-surface/10">
          <button onClick={() => setCollabOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-3 group">
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest group-hover:text-gray-200 transition-colors">Collaboration</h3>
            <ChevronDown size={14} className={`text-muted transition-transform ${collabOpen ? "" : "-rotate-90"}`} />
          </button>

          {collabOpen && (
            <>
              <div className="flex items-center justify-between mb-3 text-[11px] text-muted font-bold uppercase tracking-widest">
                <span>LAN Devices</span>
                <Monitor size={12} className="opacity-50" />
              </div>

              <div className="space-y-3">
                {Object.keys(peers).length === 0 ? (
                  <div className="px-3 py-6 text-center text-[12px] text-muted font-medium border border-dashed border-border rounded-lg bg-background/50">
                    Scanning for peers...
                  </div>
                ) : (
                  Object.entries(peers).map(([name, ip]) => (
                    <div key={name} className="p-2 bg-background border border-border rounded-xl group transition-all hover:border-primary/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-lg bg-surface-hover flex items-center justify-center border border-border group-hover:border-primary/20 transition-colors">
                            <Monitor size={14} className="text-muted group-hover:text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] text-gray-100 font-bold truncate" title={ip}>{name.split(".")[0]}</span>
                            <span className="text-[10px] text-primary/70 font-black font-mono tracking-wider">{ip}</span>
                          </div>
                        </div>
                        <MoreHorizontal size={14} className="text-muted cursor-pointer hover:text-white" />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onTogglePeerConnection(ip)}
                          className={`flex-1 py-1.5 border text-[11px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${
                            connectedPeerIps[ip]
                              ? "bg-method-get/10 border-method-get/20 text-method-get"
                              : "bg-surface-hover border-border hover:border-muted text-gray-400"
                          }`}
                        >
                          {connectedPeerIps[ip] ? "Online" : "Connect"}
                        </button>
                        <button
                          onClick={() => onSharePeer(name, ip)}
                          disabled={sharingPeerIp === ip}
                          className="flex-1 flex items-center justify-center bg-primary text-white border border-primary/20 hover:bg-primary-hover py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-lg shadow-primary/5 disabled:opacity-30"
                        >
                          {sharingPeerIp === ip ? "Synced" : "Share"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4">
          <button onClick={() => setTeamOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-3 group">
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-widest group-hover:text-gray-200 transition-colors">Team Members</h3>
            <ChevronDown size={14} className={`text-muted transition-transform ${teamOpen ? "" : "-rotate-90"}`} />
          </button>
          {teamOpen && (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-[13px] group">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-black text-[9px] shadow-lg shadow-primary/5">YOU</div>
                  <span className="text-gray-200 font-bold">You</span>
                </div>
                <span className="text-muted text-[11px] font-bold uppercase tracking-wider">Owner</span>
              </div>
              {peerMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-[13px] group">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-method-put/10 border border-method-put/30 text-method-put flex items-center justify-center font-black text-[10px]">{member.initials}</div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-gray-200 font-bold truncate max-w-[120px]">{member.name}</span>
                      <span className="text-[10px] text-muted font-black font-mono tracking-wider">{member.detail}</span>
                    </div>
                  </div>
                  <span className="text-muted text-[11px] font-medium italic">{member.role}</span>
                </div>
              ))}
              {peerMembers.length === 0 && (
                <div className="text-[12px] text-muted font-medium border border-dashed border-border rounded-lg px-4 py-3 bg-background/30 italic">
                  No collaborators yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
};

export function RightInspector({
  peers,
  activeCollectionName,
  activeRequestsCount,
  connectedPeerIps,
  sharingPeerIp,
  onTogglePeerConnection,
  onSharePeer,
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
    <div className="w-[300px] bg-surface flex flex-col border-l border-border shrink-0 z-10">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 border-b border-border">
          <button onClick={() => setInfoOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-gray-200 tracking-wide">Collection Info</h3>
            <ChevronDown size={14} className={`text-muted transition-transform ${infoOpen ? "" : "-rotate-90"}`} />
          </button>
          {infoOpen && (
            <div className="space-y-3 text-[13px]">
              <div className="text-muted">Metadata</div>
              <div className="text-muted">Created by: <span className="text-gray-200">you</span></div>
              <div className="text-muted">Collection: <span className="text-gray-200">{activeCollectionName || "None"}</span></div>
              <div className="text-muted">Requests: <span className="text-gray-200">{activeRequestsCount}</span></div>
            </div>
          )}
        </div>

        <div className="p-5 border-b border-border">
          <button onClick={() => setCollabOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-gray-200 tracking-wide">Collaboration</h3>
            <ChevronDown size={14} className={`text-muted transition-transform ${collabOpen ? "" : "-rotate-90"}`} />
          </button>

          {collabOpen && (
            <>
              <div className="flex items-center justify-between mb-3 text-[12px] text-muted font-medium">
                <span>Available Devices</span>
                <Monitor size={14} />
              </div>

              <div className="space-y-3">
                {Object.keys(peers).length === 0 ? (
                  <div className="px-2 py-4 text-center text-[12px] text-muted italic border border-dashed border-border rounded">
                    No LAN devices discovered
                  </div>
                ) : (
                  Object.entries(peers).map(([name, ip]) => (
                    <div key={name} className="space-y-2 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Monitor size={18} className="text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-[13px] text-gray-200 font-medium" title={ip}>{name.split(".")[0]}</span>
                            <span className="text-[10px] text-blue-400 font-mono tracking-wider">{ip}</span>
                          </div>
                        </div>
                        <MoreHorizontal size={14} className="text-muted cursor-pointer hover:text-white" />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onTogglePeerConnection(ip)}
                          className={`flex-1 py-1 border text-[11px] font-medium rounded transition-colors block text-center ${
                            connectedPeerIps[ip]
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-background border-border hover:border-gray-500 text-gray-300"
                          }`}
                        >
                          {connectedPeerIps[ip] ? "Connected" : "Connect"}
                        </button>
                        <button
                          onClick={() => onSharePeer(name, ip)}
                          disabled={sharingPeerIp === ip}
                          className="flex-1 flex items-center justify-center bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 py-1 text-[11px] font-medium rounded transition-colors disabled:opacity-60"
                        >
                          {sharingPeerIp === ip ? "Sharing..." : "Share"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-5">
          <button onClick={() => setTeamOpen((prev) => !prev)} className="w-full flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-gray-200 tracking-wide">Team Members</h3>
            <ChevronDown size={14} className={`text-muted transition-transform ${teamOpen ? "" : "-rotate-90"}`} />
          </button>
          {teamOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500 text-blue-500 flex items-center justify-center font-bold text-[10px]">YO</div>
                  <span className="text-gray-300">You</span>
                </div>
                <span className="text-muted">Owner</span>
              </div>
              {peerMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500 text-purple-500 flex items-center justify-center font-bold text-[10px]">{member.initials}</div>
                    <div className="flex flex-col">
                      <span className="text-gray-300">{member.name}</span>
                      <span className="text-[10px] text-blue-400 font-mono">{member.detail}</span>
                    </div>
                  </div>
                  <span className="text-muted">{member.role}</span>
                </div>
              ))}
              {peerMembers.length === 0 && (
                <div className="text-[12px] text-muted italic border border-dashed border-border rounded px-3 py-2">
                  No collaborators connected yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

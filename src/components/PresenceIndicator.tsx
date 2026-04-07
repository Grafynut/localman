import { User } from "lucide-react";

interface PresenceIndicatorProps {
  peers: string[]; // List of peer names at this location
  size?: number;
}

export function PresenceIndicator({ peers, size = 16 }: PresenceIndicatorProps) {
  if (peers.length === 0) return null;

  return (
    <div className="flex -space-x-1.5 items-center">
      {peers.map((peer, idx) => (
        <div 
          key={idx}
          className="relative group/avatar"
          title={peer.split("-")[0]}
        >
          <div 
            className="w-5 h-5 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center text-primary shadow-lg overflow-hidden group-hover/avatar:scale-110 transition-transform cursor-help"
            style={{ width: size, height: size }}
          >
            <User size={size - 6} strokeWidth={3} />
          </div>
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-primary border border-surface" />
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-50">
             <div className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap border border-white/10">
                {peer.split("-")[0]} is viewing
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}

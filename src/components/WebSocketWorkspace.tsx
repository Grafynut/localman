import { Play, Square, Send, Search, Filter, Trash2, Clock, ArrowDownLeft, ArrowUpRight, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { KeyValueEditor } from "./KeyValueEditor";
import type { KeyValuePair, WsMessage, Environment } from "../types";

type Props = {
  url: string;
  onUrlChange: (url: string) => void;
  headers: KeyValuePair[];
  setHeaders: Dispatch<SetStateAction<KeyValuePair[]>>;
  environments: Environment[];
  activeEnvId: string | null;
  status: "disconnected" | "connecting" | "connected" | "error";
  messages: WsMessage[];
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (content: string) => void;
  onClearMessages: () => void;
};

export function WebSocketWorkspace({
  url,
  onUrlChange,
  headers,
  setHeaders,
  environments,
  activeEnvId,
  status,
  messages,
  onConnect,
  onDisconnect,
  onSendMessage,
  onClearMessages,
}: Props) {
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && status === "connected") {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const filteredMessages = messages.filter((m) =>
    m.content.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden animate-in fade-in duration-300">
      {/* URL & Connection Bar */}
      <div className="p-4 border-b border-border flex items-center space-x-3 bg-surface/30 shrink-0">
        <div className="flex-1 flex items-center bg-surface-hover/50 rounded-lg border border-border/50 focus-within:border-primary/50 transition-all px-3 py-1.5 shadow-inner">
          <div className="text-[12px] font-black text-primary uppercase tracking-tighter mr-3 select-none italic">WS</div>
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="wss://echo.websocket.org"
            className="flex-1 bg-transparent text-[13px] font-mono text-gray-200 focus:outline-none"
          />
        </div>
        {status === "connected" ? (
          <button
            onClick={onDisconnect}
            className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[13px] font-bold flex items-center space-x-2 border border-red-500/20 transition-all active:scale-95 shadow-lg shadow-red-500/5 group"
          >
            <Square size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Disconnect</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={status === "connecting"}
            className="px-6 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold flex items-center space-x-2 shadow-lg shadow-primary/20 transition-all active:scale-95 active:shadow-none"
          >
            <Play size={16} fill="currentColor" />
            <span>{status === "connecting" ? "Connecting..." : "Connect"}</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Side: Handshake Headers */}
        <div className="w-[320px] border-r border-border p-4 overflow-y-auto custom-scrollbar bg-surface/10">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={14} className="text-muted" />
            <span className="text-[11px] font-black uppercase tracking-widest text-muted">Handshake Headers</span>
          </div>
          <KeyValueEditor items={headers} setItems={setHeaders} environments={environments} activeEnvId={activeEnvId} />
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h4 className="text-[12px] font-bold text-primary mb-2 flex items-center">
              <MessageSquare size={14} className="mr-2" />
              WS Connection Tips
            </h4>
            <ul className="text-[11px] text-muted space-y-2 leading-relaxed italic">
              <li>• Use <code className="text-primary/70">wss://</code> for secure connections.</li>
              <li>• Custom headers are sent only during the initial HTTP upgrade handshake.</li>
              <li>• Real-time messages do not have individual headers.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Message Log */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface/5">
          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-surface-hover/20 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center bg-background/50 rounded-md border border-border/50 px-2 py-1 w-64 focus-within:border-primary/30 transition-colors">
              <Search size={14} className="text-muted mr-2" />
              <input
                type="text"
                placeholder="Filter messages..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent text-[12px] text-gray-200 focus:outline-none w-full"
              />
            </div>
            <button
              onClick={onClearMessages}
              className="p-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all active:scale-90"
              title="Clear Log"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Log */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-[12px]"
          >
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted space-y-4 opacity-50 select-none">
                <div className="p-6 rounded-full bg-surface-hover border border-border border-dashed animate-pulse">
                  <Clock size={32} />
                </div>
                <p className="font-medium text-[13px]">Waiting for messages...</p>
              </div>
            ) : (
              filteredMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start space-x-3 animate-in slide-in-from-bottom-2 duration-300 ${
                    m.is_sent ? "opacity-90" : ""
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 p-1 rounded-md ${
                    m.is_sent ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"
                  }`}>
                    {m.is_sent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-0.5 opacity-60">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        m.is_sent ? "text-primary" : "text-green-500"
                      }`}>
                        {m.is_sent ? "Sent" : "Received"}
                      </span>
                      <span className="text-[10px] tabular-nums">{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="p-2.5 bg-surface-hover/50 rounded-lg border border-border/30 hover:border-primary/20 transition-colors break-all whitespace-pre-wrap leading-relaxed shadow-sm">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-surface/30 backdrop-blur-md">
            <div className="relative flex items-end space-x-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status !== "connected"}
                placeholder={status === "connected" ? "Write a message..." : "Connect to start messaging"}
                className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-3 text-[13px] font-mono text-gray-200 focus:outline-none focus:border-primary/50 transition-all resize-none min-h-[44px] max-h-48 shadow-inner disabled:opacity-50"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={status !== "connected" || !message.trim()}
                className="p-3 bg-primary hover:bg-primary-hover disabled:bg-muted/20 disabled:text-muted rounded-xl text-white transition-all active:scale-90 shadow-lg shadow-primary/20 disabled:shadow-none shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  ChevronDown,
  Folder,
  MoreHorizontal,
  Play,
  Plus,
  Save,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { KeyValueEditor } from "./KeyValueEditor";
import { methodColor } from "../utils";
import { VariableInput } from "./VariableInput";
import type { KeyValuePair, WorkspaceTab, Environment } from "../types";

type Props = {
  activeCollectionName: string;
  activeRequestName: string;
  isDirty: boolean;
  isCreatingRequest: boolean;
  isSavingRequest: boolean;
  onCreateRequest: () => void;
  onSaveRequest: () => void;
  reqMethod: string;
  setReqMethod: Dispatch<SetStateAction<string>>;
  reqUrl: string;
  setReqUrl: Dispatch<SetStateAction<string>>;
  reqBody: string;
  setReqBody: Dispatch<SetStateAction<string>>;
  reqParams: KeyValuePair[];
  setReqParams: Dispatch<SetStateAction<KeyValuePair[]>>;
  reqHeaders: KeyValuePair[];
  setReqHeaders: Dispatch<SetStateAction<KeyValuePair[]>>;
  activeWorkspaceTab: WorkspaceTab;
  setActiveWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  isSending: boolean;
  onSendRequest: () => void;
  environments: Environment[];
  activeEnvId: string | null;
};

export function RequestWorkspace({
  activeCollectionName,
  activeRequestName,
  isDirty,
  isCreatingRequest,
  isSavingRequest,
  onCreateRequest,
  onSaveRequest,
  reqMethod,
  setReqMethod,
  reqUrl,
  setReqUrl,
  reqBody,
  setReqBody,
  reqParams,
  setReqParams,
  reqHeaders,
  setReqHeaders,
  activeWorkspaceTab,
  setActiveWorkspaceTab,
  isSending,
  onSendRequest,
  environments,
  activeEnvId,
}: Props) {
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMethodOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background relative selection:bg-primary/30">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2 text-[12px] text-muted font-bold uppercase tracking-widest">
            <Folder size={14} className="text-primary" />
            <span>{activeCollectionName || "No collection selected"}</span>
          </div>
          <div className="flex items-center space-x-2 text-[18px] font-bold text-gray-100">
            <span>{activeRequestName || "Select a request"}</span>
            {isDirty && (
              <div className="w-2 h-2 rounded-full bg-primary mt-1 shadow-[0_0_8px_rgba(255,106,19,0.5)]" title="Unsaved changes"></div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onSaveRequest}
            disabled={isSavingRequest || (!isDirty && activeRequestName !== "")}
            title="Save Request (Ctrl+S)"
            className={`h-9 px-4 rounded border font-semibold text-[13px] flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-30 ${isDirty
                ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                : "bg-transparent border-border hover:bg-surface-hover text-gray-400"
              }`}
          >
            <Save size={14} strokeWidth={2.5} />
            <span>{isSavingRequest ? "Saving..." : "Save"}</span>
          </button>
          <button
            onClick={onCreateRequest}
            className="h-9 px-4 rounded bg-primary text-white hover:bg-primary-hover font-bold text-[13px] flex items-center space-x-2 transition-all shadow-lg shadow-primary/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-background border-b border-border shrink-0">
        <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden group focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
          <div className="relative shrink-0 flex items-center border-r border-border bg-surface-hover/30" ref={dropdownRef}>
            <button
              onClick={() => setIsMethodOpen(!isMethodOpen)}
              className={`flex items-center space-x-2 h-10 px-6 font-black text-[13px] tracking-wide transition-all hover:bg-surface-hover/50 ${methodColor(reqMethod)}`}
            >
              <span>{reqMethod}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isMethodOpen ? "rotate-180" : ""}`}
                strokeWidth={3}
              />
            </button>

            {isMethodOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-40 bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-[100] animate-in fade-in zoom-in duration-200 origin-top-left">
                <div className="px-3 py-1 mb-1 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-white/5">
                  HTTP Method
                </div>
                {METHODS.map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setReqMethod(method);
                      setIsMethodOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-2 text-[13px] font-bold transition-all hover:bg-white/5
                      ${reqMethod === method ? "bg-primary/10 text-primary" : methodColor(method)}
                    `}
                  >
                    {method}
                  </button>
                ))}
              </div>
            )}
          </div>

          <VariableInput
            value={reqUrl}
            onChange={setReqUrl}
            placeholder="https://api.example.com/v1/resource"
            className="flex-1 w-full bg-transparent px-5 py-2.5 text-gray-100 placeholder-muted/50 focus:outline-none text-[15px] font-medium"
            environments={environments}
            activeEnvId={activeEnvId}
            onEnter={onSendRequest}
          />

          <button
            onClick={onSendRequest}
            disabled={isSending || !reqUrl.trim()}
            title="Send Request (Ctrl+Enter)"
            className="shrink-0 h-10 px-8 bg-primary hover:bg-primary-hover text-white font-black text-[14px] tracking-widest uppercase transition-all disabled:opacity-30 disabled:grayscale flex items-center space-x-2 active:scale-95"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Send</span>
                <Play size={14} fill="currentColor" strokeWidth={0} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 flex flex-col min-h-0 relative border-b border-border">
          <div className="flex border-b border-border px-4 shrink-0 bg-surface/20">
            {(
              ["Params", "Headers", "Body", "Auth", "Tests", "Docs"] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveWorkspaceTab(tab)}
                className={`px-4 py-3 text-[12px] font-bold uppercase tracking-wider transition-all relative
                  ${activeWorkspaceTab === tab
                    ? "text-primary"
                    : "text-muted hover:text-gray-300"
                  }`}
              >
                {tab}
                {activeWorkspaceTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(255,106,19,0.3)]"></div>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative bg-background">
            {activeWorkspaceTab === "Headers" && (
              <KeyValueEditor
                items={reqHeaders}
                setItems={setReqHeaders}
                environments={environments}
                activeEnvId={activeEnvId}
              />
            )}
            {activeWorkspaceTab === "Params" && (
              <KeyValueEditor
                items={reqParams}
                setItems={setReqParams}
                environments={environments}
                activeEnvId={activeEnvId}
              />
            )}

            {activeWorkspaceTab === "Body" && (
              <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30 shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted">
                    Request Body
                  </span>
                </div>
                <div className="flex-1 relative bg-background group/editor flex overflow-hidden">
                  <div className="shrink-0 w-12 bg-surface/5 border-r border-border text-right py-4 px-3 text-[12px] text-muted/30 font-mono select-none overflow-hidden">
                    {reqBody.split("\n").map((_, i) => (
                      <div key={i} className="h-[21px] leading-[21px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <div
                      id="req-body-highlight"
                      className="absolute inset-0 p-4 font-mono text-[14px] leading-[21px] pointer-events-none whitespace-pre overflow-hidden"
                    >
                      {reqBody.split(/(".*?"|[:{}\[\]\s,]+|\d+|true|false|null)/g).map((token, i, arr) => {
                        if (/^".*"$/.test(token)) {
                          if (arr[i + 1]?.includes(':')) return <span key={i} className="text-[#9CDCFE]">{token}</span>;
                          return <span key={i} className="text-[#CE9178]">{token}</span>;
                        }
                        if (/^\d+$/.test(token)) return <span key={i} className="text-[#B5CEA8]">{token}</span>;
                        if (/^(true|false|null)$/.test(token)) return <span key={i} className="text-[#569CD6] font-bold">{token}</span>;
                        if (/^[:{}\[\]\s,]+$/.test(token)) return <span key={i} className="text-gray-400">{token}</span>;
                        return <span key={i} className="text-gray-200">{token}</span>;
                      })}
                    </div>
                    <VariableInput
                      value={reqBody}
                      onChange={setReqBody}
                      type="textarea"
                      environments={environments}
                      activeEnvId={activeEnvId}
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const highlight = document.getElementById("req-body-highlight");
                        if (highlight) {
                          highlight.scrollTop = target.scrollTop;
                          highlight.scrollLeft = target.scrollLeft;
                        }
                      }}
                      className="w-full h-full bg-transparent p-4 text-[14px] font-mono text-transparent caret-white focus:outline-none resize-none leading-[21px] selection:bg-primary/20 relative z-10 whitespace-pre overflow-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            {["Auth", "Tests", "Docs"].includes(activeWorkspaceTab) && (
              <div className="flex items-center justify-center h-full text-muted text-sm font-mono bg-background/50">
                <span>
                  No saved {activeWorkspaceTab.toLowerCase()} data for this
                  request.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import {
  File as FileIcon,
  FileText,
  ChevronDown,
  Folder,
  Play,
  Plus,
  Save,
  Trash,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { KeyValueEditor } from "./KeyValueEditor";
import { FormDataEditor } from "./FormDataEditor";
import { methodColor } from "../utils";
import { VariableInput } from "./VariableInput";
import { ScriptSnippets } from "./ScriptSnippets";
import { ScriptEditor } from "./ScriptEditor";
import { AuthEditor } from "./AuthEditor";
import { open } from "@tauri-apps/plugin-dialog";
import type { KeyValuePair, WorkspaceTab, Environment, FormDataEntry } from "../types";

type Props = {
  activeCollectionName: string;
  activeRequestName: string;
  isDirty: boolean;
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
  globals: Record<string, string>;
  reqPreRequestScript: string | null;
  setReqPreRequestScript: Dispatch<SetStateAction<string | null>>;
  reqPostRequestScript: string | null;
  setReqPostRequestScript: Dispatch<SetStateAction<string | null>>;
  reqBodyType: "none" | "raw" | "form-data" | "binary";
  setReqBodyType: Dispatch<SetStateAction<"none" | "raw" | "form-data" | "binary">>;
  reqFormData: FormDataEntry[];
  setReqFormData: Dispatch<SetStateAction<FormDataEntry[]>>;
  reqBinaryFilePath: string | null;
  setReqBinaryFilePath: Dispatch<SetStateAction<string | null>>;
  reqAuth: any;
  setReqAuth: Dispatch<SetStateAction<any>>;
};

export function RequestWorkspace({
  activeCollectionName,
  activeRequestName,
  isDirty,
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
  globals,
  reqPreRequestScript,
  setReqPreRequestScript,
  reqPostRequestScript,
  setReqPostRequestScript,
  reqBodyType,
  setReqBodyType,
  reqFormData,
  setReqFormData,
  reqBinaryFilePath,
  setReqBinaryFilePath,
  reqAuth,
  setReqAuth,
}: Props) {
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const insertSnippet = useCallback((code: string, type: "pre" | "post") => {
    const isPre = type === "pre";
    const currentVal = isPre ? reqPreRequestScript : reqPostRequestScript;
    const setter = isPre ? setReqPreRequestScript : setReqPostRequestScript;
    const targetId = isPre ? "pre-script-textarea" : "post-script-textarea";
    
    const textarea = document.getElementById(targetId) as HTMLTextAreaElement;
    if (!textarea) {
      setter((currentVal || "") + "\n" + code);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentVal || "";
    const newVal = text.substring(0, start) + code + text.substring(end);
    
    setter(newVal);
    
    // Maintain focus and set cursor after the inserted snippet
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + code.length, start + code.length);
    }, 0);
  }, [reqPreRequestScript, reqPostRequestScript, setReqPreRequestScript, setReqPostRequestScript]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMethodOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "WS"];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background relative selection:bg-primary/30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex flex-col space-y-1 min-w-0">
          <div className="flex items-center space-x-2 text-[11px] text-muted font-bold uppercase tracking-widest truncate">
            <Folder size={12} className="text-primary shrink-0" />
            <span className="truncate">{activeCollectionName || "No collection"}</span>
          </div>
          <div className="flex items-center space-x-2 text-[15px] font-bold text-gray-100 truncate">
            <span className="truncate">{activeRequestName || "Untitled Request"}</span>
            {isDirty && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-[0_0_8px_rgba(255,106,19,0.5)]" title="Unsaved changes"></div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onSaveRequest}
            disabled={isSavingRequest || (!isDirty && activeRequestName !== "")}
            title="Save Request (Ctrl+S)"
            className={`h-8 px-3 md:px-4 rounded border font-semibold text-[12px] flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-30 ${isDirty
                ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                : "bg-transparent border-border hover:bg-surface-hover text-gray-400"
              }`}
          >
            <Save size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">{isSavingRequest ? "Saving..." : "Save"}</span>
          </button>
          <button
            onClick={onCreateRequest}
            className="h-8 px-3 md:px-4 rounded bg-primary text-white hover:bg-primary-hover font-bold text-[12px] flex items-center space-x-2 transition-all shadow-lg shadow-primary/10 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-background border-b border-border shrink-0">
        <div className="flex items-center bg-surface border border-border rounded-lg group focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
          <div className="relative shrink-0 flex items-center border-r border-border bg-surface-hover/30" ref={dropdownRef}>
            <button
              onClick={() => setIsMethodOpen(!isMethodOpen)}
              className={`flex items-center space-x-1 md:space-x-2 h-9 px-3 md:px-5 font-black text-[12px] tracking-wide transition-all hover:bg-surface-hover/50 rounded-l-lg ${methodColor(reqMethod)}`}
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
            className="flex-1 w-full bg-transparent px-4 py-2 text-gray-100 placeholder-muted/50 focus:outline-none text-[14px] font-medium"
            environments={environments}
            activeEnvId={activeEnvId}
            globals={globals}
            onEnter={onSendRequest}
          />

          <button
            onClick={onSendRequest}
            disabled={isSending || !reqUrl.trim()}
            title="Send Request (Ctrl+Enter)"
            className="shrink-0 h-9 px-4 md:px-6 bg-primary hover:bg-primary-hover text-white font-black text-[12px] md:text-[13px] tracking-widest uppercase transition-all disabled:opacity-30 disabled:grayscale flex items-center space-x-2 active:scale-95 rounded-r-lg"
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <Play size={14} fill="currentColor" strokeWidth={0} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 flex flex-col min-h-0 relative border-b border-border">
          <div className="flex border-b border-border px-4 shrink-0 bg-surface/20 overflow-x-auto custom-scrollbar-thin">
            {(
              ["Params", "Headers", "Body", "Pre-request", "Auth", "Tests", "Docs"] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveWorkspaceTab(tab)}
                className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all relative
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
                globals={globals}
              />
            )}
            {activeWorkspaceTab === "Params" && (
              <KeyValueEditor
                items={reqParams}
                setItems={setReqParams}
                environments={environments}
                activeEnvId={activeEnvId}
                globals={globals}
              />
            )}

            {activeWorkspaceTab === "Body" && (
              <div className="flex-1 flex flex-col h-full bg-background overflow-hidden font-sans">
                <div className="flex items-center space-x-4 px-3 py-1.5 border-b border-border bg-surface/30 shrink-0">
                  <div className="flex items-center space-x-1">
                    {(["none", "raw", "form-data", "binary"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setReqBodyType(type)}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all
                          ${reqBodyType === type 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "text-muted hover:text-gray-300 hover:bg-white/5"}
                        `}
                      >
                        {type === "form-data" ? "Form Data" : type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                  {reqBodyType === "none" && (
                    <div className="flex flex-col items-center justify-center h-full text-muted space-y-2 bg-background/50">
                      <div className="p-4 rounded-full bg-surface/20">
                         <Play size={24} className="opacity-20" />
                      </div>
                      <span className="text-sm font-medium">This request does not have a body</span>
                    </div>
                  )}

                  {reqBodyType === "raw" && (
                    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
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
                            globals={globals}
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

                  {reqBodyType === "form-data" && (
                    <FormDataEditor
                      items={reqFormData}
                      setItems={setReqFormData}
                      environments={environments}
                      activeEnvId={activeEnvId}
                      globals={globals}
                    />
                  )}

                  {reqBodyType === "binary" && (
                    <div className="flex flex-col items-center justify-center h-full p-8 space-y-6 bg-surface/5">
                      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <FileIcon size={40} className="text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="text-center space-y-2 max-w-sm">
                        <h3 className="text-[16px] font-bold text-gray-100">Select Binary File</h3>
                        <p className="text-[13px] text-muted leading-relaxed">
                          Choose a file from your system to send as the raw request body. 
                          The file content will be sent as-is.
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-center space-y-4 w-full max-w-md">
                        <button
                          onClick={async () => {
                            try {
                              const selected = await open({
                                multiple: false,
                                directory: false,
                              });
                              if (selected && typeof selected === "string") {
                                setReqBinaryFilePath(selected);
                              }
                            } catch (err) {
                              console.error("Failed to select binary file:", err);
                            }
                          }}
                          className="w-full h-12 flex items-center justify-center space-x-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl transition-all group active:scale-95"
                        >
                          <Plus size={18} className="text-primary group-hover:scale-110 transition-transform" />
                          <span className="text-[14px] font-bold text-primary tracking-wide">
                            {reqBinaryFilePath ? "Change File" : "Choose File"}
                          </span>
                        </button>

                        {reqBinaryFilePath && (
                          <div className="w-full p-4 bg-surface border border-border rounded-xl flex items-center justify-between group/file">
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <div className="p-2 rounded-lg bg-white/5">
                                <FileText size={16} className="text-muted" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-bold text-gray-200 truncate">
                                  {reqBinaryFilePath.split(/[\\/]/).pop()}
                                </span>
                                <span className="text-[11px] text-muted truncate opacity-60">
                                  {reqBinaryFilePath}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => setReqBinaryFilePath(null)}
                              className="p-2 text-muted hover:text-red-400 transition-colors opacity-0 group-hover/file:opacity-100"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeWorkspaceTab === "Pre-request" && (
              <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                <div className="px-4 py-2 border-b border-border/50 bg-surface/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Pre-request Script</span>
                  </div>
                  <span className="text-[9px] text-muted font-mono opacity-50">Runs before Request</span>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                  <ScriptEditor
                    id="pre-script-textarea"
                    value={reqPreRequestScript || ""}
                    onChange={setReqPreRequestScript}
                    placeholder="// Write JavaScript code here. Available API: pm.*"
                    className="flex-1"
                  />
                  <div className="w-64 border-l border-border bg-surface/5">
                    <ScriptSnippets onInsert={(code) => insertSnippet(code, "pre")} />
                  </div>
                </div>
              </div>
            )}
            
            {activeWorkspaceTab === "Tests" && (
              <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
                <div className="px-4 py-2 border-b border-border/50 bg-surface/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/70">Response Tests</span>
                  </div>
                  <span className="text-[9px] text-muted font-mono opacity-50">Runs after Response</span>
                </div>
                <div className="flex-1 flex overflow-hidden relative">
                  <ScriptEditor
                    id="post-script-textarea"
                    value={reqPostRequestScript || ""}
                    onChange={setReqPostRequestScript}
                    placeholder="// Write JavaScript code to validate the response. Available API: pm.*"
                    className="flex-1"
                  />
                  <div className="w-64 border-l border-border bg-surface/5">
                    <ScriptSnippets onInsert={(code) => insertSnippet(code, "post")} />
                  </div>
                </div>
              </div>
            )}

            {activeWorkspaceTab === "Auth" && (
               <AuthEditor 
                 auth={reqAuth} 
                 onChange={setReqAuth} 
                 environments={environments}
                 activeEnvId={activeEnvId}
                 globals={globals}
               />
            )}

            {["Docs"].includes(activeWorkspaceTab) && (
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

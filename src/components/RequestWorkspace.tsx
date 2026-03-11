import { ChevronDown, Folder, MoreHorizontal, Play, Plus, Save } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { KeyValueEditor } from "./KeyValueEditor";
import type { KeyValuePair, WorkspaceTab } from "../types";
import { methodColor } from "../utils";

type Props = {
  activeCollectionName: string;
  activeRequestName: string;
  isCreatingRequest: boolean;
  onCreateRequest: () => void;
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
};

export function RequestWorkspace({
  activeCollectionName,
  activeRequestName,
  isCreatingRequest,
  onCreateRequest,
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
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#1e1e1e]">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center text-[13px] text-gray-400">
            <span className="font-medium text-muted">Active Collection</span>
          </div>
          <div className="flex items-center text-[14px]">
            <div className="flex items-center space-x-2 text-gray-200 font-bold">
              <Folder size={16} className="text-primary" />
              <span>{activeCollectionName || "Select a collection"}</span>
              {activeRequestName && <span className="text-muted">/ {activeRequestName}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="h-8 px-4 rounded bg-transparent border border-border hover:border-muted text-gray-300 font-medium text-[13px] flex items-center space-x-2 transition-colors">
            <MoreHorizontal size={14} />
          </button>
          <button
            onClick={onCreateRequest}
            className="h-8 px-5 rounded bg-transparent border border-primary/40 text-primary hover:bg-primary/10 font-medium text-[13px] flex items-center space-x-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>{isCreatingRequest ? "Creating..." : "Create New"}</span>
          </button>
          <button className="h-8 px-5 rounded bg-transparent border border-primary/40 text-primary hover:bg-primary/10 font-medium text-[13px] flex items-center space-x-2 transition-colors shadow-sm cursor-pointer">
            <Save size={14} strokeWidth={2.5} />
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 bg-[#1e1e1e] border-b border-border shrink-0">
        <div className="flex items-center bg-surface border border-border shadow-sm rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <div className="relative shrink-0 flex items-center border-r border-border hover:bg-white/5">
            <select
              value={reqMethod}
              onChange={(e) => setReqMethod(e.target.value)}
              className={`appearance-none bg-transparent font-bold px-4 py-2 pr-8 focus:outline-none cursor-pointer text-[13px] ${methodColor(reqMethod)}`}
            >
              <option className="bg-surface text-green-400">GET</option>
              <option className="bg-surface text-yellow-400">POST</option>
              <option className="bg-surface text-blue-400">PUT</option>
              <option className="bg-surface text-red-400">DELETE</option>
              <option className="bg-surface text-purple-400">PATCH</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 text-muted pointer-events-none" />
          </div>

          <input
            type="text"
            value={reqUrl}
            onChange={(e) => setReqUrl(e.target.value)}
            placeholder="Enter request URL"
            className="flex-1 bg-transparent px-4 py-2 text-gray-200 placeholder-muted focus:outline-none text-[14px] font-mono selection:bg-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSendRequest();
              }
            }}
          />

          <button
            onClick={onSendRequest}
            disabled={isSending || !reqUrl.trim()}
            className="shrink-0 h-9 px-6 bg-primary hover:bg-primary-hover text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-[0_0_10px_rgba(157,78,221,0.2)]"
          >
            {isSending ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="text-[13px] tracking-wide">Run</span>
                <Play size={12} fill="currentColor" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
        <div className="flex-1 flex flex-col min-h-0 relative border-b border-border border-b-[2px]">
          <div className="flex border-b border-border px-2 shrink-0 bg-[#1e1e1e]">
            {(["Params", "Headers", "Body", "Auth", "Tests", "Docs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveWorkspaceTab(tab)}
                className={`px-4 py-2.5 text-[13px] font-medium transition-all duration-200 relative
                  ${activeWorkspaceTab === tab
                    ? "text-gray-100"
                    : "text-muted hover:text-gray-300"}`}
              >
                {tab}
                {activeWorkspaceTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
            {activeWorkspaceTab === "Headers" && <KeyValueEditor items={reqHeaders} setItems={setReqHeaders} />}
            {activeWorkspaceTab === "Params" && <KeyValueEditor items={reqParams} setItems={setReqParams} />}

            {activeWorkspaceTab === "Body" && (
              <div className="flex-1 flex flex-col h-full bg-[#1e1e1e]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30 shrink-0">
                  <span className="text-[12px] font-semibold text-gray-300">Request Body</span>
                </div>
                <div className="flex-1 relative bg-[#1e1e1e]">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-surface/10 border-r border-border text-right py-4 px-3 text-[13px] text-muted font-mono select-none">
                    {reqBody.split("\n").map((_, i) => <div key={i} className="mb-[2px] opacity-70 leading-[21px]">{i + 1}</div>)}
                  </div>
                  <textarea
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    className="w-full h-full bg-transparent p-4 pl-16 text-[14px] font-mono text-[#ce9178] focus:outline-none resize-none leading-[21px]"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {["Auth", "Tests", "Docs"].includes(activeWorkspaceTab) && (
              <div className="flex items-center justify-center h-full text-muted text-sm font-mono bg-background/50">
                <span>{activeWorkspaceTab} configuration coming soon</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

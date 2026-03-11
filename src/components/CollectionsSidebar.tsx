import { ChevronRight, Folder, Plus } from "lucide-react";
import type { Collection, StoredRequest } from "../types";
import { methodColor } from "../utils";

type Props = {
  collections: Collection[];
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string) => void;
  expandedCollections: Record<string, boolean>;
  toggleCollectionExpanded: (id: string) => void;
  requestsByCollection: Record<string, StoredRequest[]>;
  activeRequestId: string | null;
  onSelectRequest: (request: StoredRequest) => void;
  onCreateCollection: () => void;
  onCreateRequest: () => void;
  isLoadingRequests: boolean;
  isCreatingRequest: boolean;
};

export function CollectionsSidebar({
  collections,
  activeCollectionId,
  setActiveCollectionId,
  expandedCollections,
  toggleCollectionExpanded,
  requestsByCollection,
  activeRequestId,
  onSelectRequest,
  onCreateCollection,
  onCreateRequest,
  isLoadingRequests,
  isCreatingRequest,
}: Props) {
  return (
    <div className="w-[280px] bg-surface flex flex-col border-r border-border shrink-0 z-10">
      <div className="px-3 py-3 border-b border-border">
        <button onClick={onCreateCollection} className="w-full flex items-center justify-center space-x-2 bg-transparent border border-border/70 hover:border-primary/50 hover:bg-primary/5 text-gray-300 py-1.5 rounded-md transition-colors text-[13px] font-medium group">
          <Plus size={15} className="group-hover:text-primary transition-colors text-muted" />
          <span>Create Collection</span>
          <span className="text-[10px] font-mono text-muted ml-auto mr-1 group-hover:text-primary/70 border border-transparent group-hover:border-primary/20 px-1 rounded">Ctrl+N</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
        <div className="mb-6">
          <div className="px-4 py-1.5 flex items-center justify-between group cursor-pointer hover:bg-white/5">
            <span className="text-[11px] font-bold text-muted tracking-wider uppercase">Collections</span>
            <button onClick={onCreateCollection}><Plus size={14} className="text-muted opacity-0 group-hover:opacity-100 hover:text-gray-200" /></button>
          </div>

          <div className="mt-1 flex flex-col font-medium text-[13px]">
            {collections.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted italic">
                <div>No collections yet.</div>
                <button onClick={onCreateCollection} className="mt-2 text-primary hover:text-primary-hover">Create New</button>
              </div>
            ) : (
              collections.map((collection) => {
                const requests = requestsByCollection[collection.id] || [];
                const expanded = !!expandedCollections[collection.id];
                const active = activeCollectionId === collection.id;
                return (
                  <div key={collection.id} className="flex flex-col">
                    <div
                      onClick={() => {
                        setActiveCollectionId(collection.id);
                        if (!expanded) {
                          toggleCollectionExpanded(collection.id);
                        }
                      }}
                      className={`flex items-center px-4 py-1 cursor-pointer group ${active ? "bg-primary/10 text-gray-100 border-r-2 border-primary" : "hover:bg-white/5 text-gray-300"}`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectionExpanded(collection.id);
                        }}
                        className="mr-1.5"
                      >
                        <ChevronRight size={14} className={`text-muted group-hover:text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`} />
                      </button>
                      <Folder size={15} className={`${active ? "text-primary" : "text-[#dcb67a]"} mr-2`} />
                      <span className="truncate">{collection.name}</span>
                    </div>

                    {expanded && (
                      <div className="ml-8 mr-3 mt-1 rounded border border-border/70 bg-background/40 p-2">
                        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
                          <span>Requests</span>
                          <button onClick={onCreateRequest}>
                            <Plus size={13} className="text-primary hover:text-primary-hover" />
                          </button>
                        </div>
                        {active && isLoadingRequests ? (
                          <div className="text-[11px] text-muted">Loading...</div>
                        ) : requests.length === 0 ? (
                          <button onClick={onCreateRequest} className="w-full rounded border border-dashed border-border py-1 text-[11px] text-muted hover:border-primary/40 hover:text-primary">
                            {isCreatingRequest ? "Creating..." : "Create New Request"}
                          </button>
                        ) : (
                          requests.map((request) => (
                            <button
                              key={request.id}
                              onClick={() => onSelectRequest(request)}
                              className={`mb-1 flex w-full items-center space-x-2 rounded px-2 py-1 text-left text-[12px] ${activeRequestId === request.id ? "bg-white/10" : "hover:bg-white/5"}`}
                            >
                              <span className={`font-bold ${methodColor(request.method)}`}>{request.method}</span>
                              <span className="truncate text-gray-300">{request.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-1 font-medium text-[13px] text-gray-400">
          <div className="px-4 py-1.5 hover:bg-white/5 cursor-pointer hover:text-gray-200">Recent</div>
          <div className="px-4 py-1.5 hover:bg-white/5 cursor-pointer hover:text-gray-200">Starred</div>
          <div className="px-4 py-1.5 hover:bg-white/5 cursor-pointer hover:text-gray-200">Team Devices</div>
        </div>
      </div>
    </div>
  );
}

import { ChevronRight, Folder, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
  onCreateRequest: (collectionId?: string) => void;
  onCopyCollection: (collection: Collection) => void;
  onPasteCollection: () => void;
  onRenameCollection: (collection: Collection) => void;
  onDuplicateCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onCopyRequest: (request: StoredRequest) => void;
  onPasteRequest: (collectionId: string) => void;
  onRenameRequest: (request: StoredRequest) => void;
  onDuplicateRequest: (request: StoredRequest) => void;
  onDeleteRequest: (request: StoredRequest) => void;
  isLoadingRequests: boolean;
  isCreatingRequest: boolean;
  peersCount: number;
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
  onCopyCollection,
  onPasteCollection,
  onRenameCollection,
  onDuplicateCollection,
  onDeleteCollection,
  onCopyRequest,
  onPasteRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
  isLoadingRequests,
  isCreatingRequest,
  peersCount,
}: Props) {
  const [openCollectionMenuId, setOpenCollectionMenuId] = useState<
    string | null
  >(null);
  const [openRequestMenuId, setOpenRequestMenuId] = useState<string | null>(
    null,
  );
  const totalRequests = useMemo(
    () =>
      Object.values(requestsByCollection).reduce(
        (count, requests) => count + requests.length,
        0,
      ),
    [requestsByCollection],
  );

  function requestMenuKey(request: StoredRequest) {
    return `${request.collection_id}:${request.id}`;
  }

  return (
    <div
      className="w-[280px] bg-surface flex flex-col border-r border-border shrink-0 z-10"
      onClick={() => {
        setOpenCollectionMenuId(null);
        setOpenRequestMenuId(null);
      }}
    >
      <div className="px-3 py-3 border-b border-border">
        <button
          onClick={onCreateCollection}
          className="w-full p-2 flex gap-2 items-center justify-center bg-transparent border border-border/70 hover:bg-primary/50 hover:bg-primary/5 text-gray-300 py-1.5 rounded-md transition-colors text-[13px] font-medium group"
        >
          <Plus
            size={15}
            className="group-hover:text-primary transition-colors text-muted mt-1"
          />
          <span>Create Collection</span>
          {/* <span className="text-[10px] font-mono text-muted ml-auto">
            Ctrl+N
          </span> */}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPasteCollection();
          }}
          className="mt-2 w-full flex items-center justify-center bg-transparent border border-border/70 hover:border-primary/50 hover:bg-primary/5 text-gray-300 py-1.5 rounded-md transition-colors text-[12px] font-medium"
        >
          Paste Collection
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
        <div className="mb-6">
          <div className="px-4 py-1.5 flex items-center justify-between group cursor-pointer hover:bg-white/5">
            <span className="text-[11px] font-bold text-muted tracking-wider uppercase">
              Collections
            </span>
            <button onClick={onCreateCollection}>
              <Plus
                size={14}
                className="text-muted opacity-0 group-hover:opacity-100 hover:text-gray-200"
              />
            </button>
          </div>

          <div className="mt-1 flex flex-col font-medium text-[13px]">
            {collections.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted italic">
                <div>No collections yet.</div>
                <button
                  onClick={onCreateCollection}
                  className="mt-2 text-primary hover:text-primary-hover"
                >
                  Create New
                </button>
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
                        // if (!expanded) {
                        toggleCollectionExpanded(collection.id);
                        // }
                      }}
                      className={`flex items-center px-4 py-1 cursor-pointer group ${active ? "bg-primary/10 text-gray-100 border-r-2 border-primary" : ""} hover:bg-white/5 text-gray-300`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectionExpanded(collection.id);
                        }}
                        className="mr-1.5"
                      >
                        <ChevronRight
                          size={14}
                          className={`text-muted group-hover:text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`}
                        />
                      </button>
                      <Folder
                        size={15}
                        className={`${!expanded ? "text-primary" : "text-[#dcb67a]"} mr-2`}
                      />
                      <span className="truncate min-w-0">
                        {collection.name}
                      </span>
                      <div className="ml-auto relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRequestMenuId(null);
                            setOpenCollectionMenuId((prev) =>
                              prev === collection.id ? null : collection.id,
                            );
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 text-muted hover:text-gray-200"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {openCollectionMenuId === collection.id && (
                          <div
                            className="absolute right-0 top-6 w-[150px] bg-(--color-background) rounded border border-border bg-surface shadow-lg z-30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onCopyCollection(collection);
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onPasteCollection();
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                            >
                              Paste Collection
                            </button>
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onPasteRequest(collection.id);
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                            >
                              Paste Request
                            </button>
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onRenameCollection(collection);
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onDuplicateCollection(collection);
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                setOpenCollectionMenuId(null);
                                onDeleteCollection(collection);
                              }}
                              className="w-full px-2 py-1.5 text-left text-[12px] text-red-400 hover:bg-white/5"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div className="ml-8 mr-3 mt-1 rounded border border-border/70 bg-background/40 p-2">
                        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
                          <span>Requests</span>
                          <button
                            onClick={() => {
                              setActiveCollectionId(collection.id);
                              onCreateRequest(collection.id);
                            }}
                          >
                            <Plus
                              size={13}
                              className="text-primary hover:text-primary-hover"
                            />
                          </button>
                        </div>
                        {active && isLoadingRequests ? (
                          <div className="text-[11px] text-muted">
                            Loading...
                          </div>
                        ) : requests.length === 0 ? (
                          <button
                            onClick={() => {
                              setActiveCollectionId(collection.id);
                              onCreateRequest(collection.id);
                            }}
                            className="w-full rounded border border-dashed border-border py-1 text-[11px] text-muted hover:border-primary/40 hover:text-primary"
                          >
                            {isCreatingRequest
                              ? "Creating..."
                              : "Create New Request"}
                          </button>
                        ) : (
                          requests.map((request) => (
                            <div
                              key={request.id}
                              className={`mb-1 flex w-full items-center space-x-2 rounded px-2 py-1 text-left text-[12px] group ${activeRequestId === request.id ? "bg-white/10" : "hover:bg-white/5"}`}
                            >
                              <button
                                onClick={() => onSelectRequest(request)}
                                className="flex-1 flex items-center space-x-2 text-left min-w-0"
                              >
                                <span
                                  className={`font-bold ${methodColor(request.method)}`}
                                >
                                  {request.method}
                                </span>
                                <span className="truncate text-gray-300">
                                  {request.name}
                                </span>
                              </button>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenCollectionMenuId(null);
                                    const key = requestMenuKey(request);
                                    setOpenRequestMenuId((prev) =>
                                      prev === key ? null : key,
                                    );
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-muted hover:text-gray-200"
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                                {openRequestMenuId ===
                                  requestMenuKey(request) && (
                                  <div
                                    className="absolute right-0 top-6 w-[140px] bg-(--color-background) rounded border border-border bg-surface shadow-lg z-30"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setOpenRequestMenuId(null);
                                        onCopyRequest(request);
                                      }}
                                      className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenRequestMenuId(null);
                                        onPasteRequest(request.collection_id);
                                      }}
                                      className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                                    >
                                      Paste
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenRequestMenuId(null);
                                        onRenameRequest(request);
                                      }}
                                      className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenRequestMenuId(null);
                                        onDuplicateRequest(request);
                                      }}
                                      className="w-full px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenRequestMenuId(null);
                                        onDeleteRequest(request);
                                      }}
                                      className="w-full px-2 py-1.5 text-left text-[12px] text-red-400 hover:bg-white/5"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
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
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span>Collections</span>
            <span className="text-muted">{collections.length}</span>
          </div>
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span>Saved Requests</span>
            <span className="text-muted">{totalRequests}</span>
          </div>
          <div className="px-4 py-1.5 flex items-center justify-between">
            <span>Active Peers</span>
            <span className="text-muted">{peersCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

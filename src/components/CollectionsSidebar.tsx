import { ChevronRight, Folder as FolderIcon, MoreHorizontal, Plus, GripVertical, Upload, History as HistoryIcon, Play, Share2, Globe, Monitor } from "lucide-react";
import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Collection, Folder, StoredRequest, Workspace } from "../types";
import { methodColor, methodBgColor } from "../utils";

type Props = {
  collections: Collection[];
  foldersByCollection: Record<string, Folder[]>;
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string | null) => void;
  expandedCollections: Record<string, boolean>;
  toggleCollectionExpanded: (id: string) => void;
  expandedFolders: Record<string, boolean>;
  toggleFolderExpanded: (id: string) => void;
  requestsByCollection: Record<string, StoredRequest[]>;
  activeRequestId: string | null;
  onSelectRequest: (request: StoredRequest) => void;
  onCreateCollection: () => void;
  onCreateFolder: (collectionId: string) => void;
  onCreateRequest: (collectionId?: string, folderId?: string | null) => void;
  onCopyCollection: (collection: Collection) => void;
  onPasteCollection: () => void;
  onRenameCollection: (collection: Collection) => void;
  onDuplicateCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onRenameFolder: (folder: Folder) => void;
  onDuplicateFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onMoveFolder: (folderId: string, targetCollectionId: string, targetPosition: number) => void;
  onMoveCollection: (collectionId: string, targetWorkspaceId: string, targetPosition: number) => void;
  onMoveRequest: (requestId: string, targetCollectionId: string, targetFolderId: string | null, targetPosition: number) => void;
  onCopyRequest: (request: StoredRequest) => void;
  onPasteRequest: (collectionId: string, folderId?: string | null) => void;
  onRenameRequest: (request: StoredRequest) => void;
  onDuplicateRequest: (request: StoredRequest) => void;
  onDeleteRequest: (request: StoredRequest) => void;
  activeRequestIsDirty: boolean;
  isLoadingRequests: boolean;
  onExportWorkspace: () => void;
  onImportWorkspace: () => void;
  onHistory: () => void;
  onRunCollection: (collection: Collection) => void;
  onRunFolder: (folder: Folder) => void;
  onShareCollection: (collectionId: string) => void;
  peersCount: number;
  peers: Record<string, string>;
  peerCollections: Record<string, Array<{ id: string, name: string, owner_id: string, workspace_id: string }>>;
  onDownloadRequest: (peerIpId: string, collectionId: string) => void;
  onHide?: () => void;
  activeWorkspaceId?: string | null;
  activeWorkspaceName?: string;
  peerWorkspaces: Record<string, Workspace[]>;
};

interface CollectionHeaderProps {
  collection: Collection;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  onRun: () => void;
  onCopy: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  peersCount: number;
  setMenuId: (id: string | null) => void;
  isOpen: boolean;
}

function CollectionHeader({
  collection,
  active,
  expanded,
  onSelect,
  onRun,
  onCopy,
  onRename,
  onDuplicate,
  onDelete,
  onShare,
  peersCount,
  setMenuId,
  isOpen,
}: CollectionHeaderProps) {
  const { setNodeRef, isOver } = useSortable({
    id: collection.id,
    data: { type: 'collection', collection }
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={`flex items-center px-3 py-1.5 cursor-pointer group transition-all ${active ? "bg-primary/5 text-primary border-l-2 border-primary" : "text-gray-400 hover:bg-surface-hover hover:text-gray-200"} ${isOver ? "bg-primary/15 ring-1 ring-primary/50 text-gray-100" : ""}`}
    >
      <ChevronRight
        size={14}
        className={`mr-1.5 text-muted group-hover:text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`}
      />
      <FolderIcon
        size={15}
        className={`${active ? "text-primary" : "text-primary/60"} mr-2`}
      />
      <span className="truncate min-w-0 font-bold">
        {collection.name}
      </span>
      <div className="ml-auto relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuId(isOpen ? null : collection.id);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 text-muted hover:text-gray-200"
        >
          <MoreHorizontal size={14} />
        </button>
        {isOpen && (
          <div
            className="absolute right-0 top-10 w-[160px] bg-background border border-border shadow-2xl rounded-md z-30 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setMenuId(null); onRun(); }}
              className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center space-x-2"
            >
              <Play size={10} fill="currentColor" className="text-method-get" />
              <span>Run Collection</span>
            </button>
            <button
              onClick={() => { setMenuId(null); onCopy(); }}
              className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Copy JSON
            </button>
            <button
              onClick={() => { setMenuId(null); onRename(); }}
              className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Rename
            </button>
            <button
              onClick={() => { setMenuId(null); onDuplicate(); }}
              className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Duplicate
            </button>
            {peersCount > 0 && (
              <button
                onClick={() => { setMenuId(null); onShare(); }}
                className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center space-x-2 text-primary"
              >
                <Share2 size={10} />
                <span>Share with Peers</span>
              </button>
            )}
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => { setMenuId(null); onDelete(); }}
              className="w-full px-3 py-1.5 text-left text-[11px] text-red-500 hover:bg-white/5"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FolderItemProps {
  folder: Folder;
  expandedFolders: Record<string, boolean>;
  toggleFolderExpanded: (id: string) => void;
  requestsByCollection: Record<string, StoredRequest[]>;
  activeRequestId: string | null;
  activeRequestIsDirty: boolean;
  onSelectRequest: (r: StoredRequest) => void;
  onCreateRequest: (collectionId?: string, folderId?: string | null) => void;
  onRenameFolder: (f: Folder) => void;
  onDuplicateFolder: (f: Folder) => void;
  onDeleteFolder: (f: Folder) => void;
  onRunFolder: (f: Folder) => void;
  openFolderMenuId: string | null;
  setOpenFolderMenuId: (id: string | null) => void;
  openRequestMenuId: string | null;
  setOpenRequestMenuId: (id: string | null) => void;
  requestMenuKey: (r: StoredRequest) => string;
  onCopyRequest: (r: StoredRequest) => void;
  onPasteRequest: (id: string, folderId?: string | null) => void;
  onRenameRequest: (r: StoredRequest) => void;
  onDuplicateRequest: (r: StoredRequest) => void;
  onDeleteRequest: (r: StoredRequest) => void;
}

function FolderItem({
  folder,
  expandedFolders,
  toggleFolderExpanded,
  requestsByCollection,
  activeRequestId,
  activeRequestIsDirty,
  onSelectRequest,
  onCreateRequest,
  onRenameFolder,
  onDuplicateFolder,
  onDeleteFolder,
  onRunFolder,
  openFolderMenuId,
  setOpenFolderMenuId,
  openRequestMenuId,
  setOpenRequestMenuId,
  requestMenuKey,
  onCopyRequest,
  onPasteRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest
}: FolderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ id: folder.id, data: { type: 'folder', folder } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };

  const folderExpanded = !!expandedFolders[folder.id];
  const folderRequests = requestsByCollection[folder.collection_id]?.filter(r => r.folder_id === folder.id) || [];

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col mb-1 group/folder">
      <div
        onClick={() => toggleFolderExpanded(folder.id)}
        className={`flex items-center px-3 py-1 cursor-pointer group rounded transition-all ${isOver ? "bg-primary/15 ring-1 ring-primary/50 text-gray-100" : "text-gray-400 hover:bg-surface-hover hover:text-gray-200"}`}
      >
        <div {...attributes} {...listeners} className="mr-1 opacity-0 group-hover/folder:opacity-40 hover:opacity-100 transition-opacity p-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical size={12} />
        </div>
        <ChevronRight
          size={12}
          className={`mr-1.5 text-muted transition-transform ${folderExpanded ? "rotate-90" : ""}`}
        />
        <FolderIcon size={14} className="mr-2 text-primary/70" />
        <span className="truncate text-[12px] font-semibold">{folder.name}</span>

        <div className="ml-auto flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateRequest(folder.collection_id, folder.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id);
              }}
              className="p-0.5 opacity-0 group-hover:opacity-100 text-muted hover:text-gray-200"
            >
              <MoreHorizontal size={12} />
            </button>
            {openFolderMenuId === folder.id && (
              <div
                className="absolute right-0 top-6 w-[120px] bg-background border border-border shadow-2xl rounded-md z-30 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setOpenFolderMenuId(null);
                    onRunFolder(folder);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center space-x-2"
                >
                  <Play size={10} fill="currentColor" className="text-method-get" />
                  <span>Run Folder</span>
                </button>
                <button
                  onClick={() => {
                    setOpenFolderMenuId(null);
                    onRenameFolder(folder);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setOpenFolderMenuId(null);
                    onDuplicateFolder(folder);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    setOpenFolderMenuId(null);
                    onDeleteFolder(folder);
                  }}
                  className="w-full px-2 py-1.5 text-left text-[11px] text-red-400 hover:bg-white/5"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {folderExpanded && (
        <div className="ml-6 flex flex-col border-l border-border/50">
          <SortableContext items={folderRequests.map(r => r.id)} strategy={verticalListSortingStrategy}>
            {folderRequests.length === 0 ? (
              <div className="px-4 py-1.5 text-[11px] text-muted italic">Empty folder</div>
            ) : (
              folderRequests.map((request) => (
                <RequestItem
                  key={request.id}
                  request={request}
                  activeRequestId={activeRequestId}
                  activeRequestIsDirty={activeRequestIsDirty}
                  onSelectRequest={onSelectRequest}
                  setOpenRequestMenuId={setOpenRequestMenuId}
                  openRequestMenuId={openRequestMenuId}
                  requestMenuKey={requestMenuKey}
                  onCopyRequest={onCopyRequest}
                  onPasteRequest={onPasteRequest}
                  onRenameRequest={onRenameRequest}
                  onDuplicateRequest={onDuplicateRequest}
                  onDeleteRequest={onDeleteRequest}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

interface RequestItemProps {
  request: StoredRequest;
  activeRequestId: string | null;
  activeRequestIsDirty: boolean;
  onSelectRequest: (r: StoredRequest) => void;
  setOpenRequestMenuId: (id: string | null) => void;
  openRequestMenuId: string | null;
  requestMenuKey: (r: StoredRequest) => string;
  onCopyRequest: (r: StoredRequest) => void;
  onPasteRequest: (id: string, folderId?: string | null) => void;
  onRenameRequest: (r: StoredRequest) => void;
  onDuplicateRequest: (r: StoredRequest) => void;
  onDeleteRequest: (r: StoredRequest) => void;
}

function RequestItem({
  request,
  activeRequestId,
  activeRequestIsDirty,
  onSelectRequest,
  setOpenRequestMenuId,
  openRequestMenuId,
  requestMenuKey,
  onCopyRequest,
  onPasteRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest
}: RequestItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ id: request.id, data: { type: 'request', request } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 40 : 'auto'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/request flex items-center px-3 py-1 cursor-pointer transition-all border-l-2 ${activeRequestId === request.id
        ? "bg-primary/5 border-primary text-gray-100"
        : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-surface-hover/50"
        } ${isOver ? "bg-primary/10 ring-1 ring-primary/40 ring-inset" : ""}`}
    >
      <div {...attributes} {...listeners} className="mr-1 opacity-0 group-hover/request:opacity-40 hover:opacity-100 transition-opacity p-0.5 cursor-grab active:cursor-grabbing">
        <GripVertical size={10} />
      </div>
      <div
        onClick={() => onSelectRequest(request)}
        className="flex-1 flex items-center space-x-2 text-left min-w-0"
      >
        <span className={`font-black text-[10px] w-8 ${methodColor(request.method)}`}>
          {request.method}
        </span>
        <span className="truncate text-[12px]">
          {request.name}
        </span>
        {activeRequestId === request.id && activeRequestIsDirty && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
        )}
      </div>
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            const key = requestMenuKey(request);
            setOpenRequestMenuId(openRequestMenuId === key ? null : key);
          }}
          className="p-1 opacity-0 group-hover/request:opacity-100 text-muted hover:text-gray-200"
        >
          <MoreHorizontal size={13} />
        </button>
        {openRequestMenuId === requestMenuKey(request) && (
          <div
            className="absolute right-0 top-6 w-[140px] bg-background rounded border border-border shadow-lg z-30 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setOpenRequestMenuId(null);
                onCopyRequest(request);
              }}
              className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Copy JSON
            </button>
            <button
              onClick={() => {
                setOpenRequestMenuId(null);
                onPasteRequest(request.collection_id, request.folder_id);
              }}
              className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Paste Request
            </button>
            <button
              onClick={() => {
                setOpenRequestMenuId(null);
                onRenameRequest(request);
              }}
              className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Rename
            </button>
            <button
              onClick={() => {
                setOpenRequestMenuId(null);
                onDuplicateRequest(request);
              }}
              className="w-full px-2 py-1.5 text-left text-[11px] hover:bg-white/5"
            >
              Duplicate
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                setOpenRequestMenuId(null);
                onDeleteRequest(request);
              }}
              className="w-full px-2 py-1.5 text-left text-[11px] text-red-400 hover:bg-white/5"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CollectionsSidebar({
  collections,
  foldersByCollection,
  activeCollectionId,
  setActiveCollectionId,
  expandedCollections,
  toggleCollectionExpanded,
  expandedFolders,
  toggleFolderExpanded,
  requestsByCollection,
  activeRequestId,
  onSelectRequest,
  onCreateCollection,
  onCreateFolder,
  onCreateRequest,
  onCopyCollection,
  onPasteCollection,
  onRenameCollection,
  onDuplicateCollection,
  onDeleteCollection,
  onRenameFolder,
  onDuplicateFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveCollection,
  onMoveRequest,
  onCopyRequest,
  onPasteRequest,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
  activeRequestIsDirty,
  isLoadingRequests,
  onExportWorkspace,
  onImportWorkspace,
  onHistory,
  onRunCollection,
  onRunFolder,
  onShareCollection,
  peersCount,
  peers,
  peerCollections,
  onDownloadRequest,
  onHide,
  activeWorkspaceId,
  peerWorkspaces,
}: Props) {
  const [openCollectionMenuId, setOpenCollectionMenuId] = useState<string | null>(null);
  const [openFolderMenuId, setOpenFolderMenuId] = useState<string | null>(null);
  const [openRequestMenuId, setOpenRequestMenuId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'request' | 'folder' | null>(null);
  const [activeItem, setActiveItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveType(active.data.current?.type);

    // Find the actual item data
    if (active.data.current?.type === 'request') {
      const allReqs = Object.values(requestsByCollection).flat();
      setActiveItem(allReqs.find(r => r.id === active.id));
    } else if (active.data.current?.type === 'folder') {
      const allFolders = Object.values(foldersByCollection).flat();
      setActiveItem(allFolders.find(f => f.id === active.id));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveType(null);
    setActiveItem(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overId = over.id as string;

    let targetCollectionId = "";
    let targetFolderId: string | null = null;
    let targetPosition = 0;

    for (const col of collections) {
      // Is it a request in this collection?
      const reqs = requestsByCollection[col.id] || [];
      const reqIdx = reqs.findIndex(r => r.id === overId);
      if (reqIdx !== -1) {
        targetCollectionId = col.id;
        const overReq = reqs[reqIdx];

        if (activeData?.type === 'request') {
          // Reordering request within its container (root or folder)
          targetFolderId = overReq.folder_id || null;
          const containerReqs = reqs.filter(r => r.folder_id === overReq.folder_id);
          targetPosition = containerReqs.findIndex(r => r.id === overId);
        } else if (activeData?.type === 'folder') {
          // Dropping folder over a request - move folder to this collection (end of folders)
          targetFolderId = null;
          const folders = foldersByCollection[col.id] || [];
          targetPosition = folders.length;
        }
        break;
      }

      // Is it a folder in this collection?
      const folders = foldersByCollection[col.id] || [];
      const folderIdx = folders.findIndex(f => f.id === overId);
      if (folderIdx !== -1) {
        targetCollectionId = col.id;
        if (activeData?.type === 'folder') {
          // Reordering folder by dropping on another folder
          targetFolderId = null;
          targetPosition = folderIdx;
        } else if (activeData?.type === 'request') {
          // Moving request INTO a folder by dropping on folder header
          targetFolderId = overId;
          const folderReqs = reqs.filter(r => r.folder_id === overId);
          targetPosition = folderReqs.length;
        }
        break;
      }

      if (col.id === overId) {
        targetCollectionId = col.id;
        targetFolderId = null;
        if (activeData?.type === 'request') {
          const rootReqs = reqs.filter(r => !r.folder_id);
          targetPosition = rootReqs.length;
        } else if (activeData?.type === 'folder') {
          targetPosition = folders.length;
        }
        break;
      }
    }

    if (!targetCollectionId) return;

    if (activeData?.type === 'request') {
      const requestId = active.id as string;
      onMoveRequest(requestId, targetCollectionId, targetFolderId, targetPosition);
    } else if (activeData?.type === 'folder') {
      const folderId = active.id as string;
      onMoveFolder(folderId, targetCollectionId, targetPosition);
    } else if (activeData?.type === 'collection') {
      const collectionId = active.id as string;
      onMoveCollection(collectionId, activeWorkspaceId || "default_workspace", targetPosition);
    }
  };

  const totalRequests = useMemo(
    () =>
      Object.values(requestsByCollection).reduce(
        (count, requests) => count + requests.length,
        0,
      ),
    [requestsByCollection],
  );

  const requestMenuKey = useCallback((request: StoredRequest) => {
    return `${request.collection_id}:${request.id}`;
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="w-full bg-surface flex flex-col border-r border-border shrink-0 z-10"
        onClick={() => {
          setOpenCollectionMenuId(null);
          setOpenFolderMenuId(null);
          setOpenRequestMenuId(null);
        }}
      >
        <div className="px-3 py-3 border-b border-border space-y-2">
          <button
            onClick={onCreateCollection}
            className="w-full h-8 flex gap-2 items-center justify-center bg-primary hover:bg-primary-hover text-white rounded-md transition-all text-[12px] font-semibold shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Collection</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onImportWorkspace}
              className="flex-1 h-8 flex items-center justify-center bg-surface border border-border hover:bg-surface-hover text-gray-300 hover:text-white rounded-md transition-colors text-[12px] font-medium"
              title="Import Workspace"
            >
              Import
            </button>
            <button
              onClick={onExportWorkspace}
              className="flex-1 h-8 flex items-center justify-center bg-surface border border-border hover:bg-surface-hover text-gray-300 hover:text-white rounded-md transition-colors text-[12px] font-medium"
              title="Export Workspace"
            >
              Export
            </button>
            <button
              onClick={onHistory}
              className="h-8 w-8 flex items-center justify-center bg-surface hover:bg-surface-hover text-gray-400 hover:text-primary rounded-md transition-colors shrink-0"
              title="Request History (Ctrl+H)"
            >
              <HistoryIcon size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
          <div className="mb-4">
            <div className="px-3 py-1.5 flex items-center justify-between group cursor-default border-t border-border/30 mt-2 pt-3">
              <span className="text-[11px] font-bold text-muted tracking-widest uppercase">
                Collections
              </span>
              <div className="flex items-center space-x-1">
                {onHide && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide();
                    }}
                    className="p-1 hover:bg-surface-hover rounded text-muted hover:text-primary transition-colors"
                    title="Hide Sidebar (Ctrl+[)"
                  >
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                )}
                <button
                  onClick={onPasteCollection}
                  className="p-1 hover:bg-surface-hover rounded text-muted hover:text-gray-200 transition-colors"
                  title="Paste Collection"
                >
                  <Upload size={14} />
                </button>
                <button
                  onClick={onCreateCollection}
                  className="p-1 hover:bg-surface-hover rounded text-muted hover:text-gray-200 transition-colors"
                  title="New Collection"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="mt-1 flex flex-col font-medium text-[13px]">
              {collections.length === 0 ? (
                <div className="px-4 py-2 text-xs text-muted italic">
                  No collections yet.
                </div>
              ) : (
                <SortableContext items={collections.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {collections.map((collection) => {
                    const expanded = !!expandedCollections[collection.id];
                    const active = activeCollectionId === collection.id;
                    const folders = foldersByCollection[collection.id] || [];
                    const rootRequests = (requestsByCollection[collection.id] || []).filter(r => !r.folder_id);

                    return (
                      <div key={collection.id} className="flex flex-col">
                        <CollectionHeader
                          collection={collection}
                          active={active}
                          expanded={expanded}
                          onSelect={() => {
                            setActiveCollectionId(collection.id);
                            toggleCollectionExpanded(collection.id);
                          }}
                          onRun={() => onRunCollection(collection)}
                          onCopy={() => onCopyCollection(collection)}
                          onRename={() => onRenameCollection(collection)}
                          onDuplicate={() => onDuplicateCollection(collection)}
                          onDelete={() => onDeleteCollection(collection)}
                          onShare={() => onShareCollection(collection.id)}
                          peersCount={peersCount}
                          setMenuId={setOpenCollectionMenuId}
                          isOpen={openCollectionMenuId === collection.id}
                        />

                        {expanded && (
                          <div className="ml-4 py-1">
                            {/* Folders List */}
                            <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
                              {folders.map((folder) => (
                                <FolderItem
                                  key={folder.id}
                                  folder={folder}
                                  expandedFolders={expandedFolders}
                                  toggleFolderExpanded={toggleFolderExpanded}
                                  requestsByCollection={requestsByCollection}
                                  activeRequestId={activeRequestId}
                                  activeRequestIsDirty={activeRequestIsDirty}
                                  onSelectRequest={onSelectRequest}
                                  onCreateRequest={onCreateRequest}
                                  onRenameFolder={onRenameFolder}
                                  onDuplicateFolder={onDuplicateFolder}
                                  onDeleteFolder={onDeleteFolder}
                                  onRunFolder={onRunFolder}
                                  openFolderMenuId={openFolderMenuId}
                                  setOpenFolderMenuId={setOpenFolderMenuId}
                                  openRequestMenuId={openRequestMenuId}
                                  setOpenRequestMenuId={setOpenRequestMenuId}
                                  requestMenuKey={requestMenuKey}
                                  onCopyRequest={onCopyRequest}
                                  onPasteRequest={onPasteRequest}
                                  onRenameRequest={onRenameRequest}
                                  onDuplicateRequest={onDuplicateRequest}
                                  onDeleteRequest={onDeleteRequest}
                                />
                              ))}
                            </SortableContext>

                            {/* Root Requests */}
                            <div className="mt-2 space-y-1">
                              <div className="px-4 py-1 flex items-center justify-between text-[10px] text-muted font-black uppercase tracking-widest opacity-60">
                                <span>Requests</span>
                                <div className="flex items-center space-x-1">
                                  <button onClick={() => onCreateFolder(collection.id)} className="p-0.5 hover:text-primary transition-colors">
                                    <FolderIcon size={12} />
                                  </button>
                                  <button onClick={() => onCreateRequest(collection.id, null)} className="p-0.5 hover:text-primary transition-colors">
                                    <Plus size={12} strokeWidth={3} />
                                  </button>
                                </div>
                              </div>

                              <SortableContext items={rootRequests.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                {rootRequests.map((request) => (
                                  <RequestItem
                                    key={request.id}
                                    request={request}
                                    activeRequestId={activeRequestId}
                                    activeRequestIsDirty={activeRequestIsDirty}
                                    onSelectRequest={onSelectRequest}
                                    setOpenRequestMenuId={setOpenRequestMenuId}
                                    openRequestMenuId={openRequestMenuId}
                                    requestMenuKey={requestMenuKey}
                                    onCopyRequest={onCopyRequest}
                                    onPasteRequest={onPasteRequest}
                                    onRenameRequest={onRenameRequest}
                                    onDuplicateRequest={onDuplicateRequest}
                                    onDeleteRequest={onDeleteRequest}
                                  />
                                ))}
                              </SortableContext>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </SortableContext>
              )}
            </div>
          </div>

          {isLoadingRequests && (
            <div className="px-4 py-2 text-[11px] text-muted italic animate-pulse">
              Syncing requests...
            </div>
          )}

          <div className="mt-auto px-4 py-4 border-t border-border space-y-2 text-[12px] text-muted font-medium">
            <div className="flex justify-between items-center">
              <span>Collections</span>
              <span>{collections.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Saved Requests</span>
              <span>{totalRequests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Online Peers</span>
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                <span>{peersCount}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Remote Collections Discovery */}
        {/* Remote Workspaces & Collections Discovery */}
        {(Object.entries(peerCollections).length > 0 || Object.entries(peerWorkspaces).length > 0) && (
          <div className="mt-8 pt-4 border-t border-white/5 bg-black/10">
            <div className="px-4 mb-4 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Network Discovery
              </h3>
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live
              </div>
            </div>

            <div className="space-y-4 px-2 pb-8 text-left">
              {Object.entries(peers).map(([peerName, _peerIp]) => {
                const workspaces = peerWorkspaces[peerName] || [];
                const collections = peerCollections[peerName] || [];

                if (workspaces.length === 0 && collections.length === 0) return null;

                return (
                  <div key={peerName} className="space-y-2">
                    <div className="px-2 py-1 flex items-center gap-2 border-l-2 border-primary/30 ml-1">
                      <Monitor size={12} className="text-primary/50" />
                      <span className="text-[11px] font-black text-white/70 uppercase tracking-wider truncate">
                        {peerName.split('.')[0]}
                      </span>
                    </div>

                    {workspaces.map(ws => {
                      const wsCols = collections.filter(c => c.workspace_id === ws.id);
                      return (
                        <div key={ws.id} className="ml-2 space-y-1">
                          <div className="px-2 py-1 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                            <Globe size={11} className="text-muted" />
                            <span className="text-[10px] font-bold text-muted truncate">{ws.name}</span>
                          </div>
                          {wsCols.map(col => (
                            <div
                              key={col.id}
                              className="group mx-2 pl-4 pr-1 py-1.5 rounded-md hover:bg-white/5 flex items-center justify-between border border-transparent hover:border-white/5 transition-all duration-200"
                            >
                              <span className="text-xs text-secondary truncate group-hover:text-white/90">
                                {col.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDownloadRequest(peerName, col.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-[10px] text-blue-400 border border-blue-500/20 active:scale-95 transition-all"
                              >
                                <Upload className="w-3 h-3 rotate-180" />
                                Request
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Show collections not linked to any shared workspace metadata yet */}
                    {collections.filter(c => !workspaces.some(ws => ws.id === c.workspace_id)).map(col => (
                      <div
                        key={col.id}
                        className="group mx-4 pl-4 pr-1 py-1.5 rounded-md hover:bg-white/5 flex items-center justify-between border border-transparent hover:border-white/5 transition-all duration-200"
                      >
                        <span className="text-xs text-secondary truncate group-hover:text-white/90">
                          {col.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadRequest(peerName, col.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-[10px] text-blue-400 border border-blue-500/20 active:scale-95 transition-all"
                        >
                          <Upload className="w-3 h-3 rotate-180" />
                          Request
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DragOverlay adjustScale={true}>
          {activeId && activeType === 'request' && activeItem && (
            <div className="flex items-center px-3 py-1.5 bg-[#2d2d2d] border border-primary/40 rounded shadow-2xl opacity-90 cursor-grabbing min-w-[180px] z-50 ring-1 ring-primary/20">
              <span className={`w-2 h-2 rounded-full mr-2 ${methodBgColor(activeItem.method)}`} />
              <span className="text-gray-200 text-[11px] font-medium truncate">{activeItem.name}</span>
            </div>
          )}
          {activeId && activeType === 'folder' && activeItem && (
            <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border border-primary/40 rounded shadow-2xl opacity-90 cursor-grabbing min-w-[220px] z-50 ring-1 ring-primary/20">
              <FolderIcon size={14} className="mr-2 text-primary" />
              <span className="text-gray-200 text-[12px] font-bold truncate">{activeItem.name}</span>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

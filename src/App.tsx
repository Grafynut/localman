import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CollectionsSidebar } from "./components/CollectionsSidebar";
import { Dialog, PromptDialog, ConfirmDialog } from "./components/Dialog";
import { RequestWorkspace } from "./components/RequestWorkspace";
import { ResponsePanel } from "./components/ResponsePanel";
import { RightInspector } from "./components/RightInspector";
import { TopBar } from "./components/TopBar";
import { ToastViewport, type ToastMessage } from "./components/ToastViewport";
import type {
  Collection,
  Folder,
  HttpResponseResult,
  KeyValuePair,
  ResponseState,
  ResponseTab,
  StoredRequest,
  SyncAction,
  SyncEntityType,
  SyncEvent,
  Workspace,
  WorkspaceTab,
} from "./types";
import {
  defaultHeaders,
  emptyKeyValueRow,
  generateId,
  headerRowsToObject,
  parseHeadersToRows,
} from "./utils";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

function App() {
  const LOCAL_USER_ID = "local_user_1";
  const INTERNAL_CLIPBOARD_KEY = "devcollab.internalClipboard";
  const DEVICE_ID_KEY = "devcollab.deviceId";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("default_workspace");
  const [foldersByCollection, setFoldersByCollection] = useState<Record<string, Folder[]>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [requestsByCollection, setRequestsByCollection] = useState<Record<string, StoredRequest[]>>({});
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [isSavingRequest, setIsSavingRequest] = useState(false);

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("Headers");
  const [respTab, setRespTab] = useState<ResponseTab>("Body");

  const [peers, setPeers] = useState<Record<string, string>>({});
  const [connectedPeerIps, setConnectedPeerIps] = useState<Record<string, boolean>>({});
  const [sharingPeerIp, setSharingPeerIp] = useState<string | null>(null);

  const [reqMethod, setReqMethod] = useState("GET");
  const [reqUrl, setReqUrl] = useState("/api/v1/users");
  const [reqBody, setReqBody] = useState(`{\n  "data": "56535353",\n  "users": {\n    "token": "api/v1/users"\n  }\n}`);
  const [reqParams, setReqParams] = useState<KeyValuePair[]>([emptyKeyValueRow()]);
  const [reqHeaders, setReqHeaders] = useState<KeyValuePair[]>(defaultHeaders());

  const [reqResponse, setReqResponse] = useState<ResponseState>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const syncQueueRef = useRef(Promise.resolve());
  const collectionsRef = useRef<Collection[]>([]);
  const activeCollectionIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "prompt" | "confirm";
    title: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    type: "prompt",
    title: "",
    onConfirm: () => {},
  });

  const localDeviceId = useMemo(() => {
    try {
      const existing = window.localStorage.getItem(DEVICE_ID_KEY);
      if (existing && existing.trim()) {
        return existing;
      }
      const created = `${Date.now()}-${generateId()}`;
      window.localStorage.setItem(DEVICE_ID_KEY, created);
      return created;
    } catch {
      return `${Date.now()}-${generateId()}`;
    }
  }, []);

  const activeCollection = useMemo(
    () => collections.find((collection) => collection.id === activeCollectionId) ?? null,
    [collections, activeCollectionId],
  );

  const activeRequests = useMemo(() => {
    if (!activeCollectionId) {
      return [];
    }
    return requestsByCollection[activeCollectionId] ?? [];
  }, [activeCollectionId, requestsByCollection]);

  const activeRequest = useMemo(
    () => activeRequests.find((request) => request.id === activeRequestId) ?? null,
    [activeRequests, activeRequestId],
  );

  const isDirty = useMemo(() => {
    if (!activeRequest) return false;

    const currentHeadersObj = headerRowsToObject(reqHeaders);
    const savedHeadersObj = activeRequest.headers ? JSON.parse(activeRequest.headers) : {};

    return (
      reqMethod !== activeRequest.method ||
      reqUrl !== activeRequest.url ||
      reqBody !== (activeRequest.body || "") ||
      JSON.stringify(currentHeadersObj) !== JSON.stringify(savedHeadersObj)
    );
  }, [activeRequest, reqMethod, reqUrl, reqBody, reqHeaders]);

  const workspaceOptions = useMemo(
    () => Array.from(new Set(collections.map((collection) => collection.name))).filter(Boolean),
    [collections],
  );

  useEffect(() => {
    void fetchCollections();

    const interval = setInterval(() => {
      invoke<Record<string, string>>("get_known_peers")
        .then((discoveredPeers) => {
          setPeers(discoveredPeers);
          const availableIps = new Set(Object.values(discoveredPeers));
          setConnectedPeerIps((prev) => {
            const next: Record<string, boolean> = {};
            Object.entries(prev).forEach(([ip, isConnected]) => {
              if (isConnected && availableIps.has(ip)) {
                next[ip] = true;
              }
            });
            return next;
          });
        })
        .catch(() => {
          setPeers({});
          setConnectedPeerIps({});
        });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeCollectionId) {
      setActiveRequestId(null);
      return;
    }
    void fetchRequests(activeCollectionId);
  }, [activeCollectionId]);

  useEffect(() => {
    activeCollectionIdRef.current = activeCollectionId;
  }, [activeCollectionId]);

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId;
  }, [activeRequestId]);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + S: Save
      if (isMod && e.key === "s") {
        e.preventDefault();
        handleSaveRequest();
      }

      // Ctrl/Cmd + Enter: Send
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        handleSendRequest();
      }

      // Ctrl/Cmd + N: New Request
      if (isMod && e.key === "n") {
        e.preventDefault();
        handleCreateRequestClick();
      }

      // Ctrl/Cmd + K: Focus Search
      if (isMod && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }

      // Ctrl/Cmd + \: Toggle Sidebar
      if (isMod && e.key === "\\") {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveRequest, handleSendRequest, handleCreateRequestClick]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen<SyncEvent>("sync_event_received", (event) => {
        syncQueueRef.current = syncQueueRef.current
          .then(() => applyRemoteSyncEvent(event.payload))
          .catch((error) => {
            console.error("Failed to apply remote sync event:", error);
          });
      });
    };

    void setup();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  function applyStoredRequest(request: StoredRequest) {
    setReqMethod(request.method || "GET");
    setReqUrl(request.url || "");
    setReqBody(request.body || "");
    setReqHeaders(parseHeadersToRows(request.headers));
  }

  function toggleCollectionExpanded(id: string) {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  function toggleFolderExpanded(id: string) {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  function connectedPeerList() {
    return Object.entries(connectedPeerIps)
      .filter(([, isConnected]) => isConnected)
      .map(([peerIp]) => peerIp);
  }

  function createSyncEvent(
    action: SyncAction,
    entityType: SyncEntityType,
    entityId: string,
    payload: unknown,
  ): SyncEvent {
    return {
      event_id: `${Date.now()}-${generateId()}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: JSON.stringify(payload ?? {}),
      timestamp: new Date().toISOString(),
      origin_device: localDeviceId,
    };
  }

  function buildPeerWsUrl(peerIp: string) {
    const raw = peerIp.trim().replace(/^\[|\]$/g, "");
    const host = raw.includes(":") ? `[${raw.replace(/%/g, "%25")}]` : raw;
    return `ws://${host}:8080/ws`;
  }

  async function sendSyncEventsToPeer(peerIp: string, events: SyncEvent[]) {
    if (events.length === 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new window.WebSocket(buildPeerWsUrl(peerIp));
      const timeout = window.setTimeout(() => {
        ws.close();
        reject(new Error(`Timed out connecting to ${peerIp}`));
      }, 5000);
      let settled = false;

      ws.onopen = () => {
        events.forEach((event) => ws.send(JSON.stringify(event)));
        window.setTimeout(() => {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            ws.close();
            resolve();
          }
        }, 120);
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(new Error(`Could not connect to ${peerIp}:8080`));
        }
      };

      ws.onclose = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  async function broadcastSyncEvent(
    action: SyncAction,
    entityType: SyncEntityType,
    entityId: string,
    payload: unknown,
  ) {
    const peerIps = connectedPeerList();
    if (peerIps.length === 0) {
      return;
    }

    const event = createSyncEvent(action, entityType, entityId, payload);
    const results = await Promise.allSettled(
      peerIps.map((peerIp) => sendSyncEventsToPeer(peerIp, [event])),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) {
      showToast({
        kind: "error",
        title: "Sync partially failed",
        description: `${failed} peer${failed === 1 ? "" : "s"} unreachable.`,
      });
    }
  }

  async function applyRemoteSyncEvent(event: SyncEvent) {
    if (event.origin_device === localDeviceId) {
      return;
    }

    let payload: Record<string, unknown> = {};
    if (event.payload && event.payload.trim()) {
      try {
        const parsed = JSON.parse(event.payload) as unknown;
        if (parsed && typeof parsed === "object") {
          payload = parsed as Record<string, unknown>;
        }
      } catch {
        payload = {};
      }
    }

    if (event.entity_type === "Collection") {
      if (event.action === "Delete") {
        try {
          await invoke("delete_collection", { id: event.entity_id });
        } catch {
          // Ignore missing rows.
        }
        setCollections((prev) => prev.filter((item) => item.id !== event.entity_id));
        setExpandedCollections((prev) => {
          const next = { ...prev };
          delete next[event.entity_id];
          return next;
        });
        setRequestsByCollection((prev) => {
          const next = { ...prev };
          delete next[event.entity_id];
          return next;
        });
        if (activeCollectionIdRef.current === event.entity_id) {
          setActiveCollectionId(null);
          setActiveRequestId(null);
        }
        return;
      }

      const name =
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name
          : `Shared Collection ${event.entity_id.slice(0, 4)}`;
      const ownerId =
        typeof payload.owner_id === "string" && payload.owner_id.trim()
          ? payload.owner_id
          : LOCAL_USER_ID;
      const upserted = await invoke<Collection>("upsert_collection", {
        id: event.entity_id,
        workspaceId: activeWorkspaceId,
        workspace_id: activeWorkspaceId,
        name,
        ownerId,
        owner_id: ownerId,
      });
      setCollections((prev) => {
        const idx = prev.findIndex((item) => item.id === upserted.id);
        if (idx === -1) {
          return [...prev, upserted];
        }
        const next = [...prev];
        next[idx] = upserted;
        return next;
      });
      setExpandedCollections((prev) => ({ ...prev, [upserted.id]: true }));
      return;
    }

    if (event.entity_type === "Request") {
      if (event.action === "Delete") {
        const payloadCollectionId =
          typeof payload.collection_id === "string" ? payload.collection_id : null;
        try {
          await invoke("delete_request", { id: event.entity_id });
        } catch {
          // Ignore missing rows.
        }
        setRequestsByCollection((prev) => {
          if (payloadCollectionId && prev[payloadCollectionId]) {
            return {
              ...prev,
              [payloadCollectionId]: prev[payloadCollectionId].filter(
                (request) => request.id !== event.entity_id,
              ),
            };
          }

          const next: Record<string, StoredRequest[]> = {};
          Object.entries(prev).forEach(([collectionId, requests]) => {
            next[collectionId] = requests.filter((request) => request.id !== event.entity_id);
          });
          return next;
        });
        if (activeRequestIdRef.current === event.entity_id) {
          setActiveRequestId(null);
        }
        return;
      }

      const collectionId =
        typeof payload.collection_id === "string" ? payload.collection_id : null;
      if (!collectionId) {
        return;
      }
      if (!collectionsRef.current.some((collection) => collection.id === collectionId)) {
        const placeholderCollection = await invoke<Collection>("upsert_collection", {
          id: collectionId,
          name: `Shared Collection ${collectionId.slice(0, 4)}`,
          ownerId: LOCAL_USER_ID,
          owner_id: LOCAL_USER_ID,
        });
        setCollections((prev) => {
          if (prev.some((collection) => collection.id === placeholderCollection.id)) {
            return prev;
          }
          return [...prev, placeholderCollection];
        });
      }
      const name =
        typeof payload.name === "string" && payload.name.trim()
          ? payload.name
          : "Shared Request";
      const method =
        typeof payload.method === "string" && payload.method.trim()
          ? payload.method.toUpperCase()
          : "GET";
      const url = typeof payload.url === "string" ? payload.url : "/";
      const headers = normalizeHeadersForStorage(payload.headers);
      const body = normalizeBodyForStorage(payload.body);
      const upserted = await invoke<StoredRequest>("upsert_request", {
        id: event.entity_id,
        collectionId,
        collection_id: collectionId,
        name,
        method,
        url,
        headers,
        body,
      });
      setRequestsByCollection((prev) => {
        const current = prev[upserted.collection_id] || [];
        const idx = current.findIndex((request) => request.id === upserted.id);
        if (idx === -1) {
          return { ...prev, [upserted.collection_id]: [upserted, ...current] };
        }
        const nextCollectionRequests = [...current];
        nextCollectionRequests[idx] = upserted;
        return { ...prev, [upserted.collection_id]: nextCollectionRequests };
      });
      if (activeRequestIdRef.current === upserted.id) {
        applyStoredRequest(upserted);
      }
    }
  }

  async function readTextFromClipboard() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  }

  function writeInternalClipboard(text: string) {
    try {
      window.localStorage.setItem(INTERNAL_CLIPBOARD_KEY, text);
    } catch {
      // Ignore storage write failures in constrained environments.
    }
  }

  function readInternalClipboard() {
    try {
      return window.localStorage.getItem(INTERNAL_CLIPBOARD_KEY) || "";
    } catch {
      return "";
    }
  }

  async function readClipboardPayload() {
    const text = await readTextFromClipboard();
    if (text.trim()) {
      return { text, source: "system" as const };
    }
    const fallback = readInternalClipboard();
    if (fallback.trim()) {
      return { text: fallback, source: "internal" as const };
    }
    return { text: "", source: "none" as const };
  }

  async function getPasteText(label: string) {
    const payload = await readClipboardPayload();
    if (payload.text.trim()) {
      return payload;
    }

    const manual = await new Promise<string | null>((resolve) => {
      openPrompt({
        title: label,
        description: "Clipboard read is blocked here. Paste JSON manually:",
        confirmLabel: "Paste",
        onConfirm: (val) => resolve(val)
      });
      // Handle cancellation somehow? Maybe adding an onClose to openPrompt.
      // For now, let's keep it simple as the user might not cancel this specific fallback.
    });

    if (manual && manual.trim()) {
      writeInternalClipboard(manual);
      return { text: manual, source: "manual" as const };
    }
    return { text: "", source: "none" as const };
  }

  async function copyTextToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  }

  function normalizeHeadersForStorage(headers: unknown): string | null {
    if (headers === null || headers === undefined) {
      return null;
    }
    if (typeof headers === "string") {
      return headers.trim() ? headers : null;
    }
    if (typeof headers === "object") {
      try {
        return JSON.stringify(headers);
      } catch {
        return null;
      }
    }
    return null;
  }

  function normalizeBodyForStorage(body: unknown): string | null {
    if (body === null || body === undefined) {
      return null;
    }
    if (typeof body === "string") {
      return body;
    }
    if (typeof body === "object") {
      try {
        return JSON.stringify(body, null, 2);
      } catch {
        return null;
      }
    }
    return String(body);
  }

  function toClipboardRequest(raw: unknown) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const item = raw as Record<string, unknown>;
    if (typeof item.url !== "string") {
      return null;
    }
    return {
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Pasted Request",
      method: typeof item.method === "string" && item.method.trim()
        ? item.method.toUpperCase()
        : "GET",
      url: item.url,
      headers: normalizeHeadersForStorage(item.headers),
      body: normalizeBodyForStorage(item.body),
    };
  }

  function getClipboardRequests(payload: unknown) {
    if (!payload || typeof payload !== "object") {
      return [];
    }
    const item = payload as Record<string, unknown>;
    if (item.kind === "request") {
      const request = toClipboardRequest(item.request);
      return request ? [request] : [];
    }
    if (Array.isArray(item.requests)) {
      return item.requests
        .map((entry) => toClipboardRequest(entry))
        .filter((request): request is NonNullable<typeof request> => Boolean(request));
    }
    const directRequest = toClipboardRequest(item);
    return directRequest ? [directRequest] : [];
  }

  async function fetchCollections() {
    try {
      const result = await invoke<Collection[]>("get_collections", {
        ownerId: LOCAL_USER_ID,
        owner_id: LOCAL_USER_ID,
      });

      setCollections(result);

      if (result.length === 0) {
        setActiveCollectionId(null);
        return;
      }

      setActiveCollectionId((prev) => {
        if (prev && result.some((collection) => collection.id === prev)) {
          return prev;
        }
        return result[0].id;
      });

      setExpandedCollections((prev) => {
        const next = { ...prev };
        result.forEach((collection) => {
          if (next[collection.id] === undefined) {
            next[collection.id] = collection.id === result[0].id;
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      showToast({
        kind: "error",
        title: "Failed to load collections",
        description: String(error),
      });
    }
  }

  // Fetch workspaces on mount
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const ws = await invoke<Workspace[]>("get_workspaces", { ownerId: "local_user_1" });
        setWorkspaces(ws);
        if (ws.length > 0 && !ws.find(w => w.id === activeWorkspaceId)) {
          setActiveWorkspaceId(ws[0].id);
        }
      } catch (err) {
        console.error("Failed to load workspaces:", err);
      }
    };
    loadWorkspaces();
  }, []);

  async function handleCreateWorkspace() {
    openPrompt({
      title: "New Workspace",
      description: "Enter a name for your new workspace.",
      placeholder: "e.g., Personal Projects",
      confirmLabel: "Create Workspace",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        try {
          const newWs = await invoke<Workspace>("create_workspace", {
            id: generateId(),
            name: name.trim(),
            ownerId: LOCAL_USER_ID,
            owner_id: LOCAL_USER_ID,
          });

          setWorkspaces((prev) => [...prev, newWs]);
          setActiveWorkspaceId(newWs.id);
          showToast({
            kind: "success",
            title: "Workspace created",
            description: newWs.name,
          });
        } catch (error) {
          console.error("Failed to create workspace:", error);
          showToast({
            kind: "error",
            title: "Error creating workspace",
            description: String(error),
          });
        }
      }
    });
  }

  const loadWorkspaceData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const cols = await invoke<Collection[]>("get_collections", { workspaceId: activeWorkspaceId });
      setCollections(cols);

      const folderData: Record<string, Folder[]> = {};
      for (const col of cols) {
        const folders = await invoke<Folder[]>("get_folders", { collectionId: col.id });
        folderData[col.id] = folders;
      }
      setFoldersByCollection(folderData);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    }
  }, [activeWorkspaceId]);

  // Fetch collections and folders when workspace changes
  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  async function fetchRequests(collectionId: string) {
    setIsLoadingRequests(true);
    try {
      const requests = await invoke<StoredRequest[]>("get_requests_by_collection", {
        collectionId,
        collection_id: collectionId,
      });

      setRequestsByCollection((prev) => ({ ...prev, [collectionId]: requests }));

      if (requests.length === 0) {
        setActiveRequestId(null);
        return;
      }

      if (!activeRequestId || !requests.some((request) => request.id === activeRequestId)) {
        setActiveRequestId(requests[0].id);
        applyStoredRequest(requests[0]);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      showToast({
        kind: "error",
        title: "Failed to load requests",
        description: String(error),
      });
    } finally {
      setIsLoadingRequests(false);
    }
  }

  const openPrompt = (config: Omit<typeof dialogState, "isOpen" | "type">) => {
    setDialogState({ ...config, isOpen: true, type: "prompt" });
  };

  const openConfirm = (config: Omit<typeof dialogState, "isOpen" | "type" | "onConfirm"> & { onConfirm: () => void }) => {
    setDialogState({ 
      ...config, 
      isOpen: true, 
      type: "confirm", 
      onConfirm: config.onConfirm 
    } as any);
  };

  async function handleMoveRequest(requestId: string, targetCollectionId: string, targetFolderId: string | null, targetPosition: number) {
    try {
      await invoke("update_request_location", {
        id: requestId,
        collectionId: targetCollectionId,
        collection_id: targetCollectionId,
        folderId: targetFolderId,
        folder_id: targetFolderId,
        position: targetPosition
      });

      // Identify source collection to refresh it as well
      const sourceCollectionId = Object.entries(requestsByCollection).find(
        ([_, reqs]) => reqs.some(r => r.id === requestId)
      )?.[0];

      setRequestsByCollection((prev) => {
        const next = { ...prev };
        delete next[targetCollectionId];
        if (sourceCollectionId) delete next[sourceCollectionId];
        return next;
      });

      await fetchRequests(targetCollectionId);
      if (sourceCollectionId && sourceCollectionId !== targetCollectionId) {
        await fetchRequests(sourceCollectionId);
      }
      
      void broadcastSyncEvent("Update", "Request", requestId, { 
        id: requestId, 
        collection_id: targetCollectionId, 
        folder_id: targetFolderId, 
        position: targetPosition 
      });

      showToast({
        kind: "success",
        title: "Request moved",
        description: "Organization updated successfully."
      });
    } catch (error) {
      console.error("Move request error:", error);
      showToast({
        kind: "error",
        title: "Error moving request",
        description: String(error),
      });
    }
  }

  async function handleMoveFolder(folderId: string, targetCollectionId: string, targetPosition: number) {
    try {
      // Identify source collection to refresh it as well
      const sourceCollectionId = Object.entries(foldersByCollection).find(
        ([_, folders]) => folders.some(f => f.id === folderId)
      )?.[0];

      await invoke("update_folder_location", {
        id: folderId,
        collectionId: targetCollectionId,
        collection_id: targetCollectionId,
        position: targetPosition
      });

      // Reload folders for target
      const targetFolders = await invoke<Folder[]>("get_folders", { collectionId: targetCollectionId });
      setFoldersByCollection(prev => ({
        ...prev,
        [targetCollectionId]: targetFolders
      }));

      // Reload folders for source if different
      if (sourceCollectionId && sourceCollectionId !== targetCollectionId) {
        const sourceFolders = await invoke<Folder[]>("get_folders", { collectionId: sourceCollectionId });
        setFoldersByCollection(prev => ({
          ...prev,
          [sourceCollectionId]: sourceFolders
        }));
      }

      showToast({
        kind: "success",
        title: "Folder moved",
        description: "Organizational hierarchy updated."
      });
    } catch (error) {
      console.error("Move folder error:", error);
      showToast({
        kind: "error",
        title: "Error moving folder",
        description: String(error),
      });
    }
  }

  async function handleCreateCollectionClick() {
    openPrompt({
      title: "New Collection",
      description: "Collections help you group related API requests together.",
      placeholder: "e.g., User API, Authentication",
      confirmLabel: "Create Collection",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        try {
          const newCollection = await invoke<Collection>("create_collection", {
            id: generateId(),
            workspaceId: activeWorkspaceId,
            workspace_id: activeWorkspaceId,
            name: name.trim(),
            ownerId: LOCAL_USER_ID,
            owner_id: LOCAL_USER_ID,
          });

          setCollections((prev) => [...prev, newCollection]);
          setRequestsByCollection((prev) => ({ ...prev, [newCollection.id]: [] }));
          setExpandedCollections((prev) => ({ ...prev, [newCollection.id]: true }));
          setActiveCollectionId(newCollection.id);
          setActiveRequestId(null);
          void broadcastSyncEvent("Create", "Collection", newCollection.id, newCollection);
          showToast({
            kind: "success",
            title: "Collection created",
            description: newCollection.name,
          });
        } catch (error) {
          showToast({
            kind: "error",
            title: "Error creating collection",
            description: String(error),
          });
        }
      }
    });
  }

  async function handleRenameCollection(collection: Collection) {
    openPrompt({
      title: "Rename Collection",
      defaultValue: collection.name,
      confirmLabel: "Rename",
      onConfirm: async (name) => {
        if (!name.trim() || name.trim() === collection.name) return;
        try {
          const updated = await invoke<Collection>("rename_collection", {
            id: collection.id,
            name: name.trim(),
          });
          setCollections((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          void broadcastSyncEvent("Update", "Collection", updated.id, updated);
          showToast({ kind: "success", title: "Collection renamed", description: updated.name });
        } catch (error) {
          showToast({ kind: "error", title: "Error renaming collection", description: String(error) });
        }
      }
    });
  }

  async function handleDuplicateCollection(collection: Collection) {
    openPrompt({
      title: "Duplicate Collection",
      description: "A copy of the collection will be created.",
      defaultValue: `${collection.name} Copy`,
      confirmLabel: "Duplicate",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        const newId = generateId();
        try {
          const duplicated = await invoke<Collection>("duplicate_collection", {
            sourceId: collection.id,
            source_id: collection.id,
            newId,
            new_id: newId,
            newName: name.trim(),
            new_name: name.trim(),
          });
          setCollections((prev) => [...prev, duplicated]);
          setExpandedCollections((prev) => ({ ...prev, [duplicated.id]: true }));
          setActiveCollectionId(duplicated.id);
          setActiveRequestId(null);
          await fetchRequests(duplicated.id);
          void broadcastSyncEvent("Create", "Collection", duplicated.id, duplicated);
          const duplicatedRequests = await invoke<StoredRequest[]>("get_requests_by_collection", {
            collectionId: duplicated.id,
            collection_id: duplicated.id,
          });
          duplicatedRequests.forEach((request) => {
            void broadcastSyncEvent("Create", "Request", request.id, request);
          });
          showToast({
            kind: "success",
            title: "Collection duplicated",
            description: duplicated.name,
          });
        } catch (error) {
          showToast({
            kind: "error",
            title: "Error duplicating collection",
            description: String(error),
          });
        }
      }
    });
  }

  async function handleDeleteCollection(collection: Collection) {
    openConfirm({
      title: "Delete Collection",
      description: `Are you sure you want to delete "${collection.name}"? This will permanently remove all requests within it.`,
      confirmLabel: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await invoke("delete_collection", { id: collection.id });
          const nextCollections = collections.filter((item) => item.id !== collection.id);
          setCollections(nextCollections);
          setRequestsByCollection((prev) => {
            const next = { ...prev };
            delete next[collection.id];
            return next;
          });
          setExpandedCollections((prev) => {
            const next = { ...prev };
            delete next[collection.id];
            return next;
          });

          if (activeCollectionId === collection.id) {
            const nextActive = nextCollections[0]?.id ?? null;
            setActiveCollectionId(nextActive);
            setActiveRequestId(null);
          }
          void broadcastSyncEvent("Delete", "Collection", collection.id, {
            id: collection.id,
          });
          showToast({ kind: "success", title: "Collection deleted", description: collection.name });
        } catch (error) {
          showToast({ kind: "error", title: "Error deleting collection", description: String(error) });
        }
      }
    });
  }

  async function handleCopyCollection(collection: Collection) {
    const payload = {
      kind: "collection",
      collection,
      requests: requestsByCollection[collection.id] || [],
    };
    const serialized = JSON.stringify(payload, null, 2);
    writeInternalClipboard(serialized);
    const copied = await copyTextToClipboard(serialized);
    if (copied) {
      showToast({ kind: "success", title: "Collection copied", description: collection.name });
    } else {
      showToast({
        kind: "info",
        title: "Copied in app",
        description: "System clipboard blocked; in-app paste is still available.",
      });
    }
  }

  function handleTogglePeerConnection(peerIp: string) {
    setConnectedPeerIps((prev) => ({ ...prev, [peerIp]: !prev[peerIp] }));
  }

  async function handleSharePeer(peerName: string, peerIp: string) {
    if (!activeCollection) {
      showToast({
        kind: "info",
        title: "Nothing to share",
        description: "Select a collection first.",
      });
      return;
    }

    setSharingPeerIp(peerIp);
    try {
      const requests = await invoke<StoredRequest[]>("get_requests_by_collection", {
        collectionId: activeCollection.id,
        collection_id: activeCollection.id,
      });
      const events: SyncEvent[] = [
        createSyncEvent("Create", "Collection", activeCollection.id, activeCollection),
        ...requests.map((request) => createSyncEvent("Create", "Request", request.id, request)),
      ];
      await sendSyncEventsToPeer(peerIp, events);
      setConnectedPeerIps((prev) => ({ ...prev, [peerIp]: true }));
      showToast({
        kind: "success",
        title: "Collection shared",
        description: `${activeCollection.name} -> ${peerName.split(".")[0]}`,
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Share failed",
        description: String(error),
      });
    } finally {
      setSharingPeerIp(null);
    }
  }

  async function handleCreateRequestClick(collectionIdArg?: string, folderId: string | null = null) {
    const collectionId = collectionIdArg || activeCollectionId;
    if (!collectionId) {
      showToast({
        kind: "info",
        title: "No active collection",
        description: "Create or select a collection first.",
      });
      return;
    }

    const requestCount = (requestsByCollection[collectionId] || []).filter(r => r.folder_id === folderId).length;
    openPrompt({
      title: "New Request",
      description: "Create a new API request to start testing your endpoints.",
      defaultValue: `New Request ${requestCount + 1}`,
      confirmLabel: "Create Request",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        setIsCreatingRequest(true);
        try {
          const headers = headerRowsToObject(reqHeaders);
          const created = await invoke<StoredRequest>("create_request", {
            id: uuidv4(),
            collectionId,
            collection_id: collectionId,
            folderId,
            folder_id: folderId,
            name: name.trim(),
            method: reqMethod,
            url: reqUrl,
            headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : null,
            body: reqBody || null,
            position: requestCount + 1
          });

          setRequestsByCollection((prev) => {
            const current = prev[collectionId] || [];
            return { ...prev, [collectionId]: [...current, created] };
          });
          setExpandedCollections((prev) => ({ ...prev, [collectionId]: true }));
          if (folderId) {
            setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
          }
          setActiveCollectionId(collectionId);
          setActiveRequestId(created.id);
          applyStoredRequest(created);
          void broadcastSyncEvent("Create", "Request", created.id, created);
          showToast({
            kind: "success",
            title: "Request created",
            description: `${created.method} ${created.name}`,
          });
        } catch (error) {
          showToast({
            kind: "error",
            title: "Error creating request",
            description: String(error),
          });
        } finally {
          setIsCreatingRequest(false);
        }
      }
    });
  }

  async function handleRenameRequest(request: StoredRequest) {
    openPrompt({
      title: "Rename Request",
      defaultValue: request.name,
      confirmLabel: "Rename",
      onConfirm: async (name) => {
        if (!name.trim() || name.trim() === request.name) return;
        try {
          const updated = await invoke<StoredRequest>("rename_request", {
            id: request.id,
            name: name.trim(),
          });
          setRequestsByCollection((prev) => {
            const current = prev[updated.collection_id] || [];
            return {
              ...prev,
              [updated.collection_id]: current.map((item) => (item.id === updated.id ? updated : item)),
            };
          });
          if (activeRequestId === updated.id) {
            setActiveRequestId(updated.id);
          }
          void broadcastSyncEvent("Update", "Request", updated.id, updated);
          showToast({ kind: "success", title: "Request renamed", description: updated.name });
        } catch (error) {
          showToast({ kind: "error", title: "Error renaming request", description: String(error) });
        }
      }
    });
  }

  async function handleDuplicateRequest(request: StoredRequest) {
    openPrompt({
      title: "Duplicate Request",
      defaultValue: `${request.name} Copy`,
      confirmLabel: "Duplicate",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        const newId = generateId();
        try {
          const duplicated = await invoke<StoredRequest>("duplicate_request", {
            sourceId: request.id,
            source_id: request.id,
            newId,
            new_id: newId,
            newName: name.trim(),
            new_name: name.trim(),
          });
          setRequestsByCollection((prev) => {
            const current = prev[duplicated.collection_id] || [];
            return { ...prev, [duplicated.collection_id]: [duplicated, ...current] };
          });
          setExpandedCollections((prev) => ({ ...prev, [duplicated.collection_id]: true }));
          setActiveCollectionId(duplicated.collection_id);
          setActiveRequestId(duplicated.id);
          applyStoredRequest(duplicated);
          void broadcastSyncEvent("Create", "Request", duplicated.id, duplicated);
          showToast({
            kind: "success",
            title: "Request duplicated",
            description: `${duplicated.method} ${duplicated.name}`,
          });
        } catch (error) {
          showToast({ kind: "error", title: "Error duplicating request", description: String(error) });
        }
      }
    });
  }

  async function handleDeleteRequest(request: StoredRequest) {
    openConfirm({
      title: "Delete Request",
      description: `Are you sure you want to delete "${request.name}"?`,
      confirmLabel: "Delete",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await invoke("delete_request", { id: request.id });
          const current = requestsByCollection[request.collection_id] || [];
          const remaining = current.filter((item) => item.id !== request.id);
          setRequestsByCollection((prev) => ({ ...prev, [request.collection_id]: remaining }));

          if (activeRequestId === request.id) {
            const nextActive = remaining[0] || null;
            setActiveRequestId(nextActive?.id || null);
            if (nextActive) {
              applyStoredRequest(nextActive);
            }
          }
          void broadcastSyncEvent("Delete", "Request", request.id, {
            id: request.id,
            collection_id: request.collection_id,
          });
          showToast({ kind: "success", title: "Request deleted", description: request.name });
        } catch (error) {
          showToast({ kind: "error", title: "Error deleting request", description: String(error) });
        }
      }
    });
  }

  async function handleCopyRequest(request: StoredRequest) {
    let parsedHeaders: unknown = request.headers;
    if (request.headers) {
      try {
        parsedHeaders = JSON.parse(request.headers);
      } catch {
        parsedHeaders = request.headers;
      }
    }
    const payload = {
      kind: "request",
      request: {
        ...request,
        headers: parsedHeaders,
      },
    };
    const serialized = JSON.stringify(payload, null, 2);
    writeInternalClipboard(serialized);
    const copied = await copyTextToClipboard(serialized);
    if (copied) {
      showToast({ kind: "success", title: "Request copied", description: request.name });
    } else {
      showToast({
        kind: "info",
        title: "Copied in app",
        description: "System clipboard blocked; in-app paste is still available.",
      });
    }
  }

  async function handlePasteCollection() {
    const { text, source } = await getPasteText("Paste Collection");
    if (!text.trim()) {
      showToast({
        kind: "info",
        title: "Clipboard is empty",
        description: "Copy a collection payload and try again.",
      });
      return;
    }

    if (source === "internal") {
      showToast({
        kind: "info",
        title: "Using in-app clipboard",
        description: "System clipboard access is blocked in this environment.",
      });
    } else if (source === "manual") {
      showToast({
        kind: "info",
        title: "Using manual paste",
        description: "Pasted from prompt input.",
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      showToast({
        kind: "error",
        title: "Invalid clipboard data",
        description: "Clipboard content is not valid JSON.",
      });
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      showToast({
        kind: "error",
        title: "Invalid collection payload",
        description: "No collection data found in clipboard.",
      });
      return;
    }

    const payload = parsed as Record<string, unknown>;
    const sourceCollection = payload.collection && typeof payload.collection === "object"
      ? (payload.collection as Record<string, unknown>)
      : payload;
    const baseName = typeof sourceCollection.name === "string" && sourceCollection.name.trim()
      ? sourceCollection.name.trim()
      : "Pasted Collection";

    openPrompt({
      title: "Paste Collection",
      description: "Customize the name of the collection you are about to paste.",
      defaultValue: `${baseName} Copy`,
      confirmLabel: "Paste Collection",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        try {
          const createdCollection = await invoke<Collection>("create_collection", {
            id: generateId(),
            workspaceId: activeWorkspaceId,
            workspace_id: activeWorkspaceId,
            name: name.trim(),
            ownerId: LOCAL_USER_ID,
            owner_id: LOCAL_USER_ID,
          });

          setCollections((prev) => [...prev, createdCollection]);
          setRequestsByCollection((prev) => ({ ...prev, [createdCollection.id]: [] }));
          setExpandedCollections((prev) => ({ ...prev, [createdCollection.id]: true }));
          setActiveCollectionId(createdCollection.id);
          setActiveRequestId(null);

          const requestsToCreate = getClipboardRequests(parsed);
          let createdCount = 0;
          const createdRequests: StoredRequest[] = [];
          for (const request of requestsToCreate) {
            const created = await invoke<StoredRequest>("create_request", {
              id: generateId(),
              collectionId: createdCollection.id,
              collection_id: createdCollection.id,
              name: request.name,
              method: request.method,
              url: request.url,
              headers: request.headers,
              body: request.body,
            });
            createdRequests.push(created);
            createdCount += 1;
          }

          await fetchRequests(createdCollection.id);
          void broadcastSyncEvent("Create", "Collection", createdCollection.id, createdCollection);
          createdRequests.forEach((request) => {
            void broadcastSyncEvent("Create", "Request", request.id, request);
          });
          showToast({
            kind: "success",
            title: "Collection pasted",
            description: `${createdCollection.name}${createdCount > 0 ? ` (${createdCount} requests)` : ""}`,
          });
        } catch (error) {
          showToast({
            kind: "error",
            title: "Error pasting collection",
            description: String(error),
          });
        }
      }
    });
  }

  async function handlePasteRequest(collectionId: string) {
    const { text, source } = await getPasteText("Paste Request");
    if (!text.trim()) {
      showToast({
        kind: "info",
        title: "Clipboard is empty",
        description: "Copy a request payload and try again.",
      });
      return;
    }

    if (source === "internal") {
      showToast({
        kind: "info",
        title: "Using in-app clipboard",
        description: "System clipboard access is blocked in this environment.",
      });
    } else if (source === "manual") {
      showToast({
        kind: "info",
        title: "Using manual paste",
        description: "Pasted from prompt input.",
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      showToast({
        kind: "error",
        title: "Invalid clipboard data",
        description: "Clipboard content is not valid JSON.",
      });
      return;
    }

    const requestsToCreate = getClipboardRequests(parsed);
    if (requestsToCreate.length === 0) {
      showToast({
        kind: "info",
        title: "No request data found",
        description: "Copy a request and try again.",
      });
      return;
    }

    try {
      let lastCreated: StoredRequest | null = null;
      const createdRequests: StoredRequest[] = [];
      for (const request of requestsToCreate) {
        const baseName = request.name || "Pasted Request";
        lastCreated = await invoke<StoredRequest>("create_request", {
          id: generateId(),
          collectionId,
          collection_id: collectionId,
          name: `${baseName} Copy`,
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
        });
        createdRequests.push(lastCreated);
      }

      await fetchRequests(collectionId);
      setExpandedCollections((prev) => ({ ...prev, [collectionId]: true }));
      setActiveCollectionId(collectionId);
      if (lastCreated) {
        setActiveRequestId(lastCreated.id);
        applyStoredRequest(lastCreated);
      }
      createdRequests.forEach((request) => {
        void broadcastSyncEvent("Create", "Request", request.id, request);
      });
      showToast({
        kind: "success",
        title: "Request pasted",
        description: `${requestsToCreate.length} request${requestsToCreate.length === 1 ? "" : "s"} added`,
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Error pasting request",
        description: String(error),
      });
    }
  }

  async function handleSendRequest() {
    if (!reqUrl.trim()) {
      return;
    }

    setIsSending(true);
    setReqResponse(null);
    setRespTab("Body");

    const headers = headerRowsToObject(reqHeaders);

    let finalUrl = reqUrl.startsWith("http")
      ? reqUrl
      : `https://jsonplaceholder.typicode.com${reqUrl.startsWith("/") ? reqUrl : `/${reqUrl}`}`;

    const queryParams = new URLSearchParams();
    reqParams.forEach((param) => {
      if (param.enabled && param.key.trim()) {
        queryParams.append(param.key.trim(), param.value);
      }
    });

    const queryString = queryParams.toString();
    if (queryString) {
      finalUrl += finalUrl.includes("?") ? `&${queryString}` : `?${queryString}`;
    }

    try {
      const response = await invoke<HttpResponseResult>("execute_request", {
        params: {
          method: reqMethod,
          url: finalUrl,
          headers: Object.keys(headers).length > 0 ? headers : null,
          body: reqMethod === "GET" ? null : reqBody,
        },
      });
      setReqResponse(response);
    } catch (error) {
      setReqResponse({
        error: String(error),
        status: 0,
        headers: {},
        body: "",
        time_ms: 0,
      });
      showToast({
        kind: "error",
        title: "Request failed",
        description: String(error),
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveRequest() {
    if (!activeCollectionId) {
      showToast({
        kind: "info",
        title: "No active collection",
        description: "Create or select a collection first.",
      });
      return;
    }

    if (!activeRequestId) {
      await handleCreateRequestClick();
      return;
    }

    setIsSavingRequest(true);
    try {
      const headers = headerRowsToObject(reqHeaders);
      const updated = await invoke<StoredRequest>("update_request", {
        id: activeRequestId,
        name: activeRequest?.name || "Untitled Request",
        method: reqMethod,
        url: reqUrl,
        headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : null,
        body: reqBody || null,
      });

      setRequestsByCollection((prev) => {
        const current = prev[activeCollectionId] || [];
        return {
          ...prev,
          [activeCollectionId]: current.map((request) =>
            request.id === updated.id ? updated : request,
          ),
        };
      });
      applyStoredRequest(updated);
      void broadcastSyncEvent("Update", "Request", updated.id, updated);
      showToast({
        kind: "success",
        title: "Request saved",
        description: `${updated.method} ${updated.url}`,
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Error saving request",
        description: String(error),
      });
    } finally {
      setIsSavingRequest(false);
    }
  }

  const peersCount = Object.keys(peers).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-gray-200 font-sans overflow-hidden">
      <TopBar
        peersCount={peersCount}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        onCreateWorkspace={handleCreateWorkspace}
      />

      <div className="flex-1 flex overflow-hidden">
        {isSidebarVisible && (
          <CollectionsSidebar
            collections={collections}
            foldersByCollection={foldersByCollection}
            activeCollectionId={activeCollectionId}
            setActiveCollectionId={setActiveCollectionId}
            expandedCollections={expandedCollections}
            toggleCollectionExpanded={toggleCollectionExpanded}
            expandedFolders={expandedFolders}
            toggleFolderExpanded={toggleFolderExpanded}
            requestsByCollection={requestsByCollection}
            activeRequestId={activeRequestId}
            activeRequestIsDirty={isDirty}
            onSelectRequest={(request) => {
              setActiveRequestId(request.id);
              applyStoredRequest(request);
            }}
            onCreateCollection={handleCreateCollectionClick}
            onCreateFolder={(collectionId) => {
              openPrompt({
                title: "New Folder",
                description: "Group requests within your collection.",
                confirmLabel: "Create Folder",
                placeholder: "e.g., Auth, Payments",
                onConfirm: async (name) => {
                  if (!name) return;
                  try {
                    const folder = await invoke<Folder>("create_folder", {
                      id: uuidv4(),
                      collectionId,
                      name,
                      position: (foldersByCollection[collectionId]?.length || 0) + 1
                    });
                    setFoldersByCollection(prev => ({
                      ...prev,
                      [collectionId]: [...(prev[collectionId] || []), folder]
                    }));
                    setExpandedFolders(prev => ({ ...prev, [folder.id]: true }));
                  } catch (err) {
                    console.error("Failed to create folder:", err);
                  }
                }
              });
            }}
            onCreateRequest={handleCreateRequestClick}
            onCopyCollection={handleCopyCollection}
            onPasteCollection={handlePasteCollection}
            onRenameCollection={handleRenameCollection}
            onDuplicateCollection={handleDuplicateCollection}
            onDeleteCollection={handleDeleteCollection}
            onRenameFolder={(folder) => {
              openPrompt({
                title: "Rename Folder",
                defaultValue: folder.name,
                confirmLabel: "Rename",
                onConfirm: async (name) => {
                  if (!name || name === folder.name) return;
                  try {
                    const updated = await invoke<Folder>("rename_folder", { id: folder.id, name });
                    setFoldersByCollection(prev => ({
                      ...prev,
                      [folder.collection_id]: (prev[folder.collection_id] || []).map(f => f.id === updated.id ? updated : f)
                    }));
                  } catch (err) {
                    console.error("Failed to rename folder:", err);
                  }
                }
              });
            }}
            onDeleteFolder={(folder) => {
              openConfirm({
                title: "Delete Folder",
                description: `Are you sure you want to delete "${folder.name}"? This will also remove all requests inside this folder.`,
                confirmLabel: "Delete",
                isDestructive: true,
                onConfirm: async () => {
                  try {
                    await invoke("delete_folder", { id: folder.id });
                    setFoldersByCollection(prev => ({
                      ...prev,
                      [folder.collection_id]: (prev[folder.collection_id] || []).filter(f => f.id !== folder.id)
                    }));
                    setRequestsByCollection(prev => ({
                      ...prev,
                      [folder.collection_id]: (prev[folder.collection_id] || []).filter(r => r.folder_id !== folder.id)
                    }));
                  } catch (err) {
                    console.error("Failed to delete folder:", err);
                  }
                }
              });
            }}
            onMoveFolder={handleMoveFolder}
            onMoveRequest={handleMoveRequest}
            onCopyRequest={handleCopyRequest}
            onPasteRequest={handlePasteRequest}
            onRenameRequest={handleRenameRequest}
            onDuplicateRequest={handleDuplicateRequest}
            onDeleteRequest={handleDeleteRequest}
            isLoadingRequests={isLoadingRequests}
            isCreatingRequest={isCreatingRequest}
            peersCount={peersCount}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <RequestWorkspace
            activeCollectionName={activeCollection?.name || ""}
            activeRequestName={activeRequest?.name || ""}
            isDirty={isDirty}
            isCreatingRequest={isCreatingRequest}
            isSavingRequest={isSavingRequest}
            onCreateRequest={() => {
              void handleCreateRequestClick();
            }}
            onSaveRequest={() => {
              void handleSaveRequest();
            }}
            reqMethod={reqMethod}
            setReqMethod={setReqMethod}
            reqUrl={reqUrl}
            setReqUrl={setReqUrl}
            reqBody={reqBody}
            setReqBody={setReqBody}
            reqParams={reqParams}
            setReqParams={setReqParams}
            reqHeaders={reqHeaders}
            setReqHeaders={setReqHeaders}
            activeWorkspaceTab={activeWorkspaceTab}
            setActiveWorkspaceTab={setActiveWorkspaceTab}
            isSending={isSending}
            onSendRequest={() => {
              void handleSendRequest();
            }}
          />

          <ResponsePanel
            reqResponse={reqResponse}
            isSending={isSending}
            respTab={respTab}
            setRespTab={setRespTab}
          />
        </div>

        <RightInspector
          peers={peers}
          activeCollectionName={activeCollection?.name || ""}
          activeRequestsCount={activeRequests.length}
          connectedPeerIps={connectedPeerIps}
          sharingPeerIp={sharingPeerIp}
          onTogglePeerConnection={handleTogglePeerConnection}
          onSharePeer={handleSharePeer}
        />
      </div>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      {dialogState.isOpen && dialogState.type === "prompt" && (
        <PromptDialog
          isOpen={dialogState.isOpen}
          onClose={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
          title={dialogState.title}
          description={dialogState.description}
          defaultValue={dialogState.defaultValue}
          onConfirm={dialogState.onConfirm}
          placeholder={dialogState.placeholder}
          confirmLabel={dialogState.confirmLabel}
        />
      )}

      {dialogState.isOpen && dialogState.type === "confirm" && (
        <ConfirmDialog
          isOpen={dialogState.isOpen}
          onClose={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
          title={dialogState.title}
          description={dialogState.description || ""}
          onConfirm={() => dialogState.onConfirm("")}
          confirmLabel={dialogState.confirmLabel}
          isDestructive={dialogState.isDestructive}
        />
      )}
    </div>
  );
}

export default App;

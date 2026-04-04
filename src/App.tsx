import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { CollectionsSidebar } from "./components/CollectionsSidebar";
import { PromptDialog, ConfirmDialog } from "./components/Dialog";
import { RequestWorkspace } from "./components/RequestWorkspace";
import { ResponsePanel } from "./components/ResponsePanel";
import { RightInspector } from "./components/RightInspector";
import { TopBar } from "./components/TopBar";
import { RequestTabs } from "./components/RequestTabs";
import { WebSocketWorkspace } from "./components/WebSocketWorkspace";
import { ToastViewport, type ToastMessage } from "./components/ToastViewport";
import type {
  Collection,
  Folder,
  HttpResponseResult,
  StoredRequest,
  SyncAction,
  SyncEntityType,
  SyncEvent,
  Workspace,
  WorkspaceTab,
  Environment,
  TabState,
  HistoryEntry,
  RunnerStatus,
  RunnerReport,
  RunnerResult,
} from "./types";
import { CollectionRunnerModal, type RunnerConfig } from "./components/CollectionRunnerModal";
import {
  emptyKeyValueRow,
  generateId,
  headerRowsToObject,
  parseHeadersToRows,
  parseFormDataToRows,
  resolveVariables,
} from "./utils";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { ImportModal } from "./components/ImportModal";
import { HistoryPanel } from "./components/HistoryPanel";
import { CodeSnippetModal } from "./components/CodeSnippetModal";
import { GlobalVariablesModal } from "./components/GlobalVariablesModal";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { v4 as uuidv4 } from "uuid";
import { parseCurl, parsePostman } from "./utils";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import { executeScript } from "./utils/sandbox";
import { Play } from "lucide-react";

function App() {
  const LOCAL_USER_ID = "local_user_1";
  const INTERNAL_CLIPBOARD_KEY = "localman.internalClipboard";
  const DEVICE_ID_KEY = "localman.deviceId";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("default_workspace");
  const [foldersByCollection, setFoldersByCollection] = useState<Record<string, Folder[]>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [requestsByCollection, setRequestsByCollection] = useState<Record<string, StoredRequest[]>>({});

  // Tab State
  const [openTabs, setOpenTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSavingRequest, setIsSavingRequest] = useState(false);


  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("Headers");

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null);
  const [isEnvManagerOpen, setIsEnvManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isCodeSnippetOpen, setIsCodeSnippetOpen] = useState(false);
  const [isGlobalsModalOpen, setIsGlobalsModalOpen] = useState(false);

  const [responseHeight, setResponseHeight] = useState(() => {
    const saved = localStorage.getItem("localman.responseHeight");
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isResizing, setIsResizing] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("localman.sidebarWidth");
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const [peers, setPeers] = useState<Record<string, string>>({});
  const [localIdentity, setLocalIdentity] = useState<{ instance_name: string; ip_address: string } | null>(null);
  const [connectedPeerIps, setConnectedPeerIps] = useState<Record<string, boolean>>({});
  const [sharingPeerIp, setSharingPeerIp] = useState<string | null>(null);
  const [peerCollections, setPeerCollections] = useState<Record<string, Array<{id: string, name: string, owner_id: string}>>>({});

  const [isSending, setIsSending] = useState(false);
  const [globals, setGlobals] = useState<Record<string, string>>({});
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isInspectorVisible, setIsInspectorVisible] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const collectionsRef = useRef<Collection[]>([]);
  const toastsRef = useRef<ToastMessage[]>([]);
  const syncQueueRef = useRef(Promise.resolve());

  // Runner State
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);
  const [runnerTitle, setRunnerTitle] = useState("");
  const [runnerRequests, setRunnerRequests] = useState<StoredRequest[]>([]);
  const [runnerStatus, setRunnerStatus] = useState<RunnerStatus>("idle");
  const [runnerReport, setRunnerReport] = useState<RunnerReport | null>(null);
  const runnerStopRef = useRef(false);
  const runnerPauseRef = useRef(false);
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
    onConfirm: () => { },
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

  useEffect(() => {
    localStorage.setItem("localman.globals", JSON.stringify(globals));
  }, [globals]);

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

  const activeTab = useMemo(
    () => openTabs.find((tab) => tab.id === activeTabId) ?? null,
    [openTabs, activeTabId],
  );

  const activeRequest = useMemo(() => {
    if (!activeTab) return null;
    return activeRequests.find((r) => r.id === activeTab.requestId) ?? null;
  }, [activeTab, activeRequests]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newToast = { id, ...toast };
    toastsRef.current = [...toastsRef.current, newToast];
    setToasts(toastsRef.current); // Trigger re-render

    setTimeout(() => {
      toastsRef.current = toastsRef.current.filter((item) => item.id !== id);
      setToasts(toastsRef.current); // Trigger re-render
    }, 3800);
  }, []);

  async function handleExportWorkspace() {
    try {
      const workspaceData = {
        collections,
        folders: foldersByCollection,
        requests: requestsByCollection,
        environments,
      };

      const path = await save({
        filters: [{
          name: 'Workspace JSON',
          extensions: ['json']
        }],
        defaultPath: "localman-workspace.json"
      });

      if (!path) return;

      await writeTextFile(path, JSON.stringify(workspaceData, null, 2));

      showToast({
        kind: "success",
        title: "Workspace Exported",
        description: `Successfully exported to ${path}`,
      });
    } catch (err) {
      console.error("Failed to export workspace:", err);
      showToast({
        kind: "error",
        title: "Export Failed",
        description: String(err),
      });
    }
  }

  async function handleImportWorkspace() {
    try {
      const path = await open({
        filters: [{
          name: 'Workspace JSON',
          extensions: ['json']
        }],
        multiple: false,
      });

      if (!path) return;

      const contents = await readTextFile(path as string);
      const parsed = JSON.parse(contents);

      if (!parsed.collections) {
        throw new Error("Invalid workspace file format");
      }

      openConfirm({
        title: "Import Workspace",
        description: "This will merge the imported collections, folders, requests, and environments into your current workspace. Do you want to proceed?",
        confirmLabel: "Import",
        onConfirm: async () => {
          try {
            // Import Collections
            for (const col of (parsed.collections || [])) {
              if (!collections.some(c => c.id === col.id)) {
                await invoke("create_collection", { ...col, workspaceId: activeWorkspaceId, workspace_id: activeWorkspaceId });
              }
            }

            // Import Folders
            for (const [colId, folders] of Object.entries(parsed.folders || {})) {
              for (const folder of (folders as any[])) {
                await invoke("create_folder", { ...folder, collectionId: colId });
              }
            }

            // Import Requests
            for (const [colId, requests] of Object.entries(parsed.requests || {})) {
              for (const req of (requests as any[])) {
                await invoke("create_request", { ...req, collectionId: colId, collection_id: colId });
              }
            }

            // Import Environments
            for (const env of (parsed.environments || [])) {
              if (!environments.some(e => e.id === env.id)) {
                await invoke("create_environment", { ...env, workspaceId: activeWorkspaceId, workspace_id: activeWorkspaceId, isActive: false, is_active: false });
              }
            }

            await fetchCollections(activeWorkspaceId);
            await fetchEnvironments(activeWorkspaceId);

            showToast({
              kind: "success",
              title: "Workspace Imported",
              description: "Successfully merged imported data.",
            });
          } catch (importErr) {
            console.error("Import merge error:", importErr);
            showToast({
              kind: "error",
              title: "Import Failed",
              description: String(importErr),
            });
          }
        }
      });
    } catch (err) {
      console.error("Failed to import workspace:", err);
      showToast({
        kind: "error",
        title: "Import Failed",
        description: String(err),
      });
    }
  }

  const isDirty = useMemo(() => {
    if (!activeTab || !activeRequest) return false;

    const currentHeadersObj = headerRowsToObject(activeTab.headers);
    const savedHeadersObj = activeRequest.headers ? JSON.parse(activeRequest.headers) : {};

    return (
      activeTab.method !== activeRequest.method ||
      activeTab.url !== activeRequest.url ||
      (activeTab.body || "") !== (activeRequest.body || "") ||
      JSON.stringify(currentHeadersObj) !== JSON.stringify(savedHeadersObj) ||
      (activeTab.preRequestScript || "") !== (activeRequest.pre_request_script || "") ||
      (activeTab.postRequestScript || "") !== (activeRequest.post_request_script || "")
    );
  }, [activeTab, activeRequest]);

  // Update tab dirty state whenever it changes
  useEffect(() => {
    if (activeTabId) {
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, isDirty } : tab
        )
      );
    }
  }, [isDirty, activeTabId]);

  // --- LIVE SYNC DEBOUNCE ---
  useEffect(() => {
    if (!activeTab || !activeTab.requestId || !activeTab.isDirty) return;

    const handler = setTimeout(() => {
      // Create a payload similar to what save would send, but only for sync
      const syncPayload = {
        id: activeTab.requestId,
        name: activeTab.name,
        method: activeTab.method,
        url: activeTab.url,
        headers: JSON.stringify(headerRowsToObject(activeTab.headers)),
        body: activeTab.body,
        body_type: activeTab.bodyType,
        form_data: JSON.stringify(activeTab.formData),
        binary_file_path: activeTab.binaryFilePath,
        collection_id: activeCollectionId,
      };

      void broadcastSyncEvent("Update", "Request", activeTab.requestId, syncPayload, true);
    }, 1000); // 1s debounce to avoid flooding network

    return () => clearTimeout(handler);
  }, [
    activeTab?.requestId,
    activeTab?.url,
    activeTab?.method,
    activeTab?.body,
    activeTab?.headers,
    activeTab?.bodyType,
    activeTab?.formData,
    activeTab?.binaryFilePath,
    activeTab?.isDirty
  ]);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizing && !isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
          setResponseHeight(newHeight);
        }
      } else if (isResizingSidebar) {
        const newWidth = e.clientX;
        if (newWidth > 200 && newWidth < 400) {
          setSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem("localman.responseHeight", responseHeight.toString());
      }
      if (isResizingSidebar) {
        setIsResizingSidebar(false);
        localStorage.setItem("localman.sidebarWidth", sidebarWidth.toString());
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isResizingSidebar, responseHeight, sidebarWidth]);

  useEffect(() => {
    invoke<any>("get_local_identity")
      .then((id) => setLocalIdentity(id))
      .catch((e) => console.error("Failed to fetch local identity:", e));

    let unlisten: any;
    listen<Record<string, string>>("peers_updated", (event) => {
      const discoveredPeers = event.payload;
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
    }).then((u) => (unlisten = u));

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      void fetchEnvironments(activeWorkspaceId);
      void fetchCollections(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  async function fetchEnvironments(workspaceId: string) {
    try {
      const data = await invoke<Environment[]>("get_environments", { workspaceId });
      setEnvironments(data);
      const active = data.find(e => e.is_active);
      if (active) setActiveEnvId(active.id);
    } catch (error) {
      console.error("Failed to fetch environments:", error);
    }
  }

  useEffect(() => {
    if (!activeCollectionId) {
      if (openTabs.length === 0) {
        // No active collection and no tabs, nothing to fetch
        return;
      }
    }
    if (activeCollectionId) {
      void fetchRequests(activeCollectionId);
    }
  }, [activeCollectionId]); // removed openTabs from deps to prevent infinite loop

  useEffect(() => {
    activeCollectionIdRef.current = activeCollectionId;
  }, [activeCollectionId]);

  useEffect(() => {
    activeRequestIdRef.current = activeTab?.requestId ?? null;
  }, [activeTab?.requestId]);

  useEffect(() => {
    collectionsRef.current = collections;
  }, [collections]);

  const handleCreateRequestClick = useCallback(async (collectionIdArg?: string, folderId: string | null = null) => {
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
        try {
          const requestId = generateId();
          const created = await invoke<StoredRequest>("create_request", {
            id: requestId,
            collectionId,
            folderId,
            name: name.trim(),
            method: "GET", // Default method
            url: "", // Default URL
            headers: null, // Default headers
            body: null, // Default body
            params: null, // Default params
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
        }
      }
    });
  }, [activeCollectionId, requestsByCollection, showToast, broadcastSyncEvent, applyStoredRequest]);

  const handleRunCollection = (collection: Collection) => {
    const colReqs = requestsByCollection[collection.id] || [];
    setRunnerTitle(collection.name);
    setRunnerRequests(colReqs);
    setRunnerReport(null);
    setRunnerStatus("idle");
    setIsRunnerOpen(true);
  };

  const handleRunFolder = (folder: Folder) => {
    const folderReqs = (requestsByCollection[folder.collection_id] || []).filter(r => r.folder_id === folder.id);
    setRunnerTitle(folder.name);
    setRunnerRequests(folderReqs);
    setRunnerReport(null);
    setRunnerStatus("idle");
    setIsRunnerOpen(true);
  };

  const executeCollectionRun = async (config: RunnerConfig) => {
    setRunnerStatus("running");
    runnerStopRef.current = false;
    runnerPauseRef.current = false;

    const results: RunnerResult[] = [];
    let totalTime = 0;
    let passedCount = 0;
    let failedCount = 0;

    const runRequests = runnerRequests.filter(r => config.requestIds.includes(r.id));

    // Initialize environment and globals for the run
    const startEnv = environments.find(e => e.id === config.environmentId) || null;
    let currentEnvVars = startEnv ? JSON.parse(startEnv.variables) : {};
    let currentGlobalVars = { ...globals };

    for (let i = 0; i < config.iterations; i++) {
      for (const req of runRequests) {
        if (runnerStopRef.current) break;
        while (runnerPauseRef.current) {
          await new Promise(r => setTimeout(r, 100));
          if (runnerStopRef.current) break;
        }
        if (runnerStopRef.current) break;

        try {
          const resolutionContext = { ...currentGlobalVars, ...currentEnvVars };
          const headers = req.headers ? JSON.parse(req.headers) : {};
          const resolvedHeaders: Record<string, string> = {};
          Object.entries(headers).forEach(([k, v]) => {
            resolvedHeaders[k] = resolveVariables(String(v), resolutionContext);
          });

          let finalUrl = resolveVariables(req.url, resolutionContext);
          let resolvedBody = req.body ? resolveVariables(req.body, resolutionContext) : null;

          // Pre-request Script
          if (req.pre_request_script) {
            const preContext = {
              environment: { ...currentEnvVars },
              globals: { ...currentGlobalVars },
              request: {
                url: finalUrl,
                method: req.method,
                headers: resolvedHeaders,
                body: resolvedBody,
              }
            };
            const preResult = executeScript(req.pre_request_script, preContext);
            currentEnvVars = { ...preResult.environmentMutations };
            currentGlobalVars = { ...preResult.globalMutations };
            finalUrl = preResult.requestMutations.url;
            Object.assign(resolvedHeaders, preResult.requestMutations.headers);
            resolvedBody = preResult.requestMutations.body;
          }

          const res = await invoke<HttpResponseResult>("execute_request", {
            params: {
              method: req.method,
              url: finalUrl,
              headers: resolvedHeaders,
              body: resolvedBody,
              body_type: req.body_type || "none",
              form_data: req.form_data ? JSON.parse(req.form_data).map((entry: any) => ({
                ...entry,
                key: resolveVariables(entry.key, resolutionContext),
                value: entry.type === "text" ? resolveVariables(entry.value, resolutionContext) : entry.value
              })) : [],
              binary_file_path: req.binary_file_path ? resolveVariables(req.binary_file_path, resolutionContext) : null,
            }
          });

          let tests: any[] = [];
          let passed = true;
          if (req.post_request_script) {
            const postContext = {
              environment: { ...currentEnvVars },
              globals: { ...currentGlobalVars },
              request: {
                url: finalUrl,
                method: req.method,
                headers: resolvedHeaders,
                body: resolvedBody,
              },
              response: {
                status: res.status,
                body: res.body,
                headers: res.headers || {},
              }
            };
            const postResult = executeScript(req.post_request_script, postContext);
            tests = postResult.testResults || [];
            passed = tests.every(t => t.passed);
            currentEnvVars = { ...postResult.environmentMutations };
            currentGlobalVars = { ...postResult.globalMutations };
          }

          // Update app state for visibility
          setGlobals(currentGlobalVars);
          if (config.environmentId) {
            const updatedVariables = JSON.stringify(currentEnvVars);
            setEnvironments(prev => prev.map(env =>
              env.id === config.environmentId ? { ...env, variables: updatedVariables } : env
            ));
            void invoke("update_environment", {
              id: config.environmentId,
              name: startEnv?.name || "",
              variables: updatedVariables,
            });
          }

          const result: RunnerResult = {
            requestId: req.id,
            name: req.name,
            method: req.method,
            url: req.url,
            status: res.status,
            time_ms: res.time_ms,
            testResults: tests,
            passed: passed
          };

          results.push(result);
          if (passed) passedCount++; else failedCount++;
          totalTime += res.time_ms;

          setRunnerReport({
            totalRequests: results.length,
            passedRequests: passedCount,
            failedRequests: failedCount,
            totalTime,
            results: [...results]
          });

          if (config.delay > 0) {
            await new Promise(r => setTimeout(r, config.delay));
          }
        } catch (err: any) {
          results.push({
            requestId: req.id,
            name: req.name,
            method: req.method,
            url: req.url,
            status: 0,
            time_ms: 0,
            testResults: [],
            passed: false,
            error: String(err)
          });
          failedCount++;
          setRunnerReport({
            totalRequests: results.length,
            passedRequests: passedCount,
            failedRequests: failedCount,
            totalTime,
            results: [...results]
          });
        }
      }
      if (runnerStopRef.current) break;
    }

    setRunnerStatus(runnerStopRef.current ? "stopped" : "completed");
  };

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

      // Ctrl/Cmd + Shift + E: Toggle Environments
      if (isMod && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setIsEnvManagerOpen(true);
      }

      // Ctrl/Cmd + H: Toggle History
      if (isMod && e.key === "h") {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }

      // Ctrl/Cmd + K: Focus Search
      if (isMod && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }

      // Ctrl/Cmd + \ or Ctrl+[: Toggle Left Sidebar
      if (isMod && (e.key === "\\" || e.key === "[")) {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
      }

      // Ctrl/Cmd + ]: Toggle Right Inspector
      if (isMod && e.key === "]") {
        e.preventDefault();
        setIsInspectorVisible((prev) => !prev);
      }

      // ?: Toggle Shortcuts Modal (only when not typing in an input)
      if (e.key === "?" && !isMod) {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !(document.activeElement as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
        }
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
    // Check if a tab for this request already exists
    const existingTab = openTabs.find(t => t.requestId === request.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTab: TabState = {
      id: generateId(),
      requestId: request.id,
      name: request.name,
      method: request.method || "GET",
      url: request.url || "",
      body: request.body || "",
      headers: parseHeadersToRows(request.headers),
      params: [emptyKeyValueRow()], // Initialize or parse params if added later
      isDirty: false,
      preRequestScript: request.pre_request_script || null,
      postRequestScript: request.post_request_script || null,
      bodyType: (request.body_type as any) || "raw",
      formData: parseFormDataToRows(request.form_data),
      binaryFilePath: request.binary_file_path || null,
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }

  function handleTabSelect(tabId: string) {
    setActiveTabId(tabId);
  }

  function handleTabClose(tabId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const tabToClose = openTabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    if (tabToClose.isDirty) {
      openConfirm({
        title: "Close Unsaved Tab?",
        description: `You have unsaved changes in "${tabToClose.name}". Are you sure you want to close it and lose these changes?`,
        confirmLabel: "Close Tab",
        isDestructive: true,
        onConfirm: () => {
          closeTabCore(tabId);
        }
      });
    } else {
      closeTabCore(tabId);
    }
  }

  function closeTabCore(tabId: string) {
    setOpenTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        // If we closed the active tab, switch to the last available tab (or null)
        const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        setActiveTabId(nextActive);
      }
      return remaining;
    });
  }

  function handleNewTab() {
    handleCreateRequestClick();
  }

  function toggleCollectionExpanded(id: string) {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
  }


  function toggleFolderExpanded(id: string) {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleImportCurl(curl: string) {
    try {
      const parsed = parseCurl(curl);
      let collectionId = activeCollectionId;

      if (!collectionId) {
        const newColId = generateId();
        const created = await invoke<Collection>("create_collection", {
          id: newColId,
          name: "Imported cURL",
          workspace_id: activeWorkspaceId,
        });
        setCollections((prev) => [...prev, created]);
        collectionId = created.id;
        setActiveCollectionId(created.id);
        void broadcastSyncEvent("Create", "Collection", created.id, created);
      }

      const requestId = generateId();
      const newRequest: StoredRequest = {
        id: requestId,
        collection_id: collectionId!,
        folder_id: null,
        name: `cURL Request - ${new Date().toLocaleTimeString()}`,
        method: parsed.method,
        url: parsed.url,
        body: parsed.body,
        headers: JSON.stringify(headerRowsToObject(parsed.headers)),
        params: JSON.stringify({}),
        position: 0,
        created_at: new Date().toISOString(),
      };

      await invoke("create_request", {
        id: newRequest.id,
        collectionId: newRequest.collection_id,
        collection_id: newRequest.collection_id,
        folder_id: null,
        name: newRequest.name,
        method: newRequest.method,
        url: newRequest.url,
        headers: newRequest.headers,
        body: newRequest.body,
        params: newRequest.params,
        position: 0,
      });

      setRequestsByCollection((prev) => ({
        ...prev,
        [collectionId!]: [...(prev[collectionId!] || []), newRequest],
      }));

      applyStoredRequest(newRequest);
      void broadcastSyncEvent("Create", "Request", requestId, newRequest);

      showToast({ kind: "success", title: "cURL Imported", description: "Request created successfully" });
      setIsImportModalOpen(false);
    } catch (error) {
      showToast({ kind: "error", title: "Import Failed", description: String(error) });
    }
  }

  async function handleImportPostman(json: any) {
    try {
      const { collections: newCols, folders: newFolders, requests: newReqs } = parsePostman(json);

      for (const col of newCols) {
        const createdCol = await invoke<Collection>("create_collection", {
          id: col.id,
          name: col.name,
          workspace_id: activeWorkspaceId,
        });
        setCollections((prev) => [...prev, createdCol]);
        if (collections.length === 0 || !activeCollectionId) {
          setExpandedCollections((prev) => ({ ...prev, [createdCol.id]: true }));
          setActiveCollectionId(createdCol.id);
        }
        void broadcastSyncEvent("Create", "Collection", createdCol.id, createdCol);

        // Import folders for this collection
        const colFolders = newFolders.filter(f => f.collection_id === col.id);
        for (const folder of colFolders) {
          await invoke("create_folder", {
            id: folder.id,
            collectionId: folder.collection_id,
            collection_id: folder.collection_id,
            name: folder.name,
            position: 0,
          });
          void broadcastSyncEvent("Create", "Folder", folder.id, folder);
        }

        // Import requests for this collection
        const colReqs = newReqs.filter(r => r.collection_id === col.id);
        for (const req of colReqs) {
          await invoke("create_request", {
            id: req.id,
            collectionId: req.collection_id,
            collection_id: req.collection_id,
            folderId: req.folder_id,
            folder_id: req.folder_id,
            name: req.name,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            params: req.params,
            position: 0,
          });
          void broadcastSyncEvent("Create", "Request", req.id, req);
        }

        // Refresh local state for this collection
        await fetchRequests(createdCol.id);
        setExpandedCollections(prev => ({ ...prev, [createdCol.id]: true }));
      }

      showToast({ kind: "success", title: "Postman Import Complete", description: `Imported ${newCols.length} collections` });
      setIsImportModalOpen(false);
    } catch (error) {
      console.error("Postman import error:", error);
      showToast({ kind: "error", title: "Import Failed", description: String(error) });
    }
  }

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


  async function sendSyncEventsToPeer(peerIp: string, events: SyncEvent[]) {
    if (events.length === 0) return;

    try {
      // Use Rust backend for background stability
      for (const event of events) {
        await invoke("send_sync_event", { peerIp, event });
      }
    } catch (error: any) {
      console.error(`Failed to sync with ${peerIp}:`, error);
      throw error;
    }
  }

  async function broadcastSyncEvent(
    action: SyncAction,
    entityType: SyncEntityType,
    entityId: string,
    payload: unknown,
    silent = false
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
    if (failed > 0 && !silent) {
      showToast({
        kind: "info",
        title: "Peer status update",
        description: `${failed} peer${failed === 1 ? "" : "s"} currenty unreachable.`,
      });
    }
  }

  async function sendTargetedSyncEvent(
    peerIp: string,
    action: SyncAction,
    entityType: SyncEntityType,
    entityId: string,
    payload: unknown,
  ) {
    try {
      const event = createSyncEvent(action, entityType, entityId, payload);
      await sendSyncEventsToPeer(peerIp, [event]);
    } catch (err) {
      console.error(`Failed to send targeted event to ${peerIp}:`, err);
    }
  }

  async function applyRemoteSyncEvent(event: SyncEvent) {
    if (event.origin_device === localDeviceId) {
      return;
    }

    let payload: Record<string, unknown> = {};
    let rawPayload: any = null;
    if (event.payload && event.payload.trim()) {
      try {
        const parsed = JSON.parse(event.payload);
        rawPayload = parsed;
        if (parsed && typeof parsed === "object") {
          payload = parsed as Record<string, unknown>;
        }
      } catch {
        payload = {};
      }
    }

    if (event.action === ("Metadata" as any)) {
      if (Array.isArray(rawPayload)) {
        setPeerCollections(prev => ({
          ...prev,
          [event.origin_device]: rawPayload
        }));
      }
      return;
    }

    const peerIp = Object.entries(peers).find(([name]) => name === event.origin_device)?.[1] 
                    || event.origin_device;

    if (event.action === "RequestAccess") {
      const colId = event.entity_id;
      const colName = payload.name || "a collection";
      openConfirm({
        title: "Access Request",
        description: `A collaborator (${peerIp}) wants to download "${colName}". Allow?`,
        confirmLabel: "Grant Access",
        onConfirm: () => {
          handleGrantAccess(peerIp, colId);
        }
      });
      return;
    }

    const isGrant = event.action === "GrantAccess";
    const action = isGrant ? "Create" : event.action;

    if (event.entity_type === "Collection") {
      if (action === "Delete") {
        try {
          await invoke("delete_collection", { id: event.entity_id });
        } catch { }

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
        }
      } else {
        const name =
          typeof payload.name === "string" && payload.name.trim()
            ? payload.name
            : `Shared Collection ${event.entity_id.slice(0, 4)}`;
        const ownerId =
          typeof payload.owner_id === "string" && payload.owner_id.trim()
            ? payload.owner_id
            : LOCAL_USER_ID;

        try {
          const upserted = await invoke<Collection>("upsert_collection", {
            id: event.entity_id,
            workspaceId: activeWorkspaceId,
            name,
            ownerId,
          });

          setCollections((prev) => {
            const idx = prev.findIndex((item) => item.id === upserted.id);
            if (idx === -1) return [...prev, upserted];
            const next = [...prev];
            next[idx] = upserted;
            return next;
          });
          setExpandedCollections((prev) => ({ ...prev, [upserted.id]: true }));
        } catch (err) {
          console.error("Failed to upsert remote collection:", err);
        }
      }
      return;
    }

    if (event.entity_type === ("Folder" as any)) {
      if (action === "Delete") {
        try {
          await invoke("delete_folder", { id: event.entity_id });
        } catch { }
        const collectionId = typeof payload.collection_id === "string" ? payload.collection_id : null;
        if (collectionId) {
          setFoldersByCollection((prev) => ({
            ...prev,
            [collectionId]: (prev[collectionId] || []).filter((f) => f.id !== event.entity_id),
          }));
        }
        return;
      }

      const collectionId = typeof payload.collection_id === "string" ? payload.collection_id : null;
      if (!collectionId) return;

      const name = typeof payload.name === "string" ? payload.name : "Shared Folder";
      const position = typeof payload.position === "number" ? payload.position : 0;

      const upserted = await invoke<Folder>("upsert_folder", {
        id: event.entity_id,
        collectionId,
        collection_id: collectionId,
        name,
        position,
      });

      setFoldersByCollection((prev) => {
        const current = prev[upserted.collection_id] || [];
        const idx = current.findIndex((f) => f.id === upserted.id);
        if (idx === -1) {
          return { ...prev, [upserted.collection_id]: [...current, upserted] };
        }
        const next = [...current];
        next[idx] = upserted;
        return { ...prev, [upserted.collection_id]: next };
      });
      return;
    }

    if (event.entity_type === ("Request" as any)) {
      if (action === "Delete") {
        const payloadCollectionId =
          typeof payload.collection_id === "string" ? payload.collection_id : null;
        try {
          await invoke("delete_request", { id: event.entity_id });
        } catch { }
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
        if (activeTab?.requestId === event.entity_id) {
          const tabToClose = openTabs.find(t => t.requestId === event.entity_id);
          if (tabToClose) closeTabCore(tabToClose.id);
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
      const folderId = typeof payload.folder_id === "string" ? payload.folder_id : null;
      const position = typeof payload.position === "number" ? payload.position : 0;
      const preRequestScript = typeof payload.pre_request_script === "string" ? payload.pre_request_script : null;
      const postRequestScript = typeof payload.post_request_script === "string" ? payload.post_request_script : null;
      const bodyType = typeof payload.body_type === "string" ? payload.body_type : "raw";
      const formData = typeof payload.form_data === "string" ? payload.form_data : null;
      const binaryFilePath = typeof payload.binary_file_path === "string" ? payload.binary_file_path : null;

      const headers = normalizeHeadersForStorage(payload.headers);
      const body = normalizeBodyForStorage(payload.body);

      const upserted = await invoke<StoredRequest>("upsert_request", {
        id: event.entity_id,
        collectionId,
        collection_id: collectionId,
        folderId,
        folder_id: folderId,
        name,
        method,
        url,
        headers,
        body,
        position,
        preRequestScript,
        pre_request_script: preRequestScript,
        postRequestScript,
        post_request_script: postRequestScript,
        bodyType,
        body_type: bodyType,
        formData,
        form_data: formData,
        binaryFilePath,
        binary_file_path: binaryFilePath,
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

      // SYNC TO TABS: Update UI if this request is open
      setOpenTabs(prev => prev.map(tab => {
        if (tab.requestId !== upserted.id) return tab;
        // If the user hasn't modified the tab locally (isDirty === false), 
        // we can safely update it with the remote change.
        if (!tab.isDirty) {
          return {
            ...tab,
            name: upserted.name,
            method: upserted.method,
            url: upserted.url,
            body: upserted.body || "",
            headers: parseHeadersToRows(upserted.headers),
            bodyType: (upserted.body_type as any) || "raw",
            formData: parseFormDataToRows(upserted.form_data),
            binaryFilePath: upserted.binary_file_path || null,
          };
        }
        return tab;
      }));
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
    const text = await navigator.clipboard.readText();
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

  async function fetchCollections(workspaceId?: string) {
    const targetWsId = workspaceId || activeWorkspaceId;
    if (!targetWsId) return;

    try {
      const result = await invoke<Collection[]>("get_collections", {
        workspace_id: targetWsId,
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

  const broadcastCollectionsMetadata = useCallback(async () => {
    if (Object.keys(peers).length === 0) return;
    const metadata = collections.map(c => ({ id: c.id, name: c.name, owner_id: c.owner_id }));
    void broadcastSyncEvent("Metadata" as any, "PeerMetadata" as any, localDeviceId, metadata, true);
  }, [collections, peers, localDeviceId]);

  useEffect(() => {
    if (Object.keys(peers).length === 0) {
      setPeerCollections({});
      return;
    }
    const interval = setInterval(() => {
      broadcastCollectionsMetadata();
    }, 15000); 
    broadcastCollectionsMetadata();
    return () => clearInterval(interval);
  }, [broadcastCollectionsMetadata, peers]);

  async function fetchRequests(collectionId: string) {
    setIsLoadingRequests(true);
    try {
      const requests = await invoke<StoredRequest[]>("get_requests_by_collection", {
        collectionId,
      });

      setRequestsByCollection((prev) => ({ ...prev, [collectionId]: requests }));

      // Optional: automatically open the first request if no tabs are open
      if (requests.length > 0 && openTabs.length === 0) {
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
        folderId: targetFolderId,
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

      void broadcastSyncEvent("Update", "Folder", folderId, {
        id: folderId,
        collection_id: targetCollectionId,
        position: targetPosition
      });

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
            name: name.trim(),
            ownerId: LOCAL_USER_ID,
          });

          setCollections((prev) => [...prev, newCollection]);
          setRequestsByCollection((prev) => ({ ...prev, [newCollection.id]: [] }));
          setExpandedCollections((prev) => ({ ...prev, [newCollection.id]: true }));
          setActiveCollectionId(newCollection.id);
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
          await fetchRequests(duplicated.id);
          void broadcastSyncEvent("Create", "Collection", duplicated.id, duplicated);
          const duplicatedRequests = await invoke<StoredRequest[]>("get_requests_by_collection", {
            collectionId: duplicated.id,
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

  async function handleShareCollection(collectionId: string) {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;

    // 1. Share Collection itself
    void broadcastSyncEvent("Create", "Collection", col.id, col);

    // 2. Share all Folders
    const folders = foldersByCollection[collectionId] || [];
    for (const folder of folders) {
      void broadcastSyncEvent("Create", "Folder", folder.id, folder);
    }

    // 3. Share all Requests
    const requests = requestsByCollection[collectionId] || [];
    for (const request of requests) {
      void broadcastSyncEvent("Create", "Request", request.id, request);
    }

    showToast({
      kind: "success",
      title: "Collection Shared",
      description: `Broadcasted "${col.name}" to all Peers.`
    });
  }

  async function handleRequestDownload(peerIp: string, collectionId: string) {
    const colName = peerCollections[peerIp]?.find(c => c.id === collectionId)?.name || "Collection";
    void sendTargetedSyncEvent(peerIp, "RequestAccess", "Collection", collectionId, { id: collectionId, name: colName });
    showToast({
      kind: "info",
      title: "Request Sent",
      description: `Asking permission for "${colName}"...`
    });
  }

  async function handleGrantAccess(peerIp: string, collectionId: string) {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;

    // 1. Grant Access (Collection)
    void sendTargetedSyncEvent(peerIp, "GrantAccess", "Collection", col.id, col);

    // 2. Grant Access (Folders)
    const folders = foldersByCollection[collectionId] || [];
    for (const folder of folders) {
      void sendTargetedSyncEvent(peerIp, "GrantAccess", "Folder", folder.id, folder);
    }

    // 3. Grant Access (Requests)
    const requests = requestsByCollection[collectionId] || [];
    for (const request of requests) {
      void sendTargetedSyncEvent(peerIp, "GrantAccess", "Request", request.id, request);
    }

    showToast({
      kind: "success",
      title: "Access Granted",
      description: `Shared "${col.name}" with peer.`
    });
  }

  async function handleDuplicateFolder(folder: Folder) {
    openPrompt({
      title: "Duplicate Folder",
      description: "A copy of the folder and its requests will be created.",
      defaultValue: `${folder.name} Copy`,
      confirmLabel: "Duplicate",
      onConfirm: async (name) => {
        if (!name.trim()) return;
        const newId = uuidv4();
        try {
          const duplicated = await invoke<Folder>("duplicate_folder", {
            sourceId: folder.id,
            newId,
            newName: name.trim(),
          });
          setFoldersByCollection((prev) => ({
            ...prev,
            [duplicated.collection_id]: [...(prev[duplicated.collection_id] || []), duplicated]
          }));
          setExpandedFolders((prev) => ({ ...prev, [duplicated.id]: true }));

          await fetchRequests(duplicated.collection_id);
          void broadcastSyncEvent("Create", "Folder", duplicated.id, duplicated);
          showToast({
            kind: "success",
            title: "Folder duplicated",
            description: duplicated.name,
          });
        } catch (error) {
          showToast({
            kind: "error",
            title: "Error duplicating folder",
            description: String(error),
          });
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
          // Update active tab name if this request is open
          setOpenTabs(prev => prev.map(tab =>
            tab.requestId === updated.id ? { ...tab, name: updated.name } : tab
          ));
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
            newId,
            newName: name.trim(),
          });
          setRequestsByCollection((prev) => {
            const current = prev[duplicated.collection_id] || [];
            return { ...prev, [duplicated.collection_id]: [duplicated, ...current] };
          });
          setExpandedCollections((prev) => ({ ...prev, [duplicated.collection_id]: true }));
          setActiveCollectionId(duplicated.collection_id);
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

          // Close all tabs associated with this request
          setOpenTabs(tabs => {
            const nextTabs = tabs.filter(t => t.requestId !== request.id);
            if (nextTabs.length !== tabs.length) {
              // We closed at least one tab. If activeTabId was closed, select the last one.
              if (!nextTabs.find(t => t.id === activeTabId)) {
                setActiveTabId(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null);
              }
            }
            return nextTabs;
          });

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
    if (!activeTab || !activeTab.url.trim()) {
      return;
    }

    setIsSending(true);
    setIsSending(true);
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, lastResponse: null, lastRespTab: "Body" } : t));

    // Resolve Environments
    const activeEnv = environments.find(e => e.id === activeEnvId);
    let originalEnvData: Record<string, string> = {};
    if (activeEnv) {
      try {
        originalEnvData = JSON.parse(activeEnv.variables);
      } catch (err) {
        console.error("Failed to parse environment variables:", err);
      }
    }

    // Merge globals - env takes precedence
    const resolutionContext = { ...globals, ...originalEnvData };

    const headers = headerRowsToObject(activeTab.headers);
    const resolvedHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([k, v]) => {
      resolvedHeaders[k] = resolveVariables(v, resolutionContext);
    });

    let finalUrl = resolveVariables(activeTab.url, resolutionContext);
    if (!finalUrl.startsWith("http")) {
      finalUrl = `https://jsonplaceholder.typicode.com${finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`}`;
    }

    const queryParams = new URLSearchParams();
    activeTab.params.forEach((param) => {
      if (param.enabled && param.key.trim()) {
        queryParams.append(param.key.trim(), resolveVariables(param.value, resolutionContext));
      }
    });

    let queryString = queryParams.toString();
    if (queryString) {
      finalUrl += finalUrl.includes("?") ? `&${queryString}` : `?${queryString}`;
    }

    let resolvedBody = activeTab.body ? resolveVariables(activeTab.body, resolutionContext) : null;

    // Build context for pre-request script
    const preContext = {
      environment: { ...originalEnvData },
      globals: { ...globals },
      request: {
        url: finalUrl,
        method: activeTab.method,
        headers: resolvedHeaders,
        body: resolvedBody,
      }
    };

    // Execute Pre-request Script
    let envData = { ...originalEnvData };
    let currentGlobals = { ...globals };
    if (activeTab.preRequestScript) {
      const preResult = executeScript(activeTab.preRequestScript, preContext);
      if (preResult.error) {
        console.error("Pre-request script error:", preResult.error);
        showToast({
          kind: "error",
          title: "Pre-request Script Error",
          description: preResult.error,
        });
        // Continue execution but warn the user
      }
      envData = { ...preResult.environmentMutations };
      currentGlobals = { ...preResult.globalMutations };
      setGlobals(currentGlobals);
      finalUrl = preResult.requestMutations.url;
      // update headers and body if mutated
      Object.assign(resolvedHeaders, preResult.requestMutations.headers);
      resolvedBody = preResult.requestMutations.body;

      // Update active environment if variables changed
      if (activeEnvId) {
        const activeEnv = environments.find(e => e.id === activeEnvId);
        if (activeEnv) {
          const updatedVariables = JSON.stringify(preResult.environmentMutations);
          setEnvironments(prev => prev.map(env =>
            env.id === activeEnvId ? { ...env, variables: updatedVariables } : env
          ));
          void invoke("update_environment", {
            id: activeEnvId,
            name: activeEnv.name,
            variables: updatedVariables,
          });
        }
      }
    }

    try {
      const response = await invoke<HttpResponseResult>("execute_request", {
        params: {
          method: activeTab.method,
          url: finalUrl,
          headers: Object.keys(resolvedHeaders).length > 0 ? resolvedHeaders : null,
          body: activeTab.method === "GET" ? null : resolvedBody,
          body_type: activeTab.bodyType,
          form_data: activeTab.bodyType === "form-data" ? activeTab.formData.map(entry => ({
            ...entry,
            key: resolveVariables(entry.key, resolutionContext),
            value: entry.type === "text" ? resolveVariables(entry.value, resolutionContext) : entry.value
          })) : null,
          binary_file_path: activeTab.bodyType === "binary" ? (activeTab.binaryFilePath ? resolveVariables(activeTab.binaryFilePath, resolutionContext) : null) : null,
        },
      });

      // Execute Tests Script
      let testResults = undefined;
      let finalResponse = { ...response };
      if (activeTab.postRequestScript) {
        const postContext = {
          environment: { ...envData },
          globals: { ...currentGlobals },
          request: {
            url: finalUrl,
            method: activeTab.method,
            headers: resolvedHeaders,
            body: resolvedBody,
          },
          response: {
            status: response.status,
            body: response.body,
            headers: response.headers || {},
          }
        };
        const postResult = executeScript(activeTab.postRequestScript, postContext);
        if (postResult.error) {
          console.error("Tests script error:", postResult.error);
          showToast({
            kind: "error",
            title: "Tests Script Error",
            description: postResult.error,
          });
        }
        testResults = postResult.testResults;
        finalResponse.testResults = testResults;
        setGlobals(postResult.globalMutations);
      }

      setOpenTabs(prev => prev.map(t => t.id === activeTabId ? {
        ...t,
        lastResponse: finalResponse,
        lastRespTab: (testResults && testResults.length > 0) ? "Tests" : (t.lastRespTab || "Body")
      } : t));
      void saveRequestToHistory(activeTab.method, finalUrl, resolvedHeaders, resolvedBody, finalResponse, activeTab.bodyType, activeTab.formData, activeTab.binaryFilePath);
    } catch (error) {
      const errResponse = {
        error: String(error),
        status: 0,
        headers: {},
        body: "",
        time_ms: 0,
      };
      setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, lastResponse: errResponse } : t));
      void saveRequestToHistory(activeTab.method, finalUrl, resolvedHeaders, resolvedBody, errResponse, activeTab.bodyType, activeTab.formData, activeTab.binaryFilePath);
      showToast({
        kind: "error",
        title: "Request failed",
        description: String(error),
      });
    } finally {
      setIsSending(false);
    }
  }

  async function saveRequestToHistory(method: string, url: string, headersObj: Record<string, string>, body: string | null, response: any, bodyType?: string, formData?: any[], binaryFilePath?: string | null) {
    try {
      await invoke("save_history_entry", {
        args: {
          id: generateId(),
          workspaceId: activeWorkspaceId,
          requestId: activeTab?.requestId || null,
          method,
          url,
          requestHeaders: JSON.stringify(headersObj),
          requestBody: body,
          statusCode: response?.status ?? null,
          responseBody: response?.body ?? response?.error ?? null,
          responseHeaders: response?.headers ? JSON.stringify(response.headers) : null,
          timeMs: response?.time_ms ?? null,
          testResults: response?.testResults ? JSON.stringify(response.testResults) : null,
          bodyType: bodyType || "raw",
          formData: formData ? JSON.stringify(formData) : null,
          binaryFilePath: binaryFilePath || null,
        }
      });
    } catch (err) {
      console.error("Failed to save history", err);
    }
  }

  function handleHistoryRestore(entry: HistoryEntry) {
    if (!activeTabId) return; // Must have an active tab to restore into

    setOpenTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        method: entry.method,
        url: entry.url,
        body: entry.request_body || null,
        headers: entry.request_headers ? parseHeadersToRows(entry.request_headers) : tab.headers,
        bodyType: (entry.body_type as any) || "raw",
        formData: parseFormDataToRows(entry.form_data),
        binaryFilePath: entry.binary_file_path || null,
        isDirty: true
      };
    }));

    showToast({ kind: "success", title: "Request Restored", description: `${entry.method} ${entry.url}` });
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

    if (!activeTab || !activeTab.requestId) { // Check for activeTab.requestId instead of activeRequest
      await handleCreateRequestClick();
      return;
    }

    setIsSavingRequest(true);
    try {
      const headers = headerRowsToObject(activeTab.headers);
      const updated = await invoke<StoredRequest>("update_request", {
        id: activeTab.requestId,
        name: activeTab.name || "Untitled Request",
        method: activeTab.method,
        url: activeTab.url,
        headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : null,
        body: activeTab.body || null,
        pre_request_script: activeTab.preRequestScript || null,
        post_request_script: activeTab.postRequestScript || null,
        body_type: activeTab.bodyType,
        form_data: JSON.stringify(activeTab.formData.filter(row => row.key.trim() || row.value.trim())),
        binary_file_path: activeTab.binaryFilePath,
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

  async function handleCreateEnvironment(name: string, variables: string = "{}", collectionId: string | null = null) {
    if (!activeWorkspaceId) return;
    try {
      const newEnv = await invoke<Environment>("create_environment", {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        collectionId,
        name,
        variables
      });
      setEnvironments(prev => [...prev, newEnv]);
      return newEnv;
    } catch (err) {
      console.error("Failed to create environment:", err);
      showToast({ kind: "error", title: "Error creating environment", description: String(err) });
    }
  }

  async function handleUpdateEnvironment(id: string, name: string, variables: string) {
    try {
      const updated = await invoke<Environment>("update_environment", { id, name, variables });
      setEnvironments(prev => prev.map(e => e.id === updated.id ? updated : e));
    } catch (err) {
      console.error("Failed to update environment:", err);
      showToast({ kind: "error", title: "Error updating environment", description: String(err) });
    }
  }

  async function handleDeleteEnvironment(id: string) {
    try {
      await invoke("delete_environment", { id });
      setEnvironments(prev => prev.filter(e => e.id !== id));
      if (activeEnvId === id) setActiveEnvId(null);
    } catch (err) {
      console.error("Failed to delete environment:", err);
      showToast({ kind: "error", title: "Error deleting environment", description: String(err) });
    }
  }

  async function handleSetActiveEnvironment(id: string | null) {
    if (!activeWorkspaceId) return;
    try {
      await invoke("set_active_environment", { id, workspaceId: activeWorkspaceId });
      setActiveEnvId(id);
      setEnvironments(prev => prev.map(e => ({ ...e, is_active: e.id === id })));
    } catch (err) {
      console.error("Failed to set active environment:", err);
    }
  }

  useEffect(() => {
    const loadGlobals = async () => {
      try {
        const result = await invoke<string>("get_globals");
        if (result) {
          setGlobals(JSON.parse(result));
        }
      } catch (err) {
        console.error("Failed to load global variables:", err);
      }
    };
    loadGlobals();
  }, []);

  useEffect(() => {
    const unlistenStatus = listen<any>("ws-status", (event) => {
      const { connection_id, status, error } = event.payload;
      setOpenTabs(prev => prev.map(t =>
        t.requestId === connection_id ? { ...t, wsStatus: status } : t
      ));
      if (error) {
        showToast({ kind: "error", title: "WebSocket Error", description: error });
      }
    });

    const unlistenMsg = listen<any>("ws-message", (event) => {
      const msg = event.payload;
      setOpenTabs(prev => prev.map(t =>
        t.requestId === msg.connection_id
          ? { ...t, wsMessages: [...(t.wsMessages || []), msg] }
          : t
      ));
    });

    return () => {
      unlistenStatus.then(f => f());
      unlistenMsg.then(f => f());
    };
  }, []);

  const handleWsConnect = async () => {
    if (!activeTab || !activeTab.url.trim()) return;

    // Resolve Variables
    const activeEnv = environments.find(e => e.id === activeEnvId);
    let originalEnvData = {};
    if (activeEnv) {
      try { originalEnvData = JSON.parse(activeEnv.variables); } catch (e) { }
    }
    const resolutionContext = { ...globals, ...originalEnvData };

    const resolvedUrl = resolveVariables(activeTab.url, resolutionContext);
    const headersObj = headerRowsToObject(activeTab.headers);
    const resolvedHeaders: Record<string, string> = {};
    Object.entries(headersObj).forEach(([k, v]) => {
      resolvedHeaders[k] = resolveVariables(v, resolutionContext);
    });

    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, wsStatus: "connecting" } : t));

    try {
      await invoke("ws_connect", {
        connectionId: activeTab.requestId,
        url: resolvedUrl,
        headers: resolvedHeaders,
      });
    } catch (err) {
      showToast({ kind: "error", title: "Connection Failed", description: String(err) });
      setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, wsStatus: "error" } : t));
    }
  };

  const handleWsDisconnect = async () => {
    if (!activeTab) return;
    try {
      await invoke("ws_disconnect", { connectionId: activeTab.requestId });
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  };

  const handleWsSend = async (content: string) => {
    if (!activeTab) return;
    try {
      await invoke("ws_send", {
        connectionId: activeTab.requestId,
        content,
      });
      // Add message to local log immediately
      const sentMsg = {
        id: uuidv4(),
        connection_id: activeTab.requestId,
        content,
        is_sent: true,
        timestamp: new Date().toISOString(),
      };
      setOpenTabs(prev => prev.map(t =>
        t.id === activeTabId ? { ...t, wsMessages: [...(t.wsMessages || []), sentMsg] } : t
      ));
    } catch (err) {
      showToast({ kind: "error", title: "Send Failed", description: String(err) });
    }
  };

  const handleClearWsMessages = () => {
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, wsMessages: [] } : t));
  };

  const peersCount = Object.keys(peers).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-gray-200 font-sans overflow-hidden">
      <TopBar
        peers={peers}
        peersCount={peersCount}
        localIdentity={localIdentity}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        onCreateWorkspace={handleCreateWorkspace}
        environments={environments}
        activeEnvId={activeEnvId}
        onSetActiveEnv={handleSetActiveEnvironment}
        onOpenEnvManager={() => setIsEnvManagerOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        isInspectorVisible={isInspectorVisible}
        onToggleInspector={() => setIsInspectorVisible(!isInspectorVisible)}
        onOpenGlobals={() => setIsGlobalsModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {isSidebarVisible && (
          <>
            <div style={{ width: `${sidebarWidth}px` }} className="flex shrink-0">
              <CollectionsSidebar
            collections={collections}
            foldersByCollection={foldersByCollection}
            activeCollectionId={activeCollectionId}
            setActiveCollectionId={(id) => setActiveCollectionId(id)}
            expandedCollections={expandedCollections}
            toggleCollectionExpanded={(id) => toggleCollectionExpanded(id)}
            expandedFolders={expandedFolders}
            toggleFolderExpanded={(id) => toggleFolderExpanded(id)}
            requestsByCollection={requestsByCollection}
            activeRequestId={activeTab?.requestId ?? null}
            activeRequestIsDirty={isDirty}
            onSelectRequest={(request) => {
              applyStoredRequest(request);
            }}
            onHide={() => setIsSidebarVisible(false)}
            onCreateCollection={() => handleCreateCollectionClick()}
            peerCollections={peerCollections}
            onDownloadRequest={handleRequestDownload}
            onShareCollection={handleShareCollection}
            peersCount={Object.keys(peers).length}
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
                    void broadcastSyncEvent("Create", "Folder", folder.id, folder);
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
                    void broadcastSyncEvent("Update", "Folder", updated.id, updated);
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
                    setRequestsByCollection((prev) => {
                      const current = prev[folder.collection_id] || [];
                      return {
                        ...prev,
                        [folder.collection_id]: current.filter(r => r.folder_id !== folder.id)
                      };
                    });
                    void broadcastSyncEvent("Delete", "Folder", folder.id, { id: folder.id, collection_id: folder.collection_id });
                  } catch (err) {
                    console.error("Failed to delete folder:", err);
                  }
                }
              });
            }}
            onDuplicateFolder={handleDuplicateFolder}
            onMoveFolder={handleMoveFolder}
            onMoveRequest={handleMoveRequest}
            onCopyRequest={handleCopyRequest}
            onPasteRequest={handlePasteRequest}
            onRenameRequest={handleRenameRequest}
            onDuplicateRequest={handleDuplicateRequest}
            onDeleteRequest={handleDeleteRequest}
            onExportWorkspace={handleExportWorkspace}
            onImportWorkspace={handleImportWorkspace}
            isLoadingRequests={isLoadingRequests}
            onHistory={() => setIsHistoryOpen(true)}
            onRunCollection={handleRunCollection}
            onRunFolder={handleRunFolder}
            />
          </div>
            <div
              className={`w-1.5 h-full bg-border/10 cursor-col-resize hover:bg-primary/30 transition-colors shrink-0 z-20 relative group ${isResizingSidebar ? 'bg-primary/40' : ''}`}
              onMouseDown={handleSidebarResizeStart}
            >
              <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-border/50 group-hover:bg-primary/60 transition-colors ${isResizingSidebar ? 'bg-primary' : ''}`} />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#1e1e1e]">
          {openTabs.length > 0 && (
            <RequestTabs
              tabs={openTabs}
              activeTabId={activeTabId}
              onTabSelect={handleTabSelect}
              onTabClose={handleTabClose}
              onNewTab={handleNewTab}
            />
          )}

          {activeTab ? (
            activeTab.method === "WS" ? (
              <WebSocketWorkspace
                url={activeTab.url}
                onUrlChange={(url) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, isDirty: true } : t))}
                headers={activeTab.headers}
                setHeaders={(headers) => setOpenTabs(prev => {
                  const next = [...prev];
                  const idx = next.findIndex(t => t.id === activeTabId);
                  if (idx !== -1) {
                    next[idx] = {
                      ...next[idx],
                      headers: typeof headers === "function" ? headers(next[idx].headers) : headers,
                      isDirty: true
                    };
                  }
                  return next;
                })}
                environments={environments}
                activeEnvId={activeEnvId}
                status={activeTab.wsStatus || "disconnected"}
                messages={activeTab.wsMessages || []}
                onConnect={handleWsConnect}
                onDisconnect={handleWsDisconnect}
                onSendMessage={handleWsSend}
                onClearMessages={handleClearWsMessages}
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <RequestWorkspace
                  activeCollectionName={activeCollection?.name || "No collection"}
                  activeRequestName={activeTab.name}
                  isDirty={activeTab.isDirty || false}
                  isSavingRequest={isSavingRequest}
                  onCreateRequest={handleCreateRequestClick}
                  onSaveRequest={handleSaveRequest}
                  reqMethod={activeTab.method}
                  setReqMethod={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, method: typeof val === 'function' ? val(t.method) : val, isDirty: true } : t))}
                  reqUrl={activeTab.url}
                  setReqUrl={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: typeof val === 'function' ? val(t.url) : val, isDirty: true } : t))}
                  reqBody={activeTab.body || ""}
                  setReqBody={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, body: typeof val === 'function' ? val(t.body || "") : val, isDirty: true } : t))}
                  reqParams={activeTab.params}
                  setReqParams={(params: any) => setOpenTabs(prev => {
                    const next = [...prev];
                    const idx = next.findIndex(t => t.id === activeTabId);
                    if (idx !== -1) {
                      next[idx] = {
                        ...next[idx],
                        params: typeof params === 'function' ? params(next[idx].params) : params,
                        isDirty: true
                      };
                    }
                    return next;
                  })}
                  reqHeaders={activeTab.headers}
                  setReqHeaders={(headers: any) => setOpenTabs(prev => {
                    const next = [...prev];
                    const idx = next.findIndex(t => t.id === activeTabId);
                    if (idx !== -1) {
                      next[idx] = {
                        ...next[idx],
                        headers: typeof headers === 'function' ? headers(next[idx].headers) : headers,
                        isDirty: true
                      };
                    }
                    return next;
                  })}
                  activeWorkspaceTab={activeWorkspaceTab}
                  setActiveWorkspaceTab={setActiveWorkspaceTab}
                  onSendRequest={handleSendRequest}
                  isSending={isSending}
                  environments={environments}
                  activeEnvId={activeEnvId}
                  reqPreRequestScript={activeTab.preRequestScript}
                  setReqPreRequestScript={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, preRequestScript: typeof val === 'function' ? val(t.preRequestScript) : val, isDirty: true } : t))}
                  reqPostRequestScript={activeTab.postRequestScript}
                  setReqPostRequestScript={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, postRequestScript: typeof val === 'function' ? val(t.postRequestScript) : val, isDirty: true } : t))}
                  reqBodyType={activeTab.bodyType}
                  setReqBodyType={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, bodyType: typeof val === 'function' ? val(t.bodyType) : val, isDirty: true } : t))}
                  reqFormData={activeTab.formData}
                  setReqFormData={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, formData: typeof val === 'function' ? val(t.formData) : val, isDirty: true } : t))}
                  reqBinaryFilePath={activeTab.binaryFilePath}
                  setReqBinaryFilePath={(val) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, binaryFilePath: typeof val === 'function' ? val(t.binaryFilePath) : val, isDirty: true } : t))}
                />

                <div
                  className={`h-1.5 w-full bg-border/20 cursor-ns-resize hover:bg-primary/40 transition-colors shrink-0 z-10 flex items-center justify-center relative group ${isResizing ? 'bg-primary/50' : ''}`}
                  onMouseDown={handleResizeStart}
                >
                  <div className={`w-8 h-0.5 rounded-full bg-border group-hover:bg-primary/60 transition-colors ${isResizing ? 'bg-primary' : ''}`} />
                </div>

                {activeTab.lastResponse && (
                  <ResponsePanel
                    reqResponse={activeTab.lastResponse}
                    isSending={isSending}
                    respTab={activeTab.lastRespTab || "Body"}
                    setRespTab={(tab) => setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, lastRespTab: typeof tab === 'function' ? (tab as any)(t.lastRespTab || "Body") : (tab as any) } : t))}
                    height={responseHeight}
                    onOpenCode={() => setIsCodeSnippetOpen(true)}
                  />
                )}
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted space-y-4 select-none opacity-50 italic">
              <div className="p-8 rounded-full bg-surface/30 border border-border border-dashed">
                <Play size={48} className="translate-x-1" />
              </div>
              <p className="text-[14px] font-medium tracking-wide">Select a request or create a new one to get started</p>
            </div>
          )}
        </div>

        {isInspectorVisible && (
          <RightInspector
            peers={peers}
            activeCollectionName={activeCollection?.name || ""}
            activeRequestsCount={activeRequests.length}
            connectedPeerIps={connectedPeerIps}
            sharingPeerIp={sharingPeerIp}
            onTogglePeerConnection={handleTogglePeerConnection}
            onSharePeer={handleSharePeer}
            onHide={() => setIsInspectorVisible(false)}
          />
        )}
      </div>

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

      <EnvironmentManager
        isOpen={isEnvManagerOpen}
        onClose={() => setIsEnvManagerOpen(false)}
        environments={environments}
        onCreate={(name) => handleCreateEnvironment(name)}
        onUpdate={handleUpdateEnvironment}
        onDelete={handleDeleteEnvironment}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCurl={handleImportCurl}
        onImportPostman={handleImportPostman}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        workspaceId={activeWorkspaceId}
        onRestore={handleHistoryRestore}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <CodeSnippetModal
        isOpen={isCodeSnippetOpen}
        onClose={() => setIsCodeSnippetOpen(false)}
        method={activeTab?.method || "GET"}
        url={activeTab?.url || ""}
        headers={headerRowsToObject(activeTab?.headers || [])}
        body={activeTab?.body || ""}
        responseBody={activeTab?.lastResponse && "body" in activeTab.lastResponse ? activeTab.lastResponse.body : null}
      />
      <CollectionRunnerModal
        isOpen={isRunnerOpen}
        onClose={() => setIsRunnerOpen(false)}
        title={runnerTitle}
        requests={runnerRequests}
        onRun={executeCollectionRun}
        status={runnerStatus}
        report={runnerReport}
        onStop={() => { runnerStopRef.current = true; setRunnerStatus("stopped"); }}
        onPause={() => { runnerPauseRef.current = true; setRunnerStatus("paused"); }}
        onResume={() => { runnerPauseRef.current = false; setRunnerStatus("running"); }}
        environments={environments}
        activeEnvId={activeEnvId}
      />

      <GlobalVariablesModal
        isOpen={isGlobalsModalOpen}
        onClose={() => setIsGlobalsModalOpen(false)}
        globals={globals}
        onSave={async (newGlobals) => {
          setGlobals(newGlobals);
          try {
            await invoke("update_globals", { variables: JSON.stringify(newGlobals) });
            showToast({ kind: "success", title: "Globals Saved", description: "Global variables updated successfully" });
          } catch (err) {
            console.log("Failed to save globals:", err);
            showToast({ kind: "error", title: "Save Failed", description: "Could not save global variables to backend" });
          }
        }}
      />

      <ToastViewport toasts={toasts} onDismiss={(id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

export default App;

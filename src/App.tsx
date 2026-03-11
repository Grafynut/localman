
import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CollectionsSidebar } from "./components/CollectionsSidebar";
import { RequestWorkspace } from "./components/RequestWorkspace";
import { ResponsePanel } from "./components/ResponsePanel";
import { RightInspector } from "./components/RightInspector";
import { TopBar } from "./components/TopBar";
import type {
  Collection,
  HttpResponseResult,
  KeyValuePair,
  ResponseState,
  ResponseTab,
  StoredRequest,
  WorkspaceTab,
} from "./types";
import {
  defaultHeaders,
  emptyKeyValueRow,
  generateId,
  headerRowsToObject,
  parseHeadersToRows,
} from "./utils";
import "./App.css";

function App() {
  const LOCAL_USER_ID = "local_user_1";

  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [requestsByCollection, setRequestsByCollection] = useState<Record<string, StoredRequest[]>>({});
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("Headers");
  const [respTab, setRespTab] = useState<ResponseTab>("Body");

  const [peers, setPeers] = useState<Record<string, string>>({});

  const [reqMethod, setReqMethod] = useState("GET");
  const [reqUrl, setReqUrl] = useState("/api/v1/users");
  const [reqBody, setReqBody] = useState(`{\n  "data": "56535353",\n  "users": {\n    "token": "api/v1/users"\n  }\n}`);
  const [reqParams, setReqParams] = useState<KeyValuePair[]>([emptyKeyValueRow()]);
  const [reqHeaders, setReqHeaders] = useState<KeyValuePair[]>(defaultHeaders());

  const [reqResponse, setReqResponse] = useState<ResponseState>(null);
  const [isSending, setIsSending] = useState(false);

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

  useEffect(() => {
    void fetchCollections();

    const interval = setInterval(() => {
      invoke<Record<string, string>>("get_known_peers")
        .then(setPeers)
        .catch(() => {
          // Ignore transient network discovery failures.
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

  function applyStoredRequest(request: StoredRequest) {
    setReqMethod(request.method || "GET");
    setReqUrl(request.url || "");
    setReqBody(request.body || "");
    setReqHeaders(parseHeadersToRows(request.headers));
  }

  function toggleCollectionExpanded(id: string) {
    setExpandedCollections((prev) => ({ ...prev, [id]: !prev[id] }));
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
    }
  }

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
    } finally {
      setIsLoadingRequests(false);
    }
  }

  async function handleCreateCollectionClick() {
    const name = window.prompt("Enter new collection name:");
    if (!name || !name.trim()) {
      return;
    }

    try {
      const newCollection = await invoke<Collection>("create_collection", {
        id: generateId(),
        name: name.trim(),
        ownerId: LOCAL_USER_ID,
        owner_id: LOCAL_USER_ID,
      });

      setCollections((prev) => [...prev, newCollection]);
      setRequestsByCollection((prev) => ({ ...prev, [newCollection.id]: [] }));
      setExpandedCollections((prev) => ({ ...prev, [newCollection.id]: true }));
      setActiveCollectionId(newCollection.id);
      setActiveRequestId(null);
    } catch (error) {
      alert(`Error creating collection: ${String(error)}`);
    }
  }

  async function handleCreateRequestClick() {
    if (!activeCollectionId) {
      alert("Create or select a collection first.");
      return;
    }

    const name = window.prompt("Enter request name:", "New Request");
    if (!name || !name.trim()) {
      return;
    }

    setIsCreatingRequest(true);
    try {
      const headers = headerRowsToObject(reqHeaders);
      const created = await invoke<StoredRequest>("create_request", {
        id: generateId(),
        collectionId: activeCollectionId,
        collection_id: activeCollectionId,
        name: name.trim(),
        method: reqMethod,
        url: reqUrl,
        headers: Object.keys(headers).length > 0 ? JSON.stringify(headers) : null,
        body: reqBody || null,
      });

      setRequestsByCollection((prev) => {
        const current = prev[activeCollectionId] || [];
        return { ...prev, [activeCollectionId]: [created, ...current] };
      });
      setActiveRequestId(created.id);
      applyStoredRequest(created);
    } catch (error) {
      alert(`Error creating request: ${String(error)}`);
    } finally {
      setIsCreatingRequest(false);
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
    } finally {
      setIsSending(false);
    }
  }

  const peersCount = Object.keys(peers).length;

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-gray-200 font-sans overflow-hidden">
      <TopBar peersCount={peersCount} />

      <div className="flex-1 flex overflow-hidden">
        <CollectionsSidebar
          collections={collections}
          activeCollectionId={activeCollectionId}
          setActiveCollectionId={setActiveCollectionId}
          expandedCollections={expandedCollections}
          toggleCollectionExpanded={toggleCollectionExpanded}
          requestsByCollection={requestsByCollection}
          activeRequestId={activeRequestId}
          onSelectRequest={(request) => {
            setActiveRequestId(request.id);
            applyStoredRequest(request);
          }}
          onCreateCollection={handleCreateCollectionClick}
          onCreateRequest={handleCreateRequestClick}
          isLoadingRequests={isLoadingRequests}
          isCreatingRequest={isCreatingRequest}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          <RequestWorkspace
            activeCollectionName={activeCollection?.name || ""}
            activeRequestName={activeRequest?.name || ""}
            isCreatingRequest={isCreatingRequest}
            onCreateRequest={handleCreateRequestClick}
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
        />
      </div>
    </div>
  );
}

export default App;

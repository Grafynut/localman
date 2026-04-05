export type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type Folder = {
  id: string;
  collection_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Collection = {
  id: string;
  workspace_id: string;
  name: string;
  owner_id: string;
  position: number;
  created_at?: string;
};

export type StoredRequest = {
  id: string;
  collection_id: string;
  folder_id?: string | null;
  name: string;
  method: string;
  url: string;
  headers?: string | null;
  body?: string | null;
  params?: string | null;
  position: number;
  created_at?: string;
  pre_request_script?: string | null;
  post_request_script?: string | null;
  body_type?: string | null;
  form_data?: string | null;
  binary_file_path?: string | null;
  auth?: string | null;
};

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export type AuthConfig = {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: "header" | "query" };
};

export const defaultAuthConfig: AuthConfig = {
  type: "none"
};

export type KeyValuePair = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  isSensitive?: boolean;
  description?: string;
};

export type FormDataEntry = {
  id: string;
  key: string;
  value: string;
  type: "text" | "file";
  enabled: boolean;
  isSensitive?: boolean;
};

export type TabState = {
  id: string;
  requestId: string;
  name: string;
  method: string;
  url: string;
  body: string | null;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  isDirty?: boolean;
  preRequestScript: string | null;
  postRequestScript: string | null;
  bodyType: "none" | "raw" | "form-data" | "binary";
  formData: FormDataEntry[];
  binaryFilePath: string | null;
  auth: AuthConfig;
  lastResponse?: ResponseState;
  lastRespTab?: ResponseTab;
  wsMessages?: WsMessage[];
  wsStatus?: "disconnected" | "connecting" | "connected" | "error";
};

export type WorkspaceTab = "Params" | "Headers" | "Body" | "Pre-request" | "Auth" | "Tests" | "Docs";
export type ResponseTab = "Body" | "Headers" | "Tests";
export type BodyViewMode = "pretty" | "raw" | "preview";

export type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

export type HttpResponseResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  testResults?: TestResult[];
};

export type HttpErrorResult = {
  error: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
  testResults?: TestResult[];
};

export type ResponseState = HttpResponseResult | HttpErrorResult | null;

export type WsMessage = {
  id: string;
  connection_id: string;
  content: string;
  is_sent: boolean;
  timestamp: string;
};

export type WsStatus = {
  connection_id: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  error?: string;
};

export type SyncAction = "Create" | "Update" | "Delete" | "Metadata" | "RequestAccess" | "GrantAccess" | "DenyAccess";
export type SyncEntityType = "Collection" | "Folder" | "Request" | "PeerMetadata" | "Global" | "Workspace";

export type SyncEvent = {
  event_id: string;
  action: SyncAction;
  entity_type: SyncEntityType;
  entity_id: string;
  payload: string;
  timestamp: string;
  origin_device: string;
};

export type Environment = {
  id: string;
  workspace_id?: string | null;
  collection_id?: string | null;
  name: string;
  variables: string;
  is_active: boolean;
  created_at: string;
};
export type HistoryEntry = {
  id: string;
  workspace_id: string;
  request_id?: string | null;
  method: string;
  url: string;
  request_headers?: string | null;
  request_body?: string | null;
  status_code?: number | null;
  response_body?: string | null;
  response_headers?: string | null;
  time_ms?: number | null;
  test_results?: string | null;
  body_type?: string | null;
  form_data?: string | null;
  binary_file_path?: string | null;
  executed_at: string;
};

export type RunnerStatus = "idle" | "running" | "paused" | "completed" | "stopped";

export type RunnerResult = {
  requestId: string;
  name: string;
  method: string;
  url: string;
  status: number;
  time_ms: number;
  testResults: TestResult[];
  passed: boolean;
  error?: string;
};

export type RunnerReport = {
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  totalTime: number;
  results: RunnerResult[];
};


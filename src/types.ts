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
  created_at: string;
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
  position: number;
};

export type KeyValuePair = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
};

export type WorkspaceTab = "Params" | "Headers" | "Body" | "Auth" | "Tests" | "Docs";
export type ResponseTab = "Body" | "Headers" | "Tests";
export type BodyViewMode = "pretty" | "raw";

export type HttpResponseResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
};

export type HttpErrorResult = {
  error: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  time_ms: number;
};

export type ResponseState = HttpResponseResult | HttpErrorResult | null;

export type SyncAction = "Create" | "Update" | "Delete";
export type SyncEntityType = "Collection" | "Request";

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

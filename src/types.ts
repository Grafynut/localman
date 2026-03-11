export type Collection = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type StoredRequest = {
  id: string;
  collection_id: string;
  name: string;
  method: string;
  url: string;
  headers?: string | null;
  body?: string | null;
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

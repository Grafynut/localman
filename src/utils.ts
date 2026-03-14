import type { KeyValuePair } from "./types";

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function emptyKeyValueRow(): KeyValuePair {
  return { id: generateId(), key: "", value: "", enabled: true };
}

export function defaultHeaders(): KeyValuePair[] {
  return [
    { id: generateId(), key: "Authorization", value: "Bearer {{token}}", enabled: true },
    { id: generateId(), key: "Content-Type", value: "application/json", enabled: true },
    emptyKeyValueRow(),
  ];
}

export function methodColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-method-get";
    case "POST":
      return "text-method-post";
    case "PUT":
      return "text-method-put";
    case "DELETE":
      return "text-method-delete";
    case "PATCH":
      return "text-method-patch";
    default:
      return "text-muted";
  }
}

export function parseHeadersToRows(headersJson?: string | null): KeyValuePair[] {
  if (!headersJson) {
    return defaultHeaders();
  }

  try {
    const parsed = JSON.parse(headersJson) as Record<string, string>;
    const rows = Object.entries(parsed).map(([key, value]) => ({
      id: generateId(),
      key,
      value,
      enabled: true,
    }));
    return rows.length > 0 ? [...rows, emptyKeyValueRow()] : defaultHeaders();
  } catch {
    return defaultHeaders();
  }
}

export function headerRowsToObject(rows: KeyValuePair[]) {
  const out: Record<string, string> = {};
  rows.forEach((row) => {
    if (row.enabled && row.key.trim()) {
      out[row.key.trim()] = row.value;
    }
  });
  return out;
}

export function formatResponseBody(rawBody: string, mode: "pretty" | "raw") {
  if (mode === "raw") {
    return rawBody;
  }
  const trimmed = rawBody.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return rawBody;
  }
  try {
    return JSON.stringify(JSON.parse(rawBody), null, 2);
  } catch {
    return rawBody;
  }
}

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

export function resolveVariables(text: string, env: Record<string, string>): string {
  if (!text) return text;
  // Single pass resolution
  return text.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    return env[trimmedKey] !== undefined ? String(env[trimmedKey]) : match;
  });
}

export function parseCurl(curl: string): Record<string, any> {
  const result: any = {
    method: "GET",
    url: "",
    headers: [] as KeyValuePair[],
    body: "",
  };

  // 1. Pre-process: Handle line continuations and CMD-specific escapes
  // Normalize line continuations (\ for bash, ^ for cmd)
  let normalized = curl.replace(/\s*\\\r?\n/g, ' ').replace(/\s*\^\r?\n/g, ' ');
  
  // CMD specific: Chrome/Edge sometimes use ^" for quotes and \^" for nested
  if (normalized.includes('^"')) {
    normalized = normalized.replace(/\^"/g, '"').replace(/\^\^/g, '^');
  }

  // 2. Tokenize preserving quoted strings
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    // Check if quote is escaped by \ (Bash/Standard) or ^ (CMD)
    // Note: ^" was mostly handled in normalization, but we keep it here for robustness
    const isEscaped = i > 0 && (normalized[i - 1] === '\\' || normalized[i - 1] === '^');
    
    if ((char === '"' || char === "'") && !isEscaped) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current) parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);

  const clean = (p: string | undefined) => {
    if (!p) return "";
    let res = p.trim();
    if ((res.startsWith('"') && res.endsWith('"')) || (res.startsWith("'") && res.endsWith("'"))) {
      res = res.slice(1, -1);
    }
    // Remove standard quote escapes
    return res.replace(/\\"/g, '"').replace(/\\'/g, "'");
  };

  for (let i = 0; i < parts.length; i++) {
    const part = clean(parts[i]);
    const nextPart = clean(parts[i + 1]);

    if (part === "-X" || part === "--request") {
      result.method = nextPart?.toUpperCase() || "GET";
      i++;
    } else if (part === "-H" || part === "--header") {
      const headerParts = nextPart?.split(":");
      if (headerParts && headerParts.length >= 2) {
        result.headers.push({
          id: generateId(),
          key: headerParts[0].trim(),
          value: headerParts.slice(1).join(":").trim(),
          enabled: true,
        });
      }
      i++;
    } else if (part === "-d" || part === "--data" || part === "--data-raw" || part === "--data-binary" || part === "--data-ascii") {
      result.body = nextPart || "";
      if (result.method === "GET") result.method = "POST";
      i++;
    } else if (part.startsWith("http") || (part.includes(".") && !part.startsWith("-") && part.length > 3)) {
      result.url = part;
    }
  }

  if (result.headers.length === 0) result.headers = defaultHeaders();
  else result.headers.push(emptyKeyValueRow());

  return result;
}

export function parsePostman(json: any) {
  const collections: any[] = [];
  const folders: any[] = [];
  const requests: any[] = [];

  const collectionId = generateId();
  collections.push({
    id: collectionId,
    name: json.info?.name || "Imported Collection",
    description: json.info?.description || "",
  });

  const processItems = (items: any[], parentFolderId?: string) => {
    items.forEach((item: any) => {
      if (item.request) {
        // It's a request
        requests.push({
          id: generateId(),
          collection_id: collectionId,
          folder_id: parentFolderId,
          name: item.name,
          method: item.request.method,
          url: typeof item.request.url === "string" ? item.request.url : item.request.url?.raw || "",
          headers: JSON.stringify(
            (item.request.header || []).reduce((acc: any, h: any) => {
              acc[h.key] = h.value;
              return acc;
            }, {})
          ),
          body: item.request.body?.raw || "",
          params: JSON.stringify(
            (item.request.url?.query || []).reduce((acc: any, p: any) => {
              acc[p.key] = p.value;
              return acc;
            }, {})
          ),
        });
      } else if (item.item) {
        // It's a folder
        const folderId = generateId();
        folders.push({
          id: folderId,
          collection_id: collectionId,
          name: item.name,
        });
        processItems(item.item, folderId);
      }
    });
  };

  if (json.item) processItems(json.item);

  return { collections, folders, requests };
}

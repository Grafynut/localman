import type { BodyViewMode, FormDataEntry, KeyValuePair, AuthConfig } from "./types";

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function emptyKeyValueRow(): KeyValuePair {
  return { id: generateId(), key: "", value: "", enabled: true };
}

export function emptyFormDataRow(): FormDataEntry {
  return { id: generateId(), key: "", value: "", type: "text", enabled: true };
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

export function methodBgColor(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-method-get";
    case "POST":
      return "bg-method-post";
    case "PUT":
      return "bg-method-put";
    case "DELETE":
      return "bg-method-delete";
    case "PATCH":
      return "bg-method-patch";
    default:
      return "bg-muted";
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

export function parseFormDataToRows(formDataJson?: string | null): FormDataEntry[] {
  if (!formDataJson) {
    return [emptyFormDataRow()];
  }

  try {
    const parsed = JSON.parse(formDataJson) as FormDataEntry[];
    return parsed.length > 0 ? [...parsed, emptyFormDataRow()] : [emptyFormDataRow()];
  } catch {
    return [emptyFormDataRow()];
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

export function formDataRowsToEntries(rows: FormDataEntry[]) {
  return rows.map((row) => ({
    key: row.key,
    value: row.value,
    type: row.type,
    enabled: row.enabled,
  }));
}

export function formatResponseBody(rawBody: string, mode: BodyViewMode) {
  if (mode === "raw" || mode === "preview") {
    return rawBody;
  }
  const trimmed = rawBody.trim();
  
  // JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(rawBody), null, 2);
    } catch {
      return rawBody;
    }
  }

  // HTML/XML simple formatter
  if (trimmed.startsWith("<")) {
    let formatted = "";
    let indent = 0;
    const tokens = rawBody.split(/(<[^>]*>)/g).filter(t => t.trim() !== "");
    
    tokens.forEach(token => {
      if (token.startsWith("</")) {
        indent--;
        formatted += "  ".repeat(Math.max(0, indent)) + token + "\n";
      } else if (token.startsWith("<") && !token.endsWith("/>") && !token.startsWith("<!") && !token.startsWith("<?")) {
        formatted += "  ".repeat(Math.max(0, indent)) + token + "\n";
        indent++;
      } else {
        formatted += "  ".repeat(Math.max(0, indent)) + token + "\n";
      }
    });
    return formatted.trim();
  }

  return rawBody;
}

export function resolveVariables(text: string, env: Record<string, string>): string {
  if (!text) return text;
  
  // Single pass resolution
  return text.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Dynamic variables
    if (trimmedKey.startsWith("$")) {
      switch (trimmedKey) {
        case "$guid":
          return crypto.randomUUID();
        case "$timestamp":
          return Math.floor(Date.now() / 1000).toString();
        case "$isoTimestamp":
          return new Date().toISOString();
        case "$randomInt":
          return Math.floor(Math.random() * 1001).toString();
        case "$randomEmail":
          return `user_${Math.random().toString(36).substring(7)}@example.com`;
        case "$randomPassword":
          return Math.random().toString(36).substring(2, 10) + "A1!";
        case "$randomFirstName":
          const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda"];
          return firstNames[Math.floor(Math.random() * firstNames.length)];
        case "$randomLastName":
          const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
          return lastNames[Math.floor(Math.random() * lastNames.length)];
        case "$randomCity":
          const cities = ["New York", "London", "Tokyo", "Paris", "Berlin", "Sydney", "Mumbai", "Sao Paulo"];
          return cities[Math.floor(Math.random() * cities.length)];
        case "$randomAlphaNumeric":
          return Math.random().toString(36).substring(2, 12);
        default:
          // Handle $randomInt(min, max)
          if (trimmedKey.startsWith("$randomInt(") && trimmedKey.endsWith(")")) {
            const parts = trimmedKey.substring(11, trimmedKey.length - 1).split(",");
            if (parts.length === 2) {
              const min = parseInt(parts[0].trim());
              const max = parseInt(parts[1].trim());
              if (!isNaN(min) && !isNaN(max)) {
                return Math.floor(Math.random() * (max - min + 1) + min).toString();
              }
            }
          }
          return match;
      }
    }
    
    return env[trimmedKey] !== undefined ? env[trimmedKey] : match;
  });
}

export function resolveAuthVariables(auth: AuthConfig, context: Record<string, string>): AuthConfig {
  if (!auth || auth.type === "none") return auth;
  const resolved = { ...auth };
  if (resolved.bearer && resolved.bearer.token) {
    resolved.bearer = { token: resolveVariables(resolved.bearer.token, context) };
  }
  if (resolved.basic) {
    resolved.basic = {
      username: resolveVariables(resolved.basic.username || "", context),
      password: resolveVariables(resolved.basic.password || "", context),
    };
  }
  if (resolved.apikey) {
    resolved.apikey = {
      ...resolved.apikey,
      key: resolveVariables(resolved.apikey.key || "", context),
      value: resolveVariables(resolved.apikey.value || "", context),
    };
  }
  return resolved;
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

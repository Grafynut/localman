import { Check, Code as CodeIcon, Copy, X } from "lucide-react";
import { useState, useMemo } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  responseBody: string | null;
};

type Language = "cURL" | "fetch" | "Axios" | "TanStack Query" | "tRPC" | "Python" | "Rust" | "Go" | "Java" | "C#" | "PHP" | "Dart" | "Swift" | "Kotlin" | "TypeScript";

function generateCurl(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let curl = `curl -X ${method} "${url}"`;
  for (const [k, v] of Object.entries(headers)) {
    curl += ` \\\n  -H "${k}: ${v}"`;
  }
  if (body) {
    const escapedBody = body.replace(/'/g, "'\\''");
    curl += ` \\\n  -d '${escapedBody}'`;
  }
  return curl;
}

function generateFetch(method: string, url: string, headers: Record<string, string>, body: string | null) {
  const options: Record<string, any> = { method };
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  if (body && method !== 'GET') {
    options.body = body.includes('\n') ? `___BODY_PLACEHOLDER___` : body;
  }
  
  let optionsStr = JSON.stringify(options, null, 2);
  if (optionsStr.includes('"___BODY_PLACEHOLDER___"')) {
    optionsStr = optionsStr.replace('"___BODY_PLACEHOLDER___"', `JSON.stringify(${body})`);
  }

  return `fetch("${url}", ${optionsStr})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error(error));`;
}

function generatePython(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let py = `import requests\n\nurl = "${url}"\n`;
  if (Object.keys(headers).length > 0) {
    py += `headers = ${JSON.stringify(headers, null, 2)}\n`;
  }
  if (body && method !== 'GET') {
    py += `data = '''${body}'''\n`;
  }
  py += `\nresponse = requests.request("${method}", url`;
  if (Object.keys(headers).length > 0) py += `, headers=headers`;
  if (body && method !== 'GET') py += `, data=data`;
  py += `)\n\nprint(response.text)`;
  return py;
}

function generateRust(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let rs = `use reqwest::Client;\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n    let client = Client::new();\n`;
  rs += `    let response = client.request(reqwest::Method::${method === 'GET' ? 'GET' : method === 'POST' ? 'POST' : method === 'PUT' ? 'PUT' : method === 'DELETE' ? 'DELETE' : 'PATCH'}, "${url}")\n`;
  for (const [k, v] of Object.entries(headers)) {
    rs += `        .header("${k}", "${v}")\n`;
  }
  if (body && method !== 'GET') {
    rs += `        .body(r#"${body}"#)\n`;
  }
  rs += `        .send()\n        .await?;\n\n    println!("{}", response.text().await?);\n    Ok(())\n}`;
  return rs;
}

function generateGo(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let go = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io"\n`;
  if (body && method !== 'GET') go += `\t"strings"\n`;
  go += `)\n\nfunc main() {\n\turl := "${url}"\n\tmethod := "${method}"\n\n`;
  
  if (body && method !== 'GET') {
    go += `\tpayload := strings.NewReader(\`${body.replace(/`/g, '`+"`"+`')}\`)\n\n`;
    go += `\tclient := &http.Client {}\n\treq, err := http.NewRequest(method, url, payload)\n`;
  } else {
    go += `\tclient := &http.Client {}\n\treq, err := http.NewRequest(method, url, nil)\n`;
  }
  
  go += `\n\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`;
  for (const [k, v] of Object.entries(headers)) {
    go += `\treq.Header.Add("${k}", "${v}")\n`;
  }
  go += `\n\tres, err := client.Do(req)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n\tdefer res.Body.Close()\n\n\tbody, err := io.ReadAll(res.Body)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n\tfmt.Println(string(body))\n}`;
  return go;
}

function generateJava(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let java = `import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\npublic class Main {\n    public static void main(String[] args) {\n        try {\n            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()\n                .uri(URI.create("${url}"));\n\n`;
  
  for (const [k, v] of Object.entries(headers)) {
    java += `            requestBuilder.header("${k}", "${v}");\n`;
  }
  
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n" +\n                "');
    if (method === 'POST') java += `\n            requestBuilder.POST(HttpRequest.BodyPublishers.ofString("${escapedBody}"));\n`;
    else if (method === 'PUT') java += `\n            requestBuilder.PUT(HttpRequest.BodyPublishers.ofString("${escapedBody}"));\n`;
    else if (method === 'DELETE') java += `\n            requestBuilder.method("DELETE", HttpRequest.BodyPublishers.ofString("${escapedBody}"));\n`;
    else java += `\n            requestBuilder.method("${method}", HttpRequest.BodyPublishers.ofString("${escapedBody}"));\n`;
  } else {
    if (method === 'GET') java += `\n            requestBuilder.GET();\n`;
    else java += `\n            requestBuilder.method("${method}", HttpRequest.BodyPublishers.noBody());\n`;
  }
  
  java += `\n            HttpRequest request = requestBuilder.build();\n            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());\n            System.out.println(response.body());\n        } catch (Exception e) {\n            e.printStackTrace();\n        }\n    }\n}`;
  return java;
}

function generateCSharp(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let cs = `using System;\nusing System.Net.Http;\nusing System.Threading.Tasks;\n`;
  if (body && method !== 'GET') cs += `using System.Text;\n`;
  cs += `\nclass Program {\n    static async Task Main() {\n        using var client = new HttpClient();\n        var request = new HttpRequestMessage(HttpMethod.${method === 'GET' ? 'Get' : method === 'POST' ? 'Post' : method === 'PUT' ? 'Put' : method === 'DELETE' ? 'Delete' : 'Patch'}, "${url}");\n\n`;
  
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'content-type') continue; // Handled in StringContent
    cs += `        request.Headers.Add("${k}", "${v}");\n`;
  }
  
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/"/g, '""');
    const contentType = headers['Content-Type'] || headers['content-type'] || 'text/plain';
    cs += `\n        request.Content = new StringContent(@"${escapedBody}", Encoding.UTF8, "${contentType}");\n`;
  }
  
  cs += `\n        var response = await client.SendAsync(request);\n        response.EnsureSuccessStatusCode();\n        var responseBody = await response.Content.ReadAsStringAsync();\n        Console.WriteLine(responseBody);\n    }\n}`;
  return cs;
}

function generatePhp(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let php = `<?php\n\n$curl = curl_init();\n\ncurl_setopt_array($curl, array(\n  CURLOPT_URL => '${url}',\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_ENCODING => '',\n  CURLOPT_MAXREDIRS => 10,\n  CURLOPT_TIMEOUT => 0,\n  CURLOPT_FOLLOWLOCATION => true,\n  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\n  CURLOPT_CUSTOMREQUEST => '${method}',\n`;
  
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/'/g, "\\'");
    php += `  CURLOPT_POSTFIELDS => '${escapedBody}',\n`;
  }
  
  if (Object.keys(headers).length > 0) {
    php += `  CURLOPT_HTTPHEADER => array(\n`;
    for (const [k, v] of Object.entries(headers)) {
      php += `    '${k}: ${v}',\n`;
    }
    php += `  ),\n`;
  }
  
  php += `));\n\n$response = curl_exec($curl);\n\ncurl_close($curl);\necho $response;\n`;
  return php;
}

function generateAxios(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let axiosStr = `import axios from "axios";\n\n`;
  
  const options: Record<string, any> = {
    method: method.toUpperCase(),
    url: url,
  };
  
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  
  if (body && method !== 'GET') {
    options.data = body.includes('\n') ? `___BODY_PLACEHOLDER___` : body;
  }
  
  let optionsStr = JSON.stringify(options, null, 2);
  if (optionsStr.includes('"___BODY_PLACEHOLDER___"')) {
    optionsStr = optionsStr.replace('"___BODY_PLACEHOLDER___"', `JSON.parse(${JSON.stringify(body)})`);
  } else if (options.data && typeof options.data === 'string' && options.data.trim().startsWith('{')) {
    // Attempt to format raw JSON string in the code
    try {
      optionsStr = optionsStr.replace(`"data": "${options.data}"`, `"data": ${options.data}`);
    } catch {}
  }
  
  axiosStr += `const options = ${optionsStr};\n\n`;
  axiosStr += `axios.request(options)\n  .then(function (response) {\n    console.log(response.data);\n  })\n  .catch(function (error) {\n    console.error(error);\n  });`;
  
  return axiosStr;
}

function generateDart(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let dart = `import 'package:http/http.dart' as http;\n`;
  if (body && method !== 'GET') dart += `import 'dart:convert';\n`;
  
  dart += `\nvoid main() async {\n  var request = http.Request('${method}', Uri.parse('${url}'));\n`;
  
  if (Object.keys(headers).length > 0) {
    dart += `\n  request.headers.addAll({\n`;
    for (const [k, v] of Object.entries(headers)) {
      dart += `    '${k}': '${v}',\n`;
    }
    dart += `  });\n`;
  }
  
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/'/g, "\\'");
    dart += `\n  request.body = '''${escapedBody}''';\n`;
  }
  
  dart += `\n  http.StreamedResponse response = await request.send();\n\n  if (response.statusCode == 200) {\n    print(await response.stream.bytesToString());\n  } else {\n    print(response.reasonPhrase);\n  }\n}`;
  return dart;
}

function generateSwift(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let swift = `import Foundation\n\nvar request = URLRequest(url: URL(string: "${url}")!,timeoutInterval: Double.infinity)\nrequest.httpMethod = "${method}"\n`;
  
  for (const [k, v] of Object.entries(headers)) {
    swift += `request.addValue("${v}", forHTTPHeaderField: "${k}")\n`;
  }
  
  if (body && method !== 'GET') {
    const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '\\n" +\n  "');
    swift += `\nlet postData = "{\\"data\\":\\"56535353\\",\\"users\\":{\\"token\\":\\"api/v1/users\\"}}".data(using: .utf8)\n`;
    swift += `let postData = "${escapedBody}".data(using: .utf8)\nrequest.httpBody = postData\n`;
  }
  
  swift += `\nlet task = URLSession.shared.dataTask(with: request) { data, response, error in \n  guard let data = data else {\n    print(String(describing: error))\n    return\n  }\n  print(String(data: data, encoding: .utf8)!)\n}\n\ntask.resume()\n`;
  return swift;
}

function generateKotlin(method: string, url: string, headers: Record<string, string>, body: string | null) {
  let kt = `import okhttp3.MediaType.Companion.toMediaType\nimport okhttp3.OkHttpClient\nimport okhttp3.Request\nimport okhttp3.RequestBody.Companion.toRequestBody\n\nfun main() {\n  val client = OkHttpClient()\n`;
  
  if (body && method !== 'GET') {
    const contentType = headers['Content-Type'] || headers['content-type'] || 'text/plain';
    const escapedBody = body.replace(/"/g, '""');
    kt += `  val mediaType = "${contentType}".toMediaType()\n`;
    kt += `  val body = """${escapedBody}""".toRequestBody(mediaType)\n`;
  }
  
  kt += `  val request = Request.Builder()\n    .url("${url}")\n`;
  
  if (body && method !== 'GET') {
    if (method === 'POST') kt += `    .post(body)\n`;
    else if (method === 'PUT') kt += `    .put(body)\n`;
    else if (method === 'PATCH') kt += `    .patch(body)\n`;
    else if (method === 'DELETE') kt += `    .delete(body)\n`;
    else kt += `    .method("${method}", body)\n`;
  } else {
    if (method === 'GET') kt += `    .get()\n`;
    else kt += `    .method("${method}", null)\n`;
  }
  
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'content-type') continue; // Handled by body
    kt += `    .addHeader("${k}", "${v}")\n`;
  }
  
  kt += `    .build()\n\n  val response = client.newCall(request).execute()\n  println(response.body?.string())\n}\n`;
  return kt;
}

function generateTanStackQuery(method: string, url: string, headers: Record<string, string>, body: string | null) {
  const hookName = `use${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}Request`;
  const isMutation = method !== "GET";

  let code = `import { ${isMutation ? "useMutation" : "useQuery"} } from "@tanstack/react-query";\nimport axios from "axios";\n\n`;
  code += `export const ${hookName} = () => {\n`;
  
  if (isMutation) {
    code += `  return useMutation({\n    mutationFn: async (data: any) => {\n      const response = await axios({\n        method: "${method}",\n        url: "${url}",\n`;
    if (Object.keys(headers).length > 0) code += `        headers: ${JSON.stringify(headers, null, 10).replace(/\n\s*}/, "\n        }")},\n`;
    code += `        data: data || ${body ? JSON.stringify(body) : "undefined"},\n      });\n      return response.data;\n    },\n  });\n};`;
  } else {
    code += `  return useQuery({\n    queryKey: ["${url}"],\n    queryFn: async () => {\n      const response = await axios({\n        method: "GET",\n        url: "${url}",\n`;
    if (Object.keys(headers).length > 0) code += `        headers: ${JSON.stringify(headers, null, 10).replace(/\n\s*}/, "\n        }")},\n`;
    code += `      });\n      return response.data;\n    },\n  });\n};`;
  }
  
  return code;
}

function generateTRPC(method: string, url: string, _headers: Record<string, string>, _body: string | null) {
  const procedureName = url.split("/").pop() || "myProcedure";
  const isMutation = method !== "GET";

  let code = `// Mock tRPC-like structure for the ${method} request\n`;
  code += `import { initTRPC } from '@trpc/server';\nimport { z } from 'zod';\n\nconst t = initTRPC.create();\n\nconst router = t.router({\n  ${procedureName}: t.procedure\n`;
  
  if (isMutation) {
    code += `    .input(z.object({ /* Add validation schema */ }))\n    .mutation(async ({ input }) => {\n      // Implementation\n      return { /* mocked response */ };\n    }),\n});`;
  } else {
    code += `    .input(z.object({ /* Add validation schema */ }))\n    .query(async ({ input }) => {\n      // Implementation\n      return { /* mocked response */ };\n    }),\n});`;
  }
  
  return code;
}

function jsonToInterface(jsonString: string): string {
  try {
    const obj = JSON.parse(jsonString);
    if (typeof obj !== 'object' || obj === null) {
      return `// Response is not a JSON object\ntype Response = ${typeof obj};`;
    }

    let result = `export interface Response {\n`;
    for (const [key, value] of Object.entries(obj)) {
      const type = typeof value;
      if (Array.isArray(value)) {
        if (value.length > 0) {
          result += `  ${key}: ${typeof value[0]}[];\n`;
        } else {
          result += `  ${key}: any[];\n`;
        }
      } else if (value === null) {
        result += `  ${key}: any | null;\n`;
      } else {
        result += `  ${key}: ${type};\n`;
      }
    }
    result += `}`;
    return result;
  } catch (err) {
    return "// Failed to parse response body as JSON. Cannot generate TypeScript interface.";
  }
}

export function CodeSnippetModal({ isOpen, onClose, method, url, headers, body, responseBody }: Props) {
  const [activeTab, setActiveTab] = useState<Language>("cURL");
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    switch (activeTab) {
      case "cURL": return generateCurl(method, url, headers, body);
      case "fetch": return generateFetch(method, url, headers, body);
      case "Axios": return generateAxios(method, url, headers, body);
      case "TanStack Query": return generateTanStackQuery(method, url, headers, body);
      case "tRPC": return generateTRPC(method, url, headers, body);
      case "Python": return generatePython(method, url, headers, body);
      case "Rust": return generateRust(method, url, headers, body);
      case "Go": return generateGo(method, url, headers, body);
      case "Java": return generateJava(method, url, headers, body);
      case "C#": return generateCSharp(method, url, headers, body);
      case "PHP": return generatePhp(method, url, headers, body);
      case "Axios": return generateAxios(method, url, headers, body);
      case "Dart": return generateDart(method, url, headers, body);
      case "Swift": return generateSwift(method, url, headers, body);
      case "Kotlin": return generateKotlin(method, url, headers, body);
      case "TypeScript": return responseBody ? jsonToInterface(responseBody) : "// No response body available";
      default: return "";
    }
  }, [activeTab, method, url, headers, body, responseBody]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const tabs: Language[] = ["cURL", "fetch", "Axios", "TanStack Query", "tRPC", "Python", "Rust", "Go", "Java", "C#", "PHP", "Dart", "Swift", "Kotlin", "TypeScript"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#1e1e1e] border border-border/50 shadow-2xl rounded-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col h-[70vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0 bg-surface/50 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <CodeIcon size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-100">Code Snippets</h2>
              <p className="text-[11px] text-muted">Generate code to make this request in your app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface rounded-md text-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-48 border-r border-border/40 py-2 bg-surface/20 shrink-0 flex flex-col gap-1 px-2 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 text-[13px] rounded-md transition-colors ${
                  activeTab === tab 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-surface/50 font-medium"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative group">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 z-10 p-2 bg-surface/50 hover:bg-surface border border-border/50 rounded-lg text-gray-300 hover:text-white transition-all shadow-lg backdrop-blur flex items-center gap-2 opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check size={14} className="text-method-get" /> : <Copy size={14} />}
              <span className={`text-[11px] font-bold tracking-wide ${copied ? 'text-method-get' : ''}`}>
                {copied ? 'COPIED' : 'COPY'}
              </span>
            </button>
            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              <pre className="text-[13px] font-mono leading-relaxed text-[#d4d4d4] selection:bg-primary/30">
                <code>{snippet}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

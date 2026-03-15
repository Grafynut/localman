import type { TestResult } from "../types";

export type ScriptContext = {
  environment: Record<string, string>;
  globals: Record<string, string>;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
  };
  response?: {
    status: number;
    body: string;
    headers: Record<string, string>;
  };
};

export type ExecutionResult = {
  environmentMutations: Record<string, string>;
  globalMutations: Record<string, string>;
  requestMutations: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
  };
  testResults: TestResult[];
  error?: string;
};

class ExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpectationError";
  }
}

export function executeScript(script: string, context: ScriptContext): ExecutionResult {
  const envMutations: Record<string, string> = { ...context.environment };
  const globalMutations: Record<string, string> = { ...context.globals };
  const reqMutations = { ...context.request };
  const tests: TestResult[] = [];

  const pm = {
    environment: {
      get: (key: string) => envMutations[key] || context.environment[key],
      set: (key: string, value: string) => {
        envMutations[key] = String(value);
      },
      unset: (key: string) => {
        delete envMutations[key];
      },
    },
    globals: {
      get: (key: string) => globalMutations[key] || context.globals[key],
      set: (key: string, value: string) => {
        globalMutations[key] = String(value);
      },
      unset: (key: string) => {
        delete globalMutations[key];
      },
    },
    variables: {
      get: (key: string) => globalMutations[key] || envMutations[key] || context.globals[key] || context.environment[key],
      set: (key: string, value: string) => {
        envMutations[key] = String(value);
      },
    },
    request: reqMutations,
    response: context.response
      ? {
          code: context.response.status,
          text: () => context.response!.body,
          json: () => {
            try {
              return JSON.parse(context.response!.body);
            } catch (e) {
              return null;
            }
          },
          headers: context.response.headers,
        }
      : undefined,
    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (err: any) {
        tests.push({ name, passed: false, error: err.message || String(err) });
      }
    },
    expect: (actual: any) => ({
      to: {
        equal: (expected: any) => {
          if (actual !== expected) throw new ExpectationError(`Expected ${expected} but got ${actual}`);
        },
        eql: (expected: any) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new ExpectationError(`Expected deeply equal objects`);
        },
        be: {
          true: () => { if (actual !== true) throw new ExpectationError(`Expected true but got ${actual}`); },
          false: () => { if (actual !== false) throw new ExpectationError(`Expected false but got ${actual}`); },
          ok: () => { if (!actual) throw new ExpectationError(`Expected truthy but got ${actual}`); },
          a: (type: string) => {
            if (typeof actual !== type) throw new ExpectationError(`Expected type ${type} but got ${typeof actual}`);
          }
        },
        include: (expected: any) => {
          if (!actual?.includes?.(expected)) throw new ExpectationError(`Expected to include ${expected}`);
        },
      },
    }),
  };

  try {
    // We use new Function to create a sandboxed scope.
    // We pass `pm` and `console` (can be overridden to capture logs in the future)
    const sandboxFn = new Function("pm", `
      ${script}
    `);
    sandboxFn(pm);

    return {
      environmentMutations: envMutations,
      globalMutations: globalMutations,
      requestMutations: pm.request,
      testResults: tests,
    };
  } catch (error: any) {
    return {
      environmentMutations: envMutations,
      globalMutations: globalMutations,
      requestMutations: pm.request,
      testResults: tests,
      error: error.message || String(error),
    };
  }
}

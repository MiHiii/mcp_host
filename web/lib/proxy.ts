export interface ProxyConfig {
  gatewayUrl: string;
  token: string;
}

const PLACEHOLDER = "replace-me-placeholder";

export function loadProxyConfig(
  env: Record<string, string | undefined> = process.env
): ProxyConfig | null {
  const gatewayUrl = env.GATEWAY_URL?.trim();
  const token = env.GATEWAY_TOKEN?.trim();
  if (!gatewayUrl || !token || token === PLACEHOLDER) return null;
  return { gatewayUrl, token };
}

export type PromptValidationResult =
  | { ok: true; prompt: string }
  | { ok: false; status: number; code: string; message: string };

const MAX_PROMPT_BYTES = 1024 * 1024; // 1MB body cap (rules/security.md)

export function validatePrompt(json: unknown): PromptValidationResult {
  if (typeof json !== "object" || json === null) {
    return { ok: false, status: 400, code: "VALIDATION_FAILED", message: "Body must be JSON." };
  }
  const prompt = (json as Record<string, unknown>).prompt;
  if (typeof prompt !== "string") {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Missing required field: prompt.",
    };
  }
  const empty = (prompt: string) => prompt.length === 0;
  if (empty(prompt)) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Prompt is empty.",
    };
  }
  if (!prompt.trim()) {
    return {
      ok: false,
      status: 422,
      code: "INVALID_CONTENT",
      message: "Prompt is whitespace only.",
    };
  }
  if (Buffer.byteLength(prompt, "utf8") > MAX_PROMPT_BYTES) {
    return { ok: false, status: 400, code: "VALIDATION_FAILED", message: "Prompt too large." };
  }
  return { ok: true, prompt: prompt.trim() };
}

export function isOversizedBody(bytes: number): boolean {
  return bytes > MAX_PROMPT_BYTES;
}
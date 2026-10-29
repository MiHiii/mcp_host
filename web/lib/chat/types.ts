export interface ToolEventData {
  type: "tool";
  name: string;
  status: "start" | "result";
  bytes: number;
}

export interface TextEventData {
  type: "text";
  text: string;
}

export type StreamData = TextEventData | ToolEventData;

export type ChatEvent =
  | { type: "start"; request_id: string; model: string }
  | { type: "stream"; data: StreamData }
  | { type: "final"; text: string }
  | { type: "error"; code: string; message: string }
  | { type: "id"; note: string };

export interface ProxyErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

export const ERROR_COPY: Record<string, string> = {
  TOO_MANY_REQUESTS: "The server is at capacity. Try again shortly.",
  CANCELLED: "The request was cancelled.",
  LLM_FAILURE: "The language model failed. Please try again.",
  MCP_ERROR: "A tool call failed. The agent may have partially completed.",
  ITERATION_LIMIT: "The agent hit its step limit without a final answer.",
  BAD_GATEWAY: "The chat service returned an unexpected response.",
  VALIDATION_FAILED: "Please enter a prompt before sending.",
  INVALID_CONTENT: "The prompt is empty or blank.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};
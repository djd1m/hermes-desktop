/**
 * A2A (Agent-to-Agent) HTTP+SSE client for Cloud.ru AI Agents.
 * Sends a task to a cloud agent's publicUrl and streams the response.
 */

import type { A2ACallOptions, A2AResult, DelegationProgressEvent } from "./types";

/** Maximum response size to protect local LLM context */
const MAX_RESPONSE_CHARS = 32_000;

/** WAF headers required by cloud.ru console APIs */
const CLOUDRU_HEADERS = {
  "front-initiator-namespace": "agent-space",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://console.cloud.ru",
  Referer: "https://console.cloud.ru/",
} as const;

/**
 * Execute an A2A call to a Cloud.ru AI Agent.
 * Supports SSE streaming for progress events.
 */
export async function callA2A(
  opts: A2ACallOptions,
  onProgress?: (event: DelegationProgressEvent) => void,
): Promise<A2AResult> {
  const startTime = Date.now();
  const controller = new AbortController();

  // Timeout via AbortController
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const body = JSON.stringify({
      task: opts.task,
      context: opts.context ?? "",
    });

    const response = await fetch(`${opts.publicUrl}/a2a`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        Accept: "text/event-stream, application/json",
        ...CLOUDRU_HEADERS,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`A2A request failed (${response.status}): ${errBody}`);
    }

    const contentType = response.headers.get("content-type") ?? "";

    // SSE streaming response
    if (contentType.includes("text/event-stream")) {
      return await handleSSEResponse(response, startTime, onProgress);
    }

    // Regular JSON response
    const data = await response.json();
    const content = String(data.content ?? data.result ?? data.message ?? "");
    const truncated = content.length > MAX_RESPONSE_CHARS;

    onProgress?.({ type: "done", content });

    return {
      content: truncated
        ? content.slice(0, MAX_RESPONSE_CHARS) + "\n\n[...response truncated]"
        : content,
      truncated,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `A2A request timed out after ${opts.timeoutMs / 1000}s`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Parse SSE stream and accumulate response content */
async function handleSSEResponse(
  response: Response,
  startTime: number,
  onProgress?: (event: DelegationProgressEvent) => void,
): Promise<A2AResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body for SSE stream");

  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            const chunk =
              event.content ??
              event.choices?.[0]?.delta?.content ??
              event.text ??
              "";

            if (chunk) {
              accumulated += chunk;
              onProgress?.({ type: "chunk", content: chunk });

              // Enforce size limit during streaming
              if (accumulated.length > MAX_RESPONSE_CHARS) {
                reader.cancel();
                return {
                  content:
                    accumulated.slice(0, MAX_RESPONSE_CHARS) +
                    "\n\n[...response truncated]",
                  truncated: true,
                  durationMs: Date.now() - startTime,
                };
              }
            }

            if (event.progress !== undefined) {
              onProgress?.({ type: "progress", progress: event.progress });
            }
          } catch {
            // Non-JSON SSE data — treat as plain text chunk
            if (data) {
              accumulated += data;
              onProgress?.({ type: "chunk", content: data });
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const truncated = accumulated.length > MAX_RESPONSE_CHARS;
  onProgress?.({ type: "done", content: accumulated });

  return {
    content: truncated
      ? accumulated.slice(0, MAX_RESPONSE_CHARS) + "\n\n[...response truncated]"
      : accumulated,
    truncated,
    durationMs: Date.now() - startTime,
  };
}

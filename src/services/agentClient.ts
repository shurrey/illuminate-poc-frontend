import { authService } from "@/services/authService";
import type { MessageRole, StreamingEvent } from "@/types/chat";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

export interface ConversationSummary {
  context_id: string;
  title: string;
  /** Unix seconds. */
  updated_at: number;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

export class ConversationNotFound extends Error {}

class AgentClient {
  async *sendMessageStreaming(
    text: string,
    contextId?: string,
    signal?: AbortSignal,
    requestId?: string
  ): AsyncGenerator<StreamingEvent> {
    const messageId = crypto.randomUUID();
    const reqId = requestId || messageId;

    const request = {
      jsonrpc: "2.0",
      method: "message/stream",
      params: {
        message: {
          role: "user" as MessageRole,
          parts: [{ type: "text", text }],
          messageId,
          contextId: contextId || crypto.randomUUID(),
        },
      },
      id: reqId,
      request_id: reqId,
    };

    const response = await authService.authedFetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          yield JSON.parse(line.slice(6));
        }
      }
    }
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const resp = await authService.authedFetch(`${API_URL}/api/conversations`);
    if (!resp.ok) throw new Error(`Could not load your conversations (${resp.status})`);
    return (await resp.json()).conversations;
  }

  /** Throws ConversationNotFound when the conversation is gone or belongs to someone else. */
  async getConversation(contextId: string): Promise<StoredMessage[]> {
    const resp = await authService.authedFetch(`${API_URL}/api/conversations/${encodeURIComponent(contextId)}`);
    if (resp.status === 404) throw new ConversationNotFound(contextId);
    if (!resp.ok) throw new Error(`Could not load the conversation (${resp.status})`);
    return (await resp.json()).messages;
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    try {
      const response = await authService.authedFetch(`${API_URL}/api/chat/cancel/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result.success === true;
    } catch {
      return false;
    }
  }
}

export const agentClient = new AgentClient();

import { authService } from "@/services/authService";
import type { Message, AgentResponse, Artifact, MessageRole, StreamingEvent } from "@/types/chat";

const API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

class AgentClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await authService.getValidToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

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

    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(await this.getAuthHeaders()),
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

  async cancelRequest(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/chat/cancel/${requestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await this.getAuthHeaders()),
        },
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

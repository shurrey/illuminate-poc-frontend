export type MessageRole = "user" | "assistant" | "system";
export type ArtifactType = "table" | "chart" | "text" | "error" | "sql";
export type ChartType = "bar" | "line" | "pie" | "scatter" | "heatmap" | "histogram";

export interface ChartConfig {
  chart_type: ChartType;
  title: string;
  x_axis: string;
  y_axis: string;
  data: Record<string, unknown>[];
  x_label?: string;
  y_label?: string;
  color_by?: string;
}

export interface TableData {
  rows: Record<string, unknown>[];
  columns: string[];
}

export interface QueryParameter {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  data: ChartConfig | TableData | string;
  title?: string;
  description?: string;
  parameters?: QueryParameter[];
}

export interface MessagePart {
  type: "text" | "artifact";
  content: string | Record<string, unknown>;
}

export interface Message {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  artifacts: Artifact[];
  timestamp: string;
  contextId?: string;
  thinkingSteps?: ThinkingStep[];
}

export interface QuerySuggestion {
  id: string;
  text: string;
  category: "courses" | "grades" | "students" | "engagement";
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  contextId: string | null;
}

export interface AgentResponse {
  text: string;
  artifacts: Artifact[];
  contextId?: string;
  context_id?: string;
  sources?: string[];
  visualization?: ChartConfig;
}

export interface StreamingEvent {
  type: "status" | "routing" | "thinking" | "tool_call" | "tool_result" | "text" | "complete" | "error" | "cancelled";
  message?: string;
  agent?: string;
  data?: AgentResponse;
  context_id?: string;
  content?: string;
  accumulated?: string;
  tool?: string;
  tool_id?: number;
  input?: Record<string, unknown>;
}

export interface ThinkingStep {
  type: "thinking" | "tool_call";
  agent: string;
  content?: string;
  tool?: string;
  tool_id?: number;
  timestamp: string;
}

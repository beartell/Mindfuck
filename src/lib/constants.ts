// Node colors by type
export const NODE_COLORS = {
  user: "#8b5cf6", // Purple
  ai_generated: "#06b6d4", // Cyan
  expanded: "#10b981", // Emerald
  selected: "#f59e0b", // Amber (highlight)
} as const;

// Edge colors by type
export const EDGE_COLORS = {
  manual: "#6366f1", // Indigo
  ai_expansion: "#06b6d4", // Cyan
  ai_summary: "#10b981", // Emerald
  ai_related: "#f59e0b", // Amber
} as const;

// Time Capsule - each node gets a unique color from this palette
export const TIMELINE_PALETTE = [
  "#f43f5e", // Rose
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#a855f7", // Purple
  "#6366f1", // Indigo
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
] as const;

// Default world colors for selection
export const WORLD_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#3b82f6",
] as const;

// LLM defaults
export const DEFAULT_LLM_CONFIG = {
  provider: "ollama" as const,
  model: "llama3.1:8b",
  base_url: "http://localhost:11434",
  embedding_model: "nomic-embed-text",
  embedding_dimensions: 1024,
  temperature: 0.7,
  max_tokens: 2048,
};

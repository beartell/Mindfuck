export type LLMProvider = "ollama" | "openai" | "gemini" | "lmstudio" | "llamacpp";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  base_url: string;
  api_key?: string;
  embedding_model: string;
  embedding_dimensions: number;
  temperature: number;
  max_tokens: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  references?: string[]; // node IDs referenced in the response
}

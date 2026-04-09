import { create } from "zustand";
import type { ChatMessage } from "@/types/llm";
import { ragChat } from "@/services/llm";
import { useSettingsStore } from "./useSettingsStore";
import { useGraphStore } from "./useGraphStore";

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const { llmConfig } = useSettingsStore.getState();
      const { nodes } = useGraphStore.getState();

      // Simple keyword-based context retrieval (will upgrade to vector search later)
      const words = content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const contextNodes = nodes
        .filter((n) => {
          const text = `${n.title} ${n.content_plain}`.toLowerCase();
          return words.some((w) => text.includes(w));
        })
        .slice(0, 5)
        .map((n) => ({ title: n.title, content: n.content, id: n.id }));

      // Build chat history for context
      const chatHistory = get()
        .messages.slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const { answer, referencedNodeIds } = await ragChat(
        llmConfig,
        content,
        contextNodes,
        chatHistory
      );

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: answer,
        timestamp: new Date().toISOString(),
        references: referencedNodeIds,
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error: any) {
      const errorMsg = error.message || "Failed to get response";
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
        error: errorMsg,
      }));
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));

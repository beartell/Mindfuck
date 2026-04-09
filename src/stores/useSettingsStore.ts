import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LLMConfig } from "@/types/llm";
import { DEFAULT_LLM_CONFIG } from "@/lib/constants";

export type ThemeMode = "dark" | "light";

interface SettingsStore {
  llmConfig: LLMConfig;
  theme: ThemeMode;
  isChatPanelOpen: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;

  updateLLMConfig: (config: Partial<LLMConfig>) => void;
  setLLMConfig: (config: LLMConfig) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleChatPanel: () => void;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
}

function applyThemeToDOM(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      llmConfig: DEFAULT_LLM_CONFIG,
      theme: "dark" as ThemeMode,
      isChatPanelOpen: false,
      isSidebarOpen: true,
      isSettingsOpen: false,

      updateLLMConfig: (config) =>
        set((s) => ({ llmConfig: { ...s.llmConfig, ...config } })),

      setLLMConfig: (config) => set({ llmConfig: config }),

      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        applyThemeToDOM(next);
        set({ theme: next });
      },

      toggleChatPanel: () => set((s) => ({ isChatPanelOpen: !s.isChatPanelOpen })),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    }),
    {
      name: "mindfuck-settings",
      partialize: (s) => ({
        llmConfig: s.llmConfig,
        isSidebarOpen: s.isSidebarOpen,
        theme: s.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeToDOM(state.theme);
      },
    }
  )
);

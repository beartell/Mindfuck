import { create } from "zustand";
import type { World, CreateWorldInput } from "@/types/world";
import { invoke } from "@tauri-apps/api/core";

interface WorldStore {
  worlds: World[];
  activeWorld: World | null;
  isLoading: boolean;

  // Actions
  loadWorlds: () => Promise<void>;
  createWorld: (input: CreateWorldInput) => Promise<World>;
  setActiveWorld: (world: World | null) => void;
  deleteWorld: (id: string) => Promise<void>;
}

export const useWorldStore = create<WorldStore>((set, get) => ({
  worlds: [],
  activeWorld: null,
  isLoading: false,

  loadWorlds: async () => {
    set({ isLoading: true });
    try {
      const worlds = await invoke<World[]>("get_all_worlds");
      set({ worlds, isLoading: false });
    } catch (error) {
      console.error("Failed to load worlds:", error);
      set({ isLoading: false });
    }
  },

  createWorld: async (input: CreateWorldInput) => {
    const world = await invoke<World>("create_world", { input });
    set((state) => ({ worlds: [world, ...state.worlds] }));
    return world;
  },

  setActiveWorld: (world: World | null) => {
    set({ activeWorld: world });
  },

  deleteWorld: async (id: string) => {
    await invoke("delete_world", { id });
    const { activeWorld } = get();
    set((state) => ({
      worlds: state.worlds.filter((w) => w.id !== id),
      activeWorld: activeWorld?.id === id ? null : activeWorld,
    }));
  },
}));

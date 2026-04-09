/**
 * Tauri invoke wrappers for database operations.
 * These are thin wrappers around Tauri's invoke API for type safety.
 */
import { invoke } from "@tauri-apps/api/core";
import type { World, CreateWorldInput } from "@/types/world";
import type {
  KnowledgeNode,
  CreateNodeInput,
  UpdateNodeInput,
} from "@/types/node";
import type { Edge, CreateEdgeInput } from "@/types/edge";

// World operations
export const worldDB = {
  getAll: () => invoke<World[]>("get_all_worlds"),
  get: (id: string) => invoke<World>("get_world", { id }),
  create: (input: CreateWorldInput) => invoke<World>("create_world", { input }),
  update: (
    id: string,
    name: string,
    description?: string,
    color?: string
  ) =>
    invoke<World>("update_world", { id, name, description, color }),
  delete: (id: string) => invoke<void>("delete_world", { id }),
};

// Node operations
export const nodeDB = {
  getByWorld: (worldId: string) =>
    invoke<KnowledgeNode[]>("get_nodes_by_world", { worldId }),
  get: (id: string) => invoke<KnowledgeNode>("get_node", { id }),
  create: (input: CreateNodeInput) =>
    invoke<KnowledgeNode>("create_node", { input }),
  update: (id: string, input: UpdateNodeInput) =>
    invoke<KnowledgeNode>("update_node", { id, input }),
  delete: (id: string) => invoke<void>("delete_node", { id }),
};

// Edge operations
export const edgeDB = {
  getByWorld: (worldId: string) =>
    invoke<Edge[]>("get_edges_by_world", { worldId }),
  create: (input: CreateEdgeInput) =>
    invoke<Edge>("create_edge", { input }),
  delete: (id: string) => invoke<void>("delete_edge", { id }),
};

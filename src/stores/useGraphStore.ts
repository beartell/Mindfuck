import { create } from "zustand";
import type { KnowledgeNode, CreateNodeInput, UpdateNodeInput, GraphData, GraphNode, GraphLink } from "@/types/node";
import type { Edge, CreateEdgeInput } from "@/types/edge";
import { invoke } from "@tauri-apps/api/core";
import { EDGE_COLORS } from "@/lib/constants";

interface GraphStore {
  nodes: KnowledgeNode[];
  edges: Edge[];
  selectedNode: KnowledgeNode | null;
  hoveredNode: KnowledgeNode | null;
  flashNodeId: string | null;
  isLoading: boolean;
  isBusy: boolean;
  busyMessage: string;
  busyWorldId: string | null;   // Which world the busy operation belongs to
  busyCancelled: boolean;       // Signal to abort running operation

  getGraphData: () => GraphData;

  loadGraphData: (worldId: string) => Promise<void>;
  createNode: (input: CreateNodeInput) => Promise<KnowledgeNode>;
  updateNode: (id: string, input: UpdateNodeInput) => Promise<KnowledgeNode>;
  deleteNode: (id: string) => Promise<void>;
  selectNode: (node: KnowledgeNode | null) => void;
  setHoveredNode: (node: KnowledgeNode | null) => void;
  setFlashNodeId: (id: string | null) => void;
  setBusy: (busy: boolean, message?: string, worldId?: string) => void;
  cancelBusy: () => void;
  createEdge: (input: CreateEdgeInput) => Promise<Edge>;
  deleteEdge: (id: string) => Promise<void>;
  clearGraph: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  hoveredNode: null,
  flashNodeId: null,
  isLoading: false,
  isBusy: false,
  busyMessage: "",
  busyWorldId: null,
  busyCancelled: false,

  getGraphData: (): GraphData => {
    const { nodes, edges } = get();

    // Use each node's own color - this is what makes each node visually distinct
    const graphNodes: GraphNode[] = nodes.map((node) => ({
      id: node.id,
      name: node.title || "Untitled",
      val: node.size,
      color: node.color,   // Always use the node's own stored color
      nodeType: node.node_type,
      data: node,
    }));

    const graphLinks: GraphLink[] = edges.map((edge) => ({
      source: edge.source_id,
      target: edge.target_id,
      color: EDGE_COLORS[edge.edge_type as keyof typeof EDGE_COLORS] || EDGE_COLORS.manual,
      label: edge.label || undefined,
    }));

    return { nodes: graphNodes, links: graphLinks };
  },

  loadGraphData: async (worldId: string) => {
    set({ isLoading: true });
    try {
      const [nodes, edges] = await Promise.all([
        invoke<KnowledgeNode[]>("get_nodes_by_world", { worldId }),
        invoke<Edge[]>("get_edges_by_world", { worldId }),
      ]);
      set({ nodes, edges, isLoading: false, selectedNode: null });
    } catch (error) {
      console.error("Failed to load graph data:", error);
      set({ isLoading: false });
    }
  },

  createNode: async (input: CreateNodeInput) => {
    const node = await invoke<KnowledgeNode>("create_node", { input });
    set((state) => ({ nodes: [...state.nodes, node] }));
    return node;
  },

  updateNode: async (id: string, input: UpdateNodeInput) => {
    const node = await invoke<KnowledgeNode>("update_node", { id, input });
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? node : n)),
      selectedNode: state.selectedNode?.id === id ? node : state.selectedNode,
    }));
    return node;
  },

  deleteNode: async (id: string) => {
    await invoke("delete_node", { id });
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source_id !== id && e.target_id !== id),
      selectedNode: state.selectedNode?.id === id ? null : state.selectedNode,
    }));
  },

  selectNode: (node) => set({ selectedNode: node }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setFlashNodeId: (id) => set({ flashNodeId: id }),
  setBusy: (busy, message = "", worldId) => set((s) => ({
    isBusy: busy,
    busyMessage: message,
    busyWorldId: worldId !== undefined ? worldId : s.busyWorldId,
    busyCancelled: busy ? false : s.busyCancelled, // Reset cancel flag when starting
  })),
  cancelBusy: () => set({ busyCancelled: true, isBusy: false, busyMessage: "", busyWorldId: null }),

  createEdge: async (input: CreateEdgeInput) => {
    const edge = await invoke<Edge>("create_edge", { input });
    set((state) => ({ edges: [...state.edges, edge] }));
    return edge;
  },

  deleteEdge: async (id: string) => {
    await invoke("delete_edge", { id });
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
  },

  clearGraph: () => set({ nodes: [], edges: [], selectedNode: null, hoveredNode: null, flashNodeId: null, isBusy: false, busyMessage: "", busyWorldId: null, busyCancelled: false }),
}));

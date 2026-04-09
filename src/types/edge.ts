export type EdgeType = "manual" | "ai_expansion" | "ai_summary" | "ai_related";

export interface Edge {
  id: string;
  world_id: string;
  source_id: string;
  target_id: string;
  label?: string;
  edge_type: EdgeType;
  weight: number;
  created_at: string;
}

export interface CreateEdgeInput {
  id: string;
  world_id: string;
  source_id: string;
  target_id: string;
  label?: string;
  edge_type?: EdgeType;
  weight?: number;
}

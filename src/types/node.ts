export type NodeType = "user" | "ai_generated" | "expanded";

export interface KnowledgeNode {
  id: string;
  world_id: string;
  title: string;
  content: string;
  content_plain: string;
  node_type: NodeType;
  position_x: number;
  position_y: number;
  position_z: number;
  color: string;
  size: number;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeInput {
  id: string;
  world_id: string;
  title?: string;
  content?: string;
  content_plain?: string;
  node_type?: NodeType;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  color?: string;
  size?: number;
  metadata?: string;
}

export interface UpdateNodeInput {
  title?: string;
  content?: string;
  content_plain?: string;
  position_x?: number;
  position_y?: number;
  position_z?: number;
  color?: string;
  size?: number;
  metadata?: string;
}

/** Graph data format for r3f-forcegraph */
export interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  nodeType: NodeType;
  // original data reference
  data: KnowledgeNode;
}

export interface GraphLink {
  source: string;
  target: string;
  color: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type NodeType = "root" | "memory";
export type Owner = "random" | "cherry";

export interface GraphNode {
  id: string;
  type: NodeType;
  owner: Owner;
  title: string;
  paragraph?: string;
  createdAt?: string;
  // Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  // Display
  radius: number;
  expanded: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface MemoryGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { GraphNode, GraphEdge } from "../types";

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
  fx: number | null;
  fy: number | null;
}

interface UseForceSimulationOptions {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useForceSimulation({
  width,
  height,
  nodes,
  edges,
}: UseForceSimulationOptions) {
  const simRef = useRef<Simulation | null>(null);
  const [tick, setTick] = useState(0);

  // Initialize simulation
  useEffect(() => {
    if (width === 0 || height === 0) return;

    const simNodes: SimNode[] = nodes.map((n) => ({
      ...n,
      x: n.x || width / 2 + (Math.random() - 0.5) * 200,
      y: n.y || height / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));

    const simEdges: SimulationLinkDatum<SimNode>[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const simulation = forceSimulation(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simEdges)
          .id((d) => d.id)
          .distance(180)
          .strength(0.2)
      )
      .force(
        "charge",
        forceManyBody<SimNode>()
          .strength(-300)
          .distanceMax(400)
      )
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => d.radius + 8)
          .strength(0.8)
          .iterations(2)
      )
      .alphaDecay(0.02)
      .velocityDecay(0.3)
      .on("tick", () => {
        setTick((t) => t + 1);
      });

    simRef.current = simulation;

    return () => {
      simulation.stop();
      simRef.current = null;
    };
  }, [nodes.length, edges.length, width, height]);

  // Get current node positions
  const getNodes = useCallback((): GraphNode[] => {
    if (!simRef.current) return nodes;
    return simRef.current.nodes().map((n) => ({
      id: n.id as string,
      type: (n as any).type,
      owner: (n as any).owner,
      title: (n as any).title,
      paragraph: (n as any).paragraph,
      createdAt: (n as any).createdAt,
      x: n.x ?? 0,
      y: n.y ?? 0,
      vx: n.vx ?? 0,
      vy: n.vy ?? 0,
      fx: n.fx ?? null,
      fy: n.fy ?? null,
      radius: (n as any).radius,
      expanded: (n as any).expanded,
    }));
  }, [nodes, tick]);

  const getEdges = useCallback((): GraphEdge[] => {
    if (!simRef.current) return edges;
    return (simRef.current as any).force("link")?.links()?.map((l: any) => ({
      source: l.source.id || l.source,
      target: l.target.id || l.target,
    })) || edges;
  }, [edges, tick]);

  const dragStart = useCallback((nodeId: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === nodeId) as any;
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    sim.alphaTarget(0.3).restart();
  }, []);

  const dragMove = useCallback((nodeId: string, x: number, y: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === nodeId) as any;
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  const dragEnd = useCallback((nodeId: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = sim.nodes().find((n) => n.id === nodeId) as any;
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    sim.alphaTarget(0);
  }, []);

  const reheat = useCallback(() => {
    simRef.current?.alpha(0.3).restart();
  }, []);

  const freeze = useCallback(() => {
    simRef.current?.stop();
  }, []);

  const unfreeze = useCallback(() => {
    simRef.current?.alpha(0.1).restart();
  }, []);

  return { getNodes, getEdges, dragStart, dragMove, dragEnd, reheat, freeze, unfreeze, tick };
}

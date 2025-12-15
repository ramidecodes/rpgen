"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Run } from "@/lib/db/schema";

type RelationshipsDialogProps = {
  run: Run;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  type: string;
  label: string;
  description: string | null;
  data: Record<string, unknown> | null;
};

type GraphEdge = d3.SimulationLinkDatum<GraphNode> & {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  weight: number;
};

type LayoutResult = {
  nodes: Array<GraphNode & { x: number; y: number }>;
  edges: Array<{
    source: string;
    target: string;
    relation: string;
    weight: number;
  }>;
};

const nodeColors: Record<string, string> = {
  npc: "#3b82f6",
  location: "#10b981",
  item: "#f59e0b",
  event: "#ef4444",
  faction: "#8b5cf6",
  concept: "#ec4899",
};

export function RelationshipsDialog({
  run,
  open,
  onOpenChange,
}: RelationshipsDialogProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [layout, setLayout] = useState<LayoutResult>({
    nodes: [],
    edges: [],
  });
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [ready, setReady] = useState(false);

  const arrowId = useMemo(
    () => `arrowhead-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      setViewportSize({ width, height });
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const relationships = run.relationships || { nodes: [], edges: [] };
    const nodes: GraphNode[] = (relationships.nodes || []).map((node) => ({
      ...node,
    }));
    const edges: GraphEdge[] = (relationships.edges || []).map((edge) => ({
      ...edge,
      weight: edge.weight ?? 0.5,
    }));

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const filteredEdges = edges.filter(
      (edge) =>
        nodesById.has(edge.source as string) &&
        nodesById.has(edge.target as string)
    );

    if (nodes.length === 0) {
      setError("No relationships to display");
      setLayout({ nodes: [], edges: [] });
      return;
    }

    const width = viewportSize.width || 800;
    const height = viewportSize.height || 600;

    if (width < 10 || height < 10) {
      setError("Graph area is too small to render");
      setLayout({ nodes: [], edges: [] });
      return;
    }

    setError(null);

    const seededNodes = nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height / 2 + (Math.random() - 0.5) * 80,
    }));

    const simulation = d3
      .forceSimulation(seededNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphEdge>(filteredEdges)
          .id((d) => d.id)
          .distance((d) => {
            const clamped = Math.max(0, Math.min(1, d.weight ?? 0));
            return 160 - clamped * 90;
          })
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(28));

    for (let i = 0; i < 200; i += 1) {
      simulation.tick();
    }
    simulation.stop();

    setLayout({
      nodes: seededNodes as Array<GraphNode & { x: number; y: number }>,
      edges: filteredEdges.map((edge) => ({
        source: edge.source as string,
        target: edge.target as string,
        relation: edge.relation,
        weight: edge.weight ?? 0.5,
      })),
    });
    setReady(true);
  }, [open, run.relationships, viewportSize]);

  useEffect(() => {
    if (!open || !svgRef.current || !ready) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    svg.call(zoom).on("dblclick.zoom", null);

    return () => {
      svg.on(".zoom", null);
    };
  }, [open, ready]);

  const relationships = run.relationships || { nodes: [], edges: [] };
  const width = viewportSize.width || 800;
  const height = viewportSize.height || 600;

  const nodeById = useMemo(() => {
    const map = new Map<string, GraphNode & { x: number; y: number }>();
    layout.nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [layout.nodes]);

  const getCharacterPortrait = (node: GraphNode) => {
    const imageUrl =
      (node.data?.imageUrl as string | undefined) ??
      (node.data?.portrait as string | undefined);
    if (typeof imageUrl === "string" && imageUrl.length > 0) {
      return imageUrl;
    }
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Knowledge Graph</DialogTitle>
          <DialogDescription>
            Interactive visualization of relationships between entities
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {relationships.nodes.length} entities,{" "}
              {relationships.edges.length} relationships
            </span>
            <span className="text-xs">
              (Drag to pan, scroll to zoom, click nodes for details)
            </span>
          </div>

          <div
            ref={wrapperRef}
            className="flex-1 border rounded-lg bg-background overflow-hidden relative"
          >
            {error ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {error}
              </div>
            ) : layout.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Preparing graph...
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${width} ${height}`}
                className="min-h-[500px]"
              >
                <defs>
                  <marker
                    id={arrowId}
                    viewBox="0 -5 10 10"
                    refX={22}
                    refY={0}
                    markerWidth={8}
                    markerHeight={8}
                    orient="auto"
                  >
                    <path d="M0,-5L10,0L0,5" fill="#94a3b8" />
                  </marker>
                </defs>
                <g
                  transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
                >
                  {layout.edges.map((edge, index) => {
                    const source = nodeById.get(edge.source);
                    const target = nodeById.get(edge.target);
                    if (!source || !target) return null;
                    return (
                      <g key={`${edge.source}-${edge.target}-${index}`}>
                        <line
                          x1={source.x ?? 0}
                          y1={source.y ?? 0}
                          x2={target.x ?? 0}
                          y2={target.y ?? 0}
                          stroke="#94a3b8"
                          strokeWidth={Math.max(1.5, edge.weight * 4)}
                          strokeOpacity={0.7}
                          markerEnd={`url(#${arrowId})`}
                        />
                        <text
                          x={((source.x ?? 0) + (target.x ?? 0)) / 2}
                          y={((source.y ?? 0) + (target.y ?? 0)) / 2 - 4}
                          fontSize={10}
                          fill="#e5e7eb"
                          stroke="#0f172a"
                          strokeWidth={2}
                          paintOrder="stroke fill"
                          textAnchor="middle"
                        >
                          {edge.relation || "related"}
                        </text>
                      </g>
                    );
                  })}

                  {layout.nodes.map((node) => {
                    const fill = nodeColors[node.type] || "#6b7280";
                    const portrait = getCharacterPortrait(node);
                    const clipId = `clip-${node.id}`;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x},${node.y})`}
                        className="transition-transform duration-150"
                      >
                        {portrait && (
                          <defs>
                            <clipPath id={clipId}>
                              <circle r={22} cx={0} cy={0} />
                            </clipPath>
                          </defs>
                        )}
                        <circle
                          r={22}
                          fill={portrait ? "transparent" : fill}
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                        {portrait ? (
                          <image
                            href={portrait}
                            x={-22}
                            y={-22}
                            width={44}
                            height={44}
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#${clipId})`}
                          />
                        ) : null}
                        <circle
                          r={22}
                          fill="transparent"
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          pointerEvents="none"
                        />
                        <text
                          x={0}
                          y={36}
                          fontSize={12}
                          fill="#e5e7eb"
                          textAnchor="middle"
                        >
                          {node.label}
                        </text>
                        <rect
                          x={-28}
                          y={-28}
                          width={56}
                          height={56}
                          fill="transparent"
                          onClick={() => setSelectedNode(node)}
                          className="cursor-pointer"
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}
          </div>

          {selectedNode && (
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-semibold mb-2">{selectedNode.label}</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Type: </span>
                  <span>{selectedNode.type}</span>
                </div>
                {selectedNode.description && (
                  <div>
                    <span className="text-muted-foreground">Description: </span>
                    <span>{selectedNode.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


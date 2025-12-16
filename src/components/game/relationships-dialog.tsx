"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { Core, EventObject, NodeSingular } from "cytoscape";
import type { Run } from "@/lib/db/schema";

type RelationshipsDialogProps = {
  run: Run;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type GraphNode = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  data: Record<string, unknown> | null;
};

type DatabaseNode = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  data: Record<string, unknown> | null;
};

type DatabaseEdge = {
  source: string;
  target: string;
  relation: string;
  weight: number;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);

  // Get character portrait URL from node data
  const getCharacterPortrait = useCallback(
    (node: GraphNode): string | undefined => {
      const imageUrl =
        (node.data?.imageUrl as string | undefined) ??
        (node.data?.portrait as string | undefined);
      if (typeof imageUrl === "string" && imageUrl.length > 0) {
        return imageUrl;
      }
      return undefined;
    },
    []
  );

  // Wait for container to have proper dimensions
  useEffect(() => {
    if (!open) {
      setContainerReady(false);
      return;
    }

    // Simple timeout - dialog animation should be done
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerReady(true);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      setContainerReady(false);
    };
  }, [open]);

  // Initialize Cytoscape instance only when container is ready
  useEffect(() => {
    if (!open || !containerRef.current || !containerReady) return;

    // Clean up existing instance if any
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const relationships = run.relationships || { nodes: [], edges: [] };
    const nodes: GraphNode[] = (relationships.nodes || []).map(
      (node: DatabaseNode): GraphNode => ({
        ...node,
      })
    );
    const edges = (relationships.edges || []).map((edge: DatabaseEdge) => ({
      ...edge,
      weight: edge.weight ?? 0.5,
    }));

    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    // Filter edges
    const filteredEdges = edges.filter(
      (edge) => nodesById.has(edge.source) && nodesById.has(edge.target)
    );

    if (nodes.length === 0) {
      setError("No relationships to display");
      return;
    }

    setError(null);

    // Convert nodes to Cytoscape format
    const cyNodes = nodes.map((node) => {
      const portrait = getCharacterPortrait(node);
      const color = nodeColors[node.type] || "#6b7280";

      return {
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          description: node.description,
          data: node.data,
          portrait: portrait,
          color: color,
        },
      };
    });

    // Convert edges to Cytoscape format
    const cyEdges = filteredEdges.map((edge, index) => ({
      data: {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
        weight: edge.weight,
      },
    }));

    // Initialize Cytoscape with grid layout in config
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: [
        // Minimal node style
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            width: 40,
            height: 40,
            label: "data(label)",
            "font-size": 12,
            color: "#fff",
          },
        },
        // Minimal edge style
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            // Edge label
            label: "data(relation)",
            "font-size": 10,
            color: "#e5e7eb",
            "text-outline-width": 2,
            "text-outline-color": "#0f172a",
            "text-outline-opacity": 0.8,
            "text-margin-y": -8,
            "text-rotation": "autorotate",
          },
        },
      ],
      layout: {
        name: "grid",
        rows: Math.ceil(Math.sqrt(cyNodes.length)),
        fit: true,
        padding: 30,
      },
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.1,
      boxSelectionEnabled: false,
      autounselectify: false,
      userPanningEnabled: true,
      userZoomingEnabled: true,
    });

    cyRef.current = cy;

    console.log("Cytoscape initialized:", {
      nodes: cy.nodes().length,
      edges: cy.edges().length,
    });

    // Handle node selection
    cy.on("tap", "node", (evt: EventObject) => {
      const node = evt.target as NodeSingular;
      const nodeData = node.data();
      setSelectedNode({
        id: nodeData.id as string,
        type: nodeData.type as string,
        label: nodeData.label as string,
        description: (nodeData.description as string | null) ?? null,
        data: (nodeData.data as Record<string, unknown> | null) ?? null,
      });
      // Deselect all nodes first
      cy.$("node:selected").unselect();
      // Select the clicked node
      node.select();
    });

    // Handle background click to deselect
    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.$("node:selected").unselect();
      }
    });

    // Handle resize
    const handleResize = () => {
      if (cy && containerRef.current) {
        cy.resize();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [open, run.relationships, getCharacterPortrait, containerReady]);

  // Update selected node highlighting when selection changes
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    if (selectedNode) {
      // Deselect all nodes first
      cy.$("node:selected").unselect();
      // Select the node
      const node = cy.$(`#${selectedNode.id}`);
      if (node.length > 0) {
        node.select();
        // Center on selected node
        cy.animate({
          center: { eles: node },
          zoom: Math.min(cy.zoom() * 1.2, 2),
        });
      }
    } else {
      cy.$("node:selected").unselect();
    }
  }, [selectedNode]);

  const relationships = run.relationships || { nodes: [], edges: [] };

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

          <div className="flex-1 border rounded-lg bg-background overflow-hidden relative">
            {error ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {error}
              </div>
            ) : (
              <div
                ref={containerRef}
                className="w-full h-full min-h-[500px] bg-slate-900"
                style={{
                  display: "block",
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: "500px",
                  overflow: "hidden",
                }}
              />
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

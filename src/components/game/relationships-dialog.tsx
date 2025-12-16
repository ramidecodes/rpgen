"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
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
  // Position will be added by layout algorithm
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphEdge = {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  weight: number;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [layout, setLayout] = useState<LayoutResult>({
    nodes: [],
    edges: [],
  });
  const [_cameraState, setCameraState] = useState({ x: 0, y: 0, zoom: 1 });
  const [ready, setReady] = useState(false);

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

  // Force-directed layout algorithm
  useEffect(() => {
    if (!open) return;

    const relationships = run.relationships || { nodes: [], edges: [] };
    const nodes: GraphNode[] = (relationships.nodes || []).map(
      (node: DatabaseNode): GraphNode => ({
        ...node,
      })
    );
    const edges: GraphEdge[] = (relationships.edges || []).map(
      (edge: DatabaseEdge): GraphEdge => ({
        ...edge,
        weight: edge.weight ?? 0.5,
      })
    );

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

    // Initialize nodes with random positions
    const seededNodes = nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height / 2 + (Math.random() - 0.5) * 80,
      vx: 0,
      vy: 0,
    }));

    // Force-directed layout simulation
    const simulateForces = (
      nodes: GraphNode[],
      edges: GraphEdge[],
      iterations: number = 200
    ) => {
      let alpha = 1;
      const alphaDecay = 1 - 0.001 ** (1 / iterations);
      const velocityDecay = 0.6;

      for (let i = 0; i < iterations; i++) {
        // Reset forces
        nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            node.vx = (node.vx || 0) * velocityDecay;
            node.vy = (node.vy || 0) * velocityDecay;
          }
        });

        // Link forces
        edges.forEach((edge) => {
          const source = nodesById.get(edge.source as string);
          const target = nodesById.get(edge.target as string);
          if (
            !source ||
            !target ||
            source.x === undefined ||
            source.y === undefined ||
            target.x === undefined ||
            target.y === undefined
          )
            return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance === 0) return;

          // Desired distance based on edge weight
          const clampedWeight = Math.max(0, Math.min(1, edge.weight ?? 0));
          const desiredDistance = 160 - clampedWeight * 90;

          const force = (distance - desiredDistance) * 0.01 * alpha;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          source.vx = (source.vx || 0) + fx;
          source.vy = (source.vy || 0) + fy;
          target.vx = (target.vx || 0) - fx;
          target.vy = (target.vy || 0) - fy;
        });

        // Repulsion forces (charge)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];

            if (
              nodeA.x === undefined ||
              nodeA.y === undefined ||
              nodeB.x === undefined ||
              nodeB.y === undefined
            )
              continue;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) continue;

            const force = (-280 / (distance * distance)) * alpha;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            nodeA.vx = (nodeA.vx || 0) - fx;
            nodeB.vx = (nodeB.vx || 0) + fx;
            nodeA.vy = (nodeA.vy || 0) - fy;
            nodeB.vy = (nodeB.vy || 0) + fy;
          }
        }

        // Center force
        const centerX = width / 2;
        const centerY = height / 2;
        nodes.forEach((node) => {
          if (node.x === undefined || node.y === undefined) return;

          const dx = centerX - node.x;
          const dy = centerY - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance === 0) return;

          const force = distance * 0.001 * alpha;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          node.vx = (node.vx || 0) + fx;
          node.vy = (node.vy || 0) + fy;
        });

        // Collision force
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];

            if (
              nodeA.x === undefined ||
              nodeA.y === undefined ||
              nodeB.x === undefined ||
              nodeB.y === undefined
            )
              continue;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const minDistance = 56; // 2 * 28 (collision radius)
            if (distance < minDistance && distance > 0) {
              const force = (minDistance - distance) * 0.1 * alpha;
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;

              nodeA.vx = (nodeA.vx || 0) - fx;
              nodeA.vy = (nodeA.vy || 0) - fy;
              nodeB.vx = (nodeB.vx || 0) + fx;
              nodeB.vy = (nodeB.vy || 0) + fy;
            }
          }
        }

        // Apply velocities
        nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            node.x += node.vx || 0;
            node.y += node.vy || 0;
          }
        });

        // Decay alpha
        alpha *= alphaDecay;
      }
    };

    // Run simulation
    simulateForces(seededNodes, filteredEdges, 200);

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

  // Initialize Three.js scene
  useEffect(() => {
    if (!open || !canvasRef.current || !ready) return;

    const width = viewportSize.width || 800;
    const height = viewportSize.height || 600;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark background
    sceneRef.current = scene;

    // Create orthographic camera for 2D view
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light for depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    // Add subtle background gradient effect
    const bgGeometry = new THREE.PlaneGeometry(width * 2, height * 2);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.1,
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.set(0, 0, -10);
    scene.add(background);

    return () => {
      // Cleanup
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        // Dispose all geometries and materials in the scene
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => {
                mat.dispose();
              });
            } else {
              object.material.dispose();
            }
          } else if (object instanceof THREE.Sprite) {
            object.material.dispose();
            if ((object.material as THREE.SpriteMaterial).map) {
              (object.material as THREE.SpriteMaterial).map?.dispose();
            }
          } else if (object instanceof THREE.Line) {
            object.geometry.dispose();
            object.material.dispose();
          }
        });
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      cameraRef.current = null;
    };
  }, [open, ready, viewportSize]);

  // Helper function to create text texture (pure Three.js, no HTML overlays)
  const createTextTexture = useCallback(
    (
      text: string,
      options: {
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        backgroundColor?: string;
        padding?: number;
      } = {}
    ) => {
      const {
        fontSize = 24,
        fontFamily = "Arial",
        color = "#ffffff",
        backgroundColor = "rgba(0, 0, 0, 0.7)",
        padding = 8,
      } = options;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return { texture: null, width: 0, height: 0 };
      context.font = `${fontSize}px ${fontFamily}`;

      const textMetrics = context.measureText(text);
      const width = textMetrics.width + padding * 2;
      const height = fontSize + padding * 2;

      canvas.width = width;
      canvas.height = height;

      // Clear canvas
      context.clearRect(0, 0, width, height);

      // Draw background
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);

      // Draw text
      context.fillStyle = color;
      context.font = `${fontSize}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, width / 2, height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;

      return { texture, width, height };
    },
    []
  );

  const getCharacterPortrait = useCallback((node: GraphNode) => {
    const imageUrl =
      (node.data?.imageUrl as string | undefined) ??
      (node.data?.portrait as string | undefined);
    if (typeof imageUrl === "string" && imageUrl.length > 0) {
      return imageUrl;
    }
    return undefined;
  }, []);

  // Helper function to create colored node
  const createColoredNode = useCallback(
    (node: GraphNode, parent: THREE.Group) => {
      const color = nodeColors[node.type] || "#6b7280";
      const geometry = new THREE.CircleGeometry(22, 32); // Match original SVG radius
      const material = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x || 0, -(node.y || 0), 0); // Flip Y for Three.js coordinate system
      mesh.userData = { node };

      // Add label using text texture sprite
      const {
        texture: labelTexture,
        width: labelWidth,
        height: labelHeight,
      } = createTextTexture(node.label, {
        fontSize: 16,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#e5e7eb",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        padding: 6,
      });

      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.scale.set(labelWidth / 50, labelHeight / 50, 1); // Scale down for 3D scene
      labelSprite.position.set(0, -1.2, 0); // Position below the node
      mesh.add(labelSprite);

      parent.add(mesh);
    },
    [createTextTexture]
  );

  // Render nodes
  useEffect(() => {
    if (!sceneRef.current || !layout.nodes.length) return;

    const scene = sceneRef.current;
    const nodesGroup = new THREE.Group();
    nodesGroup.name = "nodes";

    // Clear existing nodes
    const existingNodes = scene.getObjectByName("nodes");
    if (existingNodes) {
      scene.remove(existingNodes);
    }

    // Add point light for highlighting selected nodes
    const highlightLight = new THREE.PointLight(0xffffff, 2, 100);
    highlightLight.name = "highlight-light";
    scene.add(highlightLight);

    layout.nodes.forEach((node) => {
      const portrait = getCharacterPortrait(node);

      if (portrait) {
        // Create sprite with portrait texture
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          portrait,
          (texture) => {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(44, 44, 1); // Match original SVG size
            sprite.position.set(node.x || 0, -(node.y || 0), 0); // Flip Y for Three.js coordinate system
            sprite.userData = { node };

            // Add label using text texture sprite
            const {
              texture: labelTexture,
              width: labelWidth,
              height: labelHeight,
            } = createTextTexture(node.label, {
              fontSize: 16,
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#e5e7eb",
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              padding: 6,
            });

            const labelMaterial = new THREE.SpriteMaterial({
              map: labelTexture,
              transparent: true,
            });
            const labelSprite = new THREE.Sprite(labelMaterial);
            labelSprite.scale.set(labelWidth / 50, labelHeight / 50, 1); // Scale down for 3D scene
            labelSprite.position.set(0, -1.2, 0); // Position below the node
            sprite.add(labelSprite);

            nodesGroup.add(sprite);
          },
          undefined,
          (error) => {
            console.warn("Failed to load portrait texture:", error);
            // Fallback to colored circle
            createColoredNode(node, nodesGroup);
          }
        );
      } else {
        // Create colored circle
        createColoredNode(node, nodesGroup);
      }
    });

    return () => {
      // Cleanup node resources
      nodesGroup.children.forEach((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach((mat) => {
              mat.dispose();
            });
          } else {
            node.material.dispose();
          }
        } else if (node instanceof THREE.Sprite) {
          node.material.dispose();
          // Dispose texture if it exists
          if ((node.material as THREE.SpriteMaterial).map) {
            (node.material as THREE.SpriteMaterial).map?.dispose();
          }
        }
        // Clean up label sprites (children of nodes)
        node.children.forEach((child) => {
          if (child instanceof THREE.Sprite) {
            child.material.dispose();
            if ((child.material as THREE.SpriteMaterial).map) {
              (child.material as THREE.SpriteMaterial).map?.dispose();
            }
          }
        });
      });
      scene.remove(nodesGroup);
    };
  }, [
    layout.nodes,
    getCharacterPortrait,
    createColoredNode,
    createTextTexture,
  ]);

  // Update selected node highlighting
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const highlightLight = scene.getObjectByName(
      "highlight-light"
    ) as THREE.PointLight;
    const nodesGroup = scene.getObjectByName("nodes") as THREE.Group;

    if (!highlightLight || !nodesGroup) return;

    if (selectedNode) {
      // Position light above selected node
      const selectedNodeObj = nodesGroup.children.find(
        (obj) => obj.userData?.node?.id === selectedNode.id
      );

      if (selectedNodeObj) {
        highlightLight.position.set(
          selectedNodeObj.position.x,
          selectedNodeObj.position.y + 50,
          20
        );
        highlightLight.intensity = 2;

        // Add glow effect to selected node
        selectedNodeObj.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            (child.material as THREE.MeshLambertMaterial).emissive?.setHex(
              0x444444
            );
          } else if (child instanceof THREE.Sprite) {
            // For sprites, we could add a glow by creating an additional sprite
          }
        });
      }
    } else {
      highlightLight.intensity = 0;

      // Remove glow from all nodes
      nodesGroup.children.forEach((nodeObj) => {
        nodeObj.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            (child.material as THREE.MeshLambertMaterial).emissive?.setHex(
              0x000000
            );
          }
        });
      });
    }
  }, [selectedNode]);

  // Render edges
  useEffect(() => {
    if (!sceneRef.current || !layout.edges.length) return;

    const scene = sceneRef.current;
    const edgesGroup = new THREE.Group();
    edgesGroup.name = "edges";

    // Clear existing edges
    const existingEdges = scene.getObjectByName("edges");
    if (existingEdges) {
      scene.remove(existingEdges);
    }

    layout.edges.forEach((edge, _index) => {
      const sourceNode = layout.nodes.find((n) => n.id === edge.source);
      const targetNode = layout.nodes.find((n) => n.id === edge.target);

      if (
        !sourceNode ||
        !targetNode ||
        sourceNode.x === undefined ||
        sourceNode.y === undefined ||
        targetNode.x === undefined ||
        targetNode.y === undefined
      )
        return;

      // Create line geometry
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sourceNode.x, -sourceNode.y, 0),
        new THREE.Vector3(targetNode.x, -targetNode.y, 0),
      ]);

      // Line material with thickness based on weight
      const thickness = Math.max(1.5, edge.weight * 4);
      const material = new THREE.LineBasicMaterial({
        color: "#94a3b8",
        opacity: 0.7,
        transparent: true,
        linewidth: thickness, // Note: linewidth may not work in all browsers
      });

      const line = new THREE.Line(geometry, material);
      edgesGroup.add(line);

      // Add arrow at target
      const direction = new THREE.Vector3(
        targetNode.x - sourceNode.x,
        -(targetNode.y - sourceNode.y), // Flip Y
        0
      ).normalize();

      const arrowHelper = new THREE.ArrowHelper(
        direction,
        new THREE.Vector3(targetNode.x, -targetNode.y, 0),
        15, // length
        0x94a3b8, // color
        8, // head length
        6 // head width
      );
      arrowHelper.position.sub(direction.clone().multiplyScalar(15)); // Position arrow before target
      edgesGroup.add(arrowHelper);

      // Add edge label at midpoint using text texture sprite
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;

      const {
        texture: labelTexture,
        width: labelWidth,
        height: labelHeight,
      } = createTextTexture(edge.relation || "related", {
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#e5e7eb",
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        padding: 4,
      });

      const labelMaterial = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
      });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.scale.set(labelWidth / 80, labelHeight / 80, 1); // Scale down for 3D scene
      labelSprite.position.set(midX, -midY, 0);
      edgesGroup.add(labelSprite);
    });

    return () => {
      // Cleanup edge resources
      edgesGroup.children.forEach((edge) => {
        if (edge instanceof THREE.Line) {
          edge.geometry.dispose();
          edge.material.dispose();
        } else if (edge instanceof THREE.ArrowHelper) {
          // ArrowHelper cleanup
          edge.dispose?.();
        } else if (edge instanceof THREE.Sprite) {
          // Label sprite cleanup
          edge.material.dispose();
          if ((edge.material as THREE.SpriteMaterial).map) {
            (edge.material as THREE.SpriteMaterial).map?.dispose();
          }
        }
      });
      scene.remove(edgesGroup);
    };
  }, [layout.edges, layout.nodes, createTextTexture]);

  // Animation/render loop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    let animationTime = 0;

    const animate = (time: number) => {
      requestAnimationFrame(animate);
      animationTime = time * 0.001; // Convert to seconds

      // Animate nodes with subtle floating effect
      const nodesGroup = sceneRef.current?.getObjectByName("nodes");
      if (nodesGroup) {
        nodesGroup.children.forEach((nodeObj, index) => {
          if (
            nodeObj instanceof THREE.Mesh ||
            nodeObj instanceof THREE.Sprite
          ) {
            // Subtle floating animation
            const baseY = nodeObj.position.y;
            const floatOffset = Math.sin(animationTime * 2 + index * 0.5) * 0.5;
            nodeObj.position.y = baseY + floatOffset;

            // Subtle scale pulsing for non-selected nodes
            if (
              !selectedNode ||
              nodeObj.userData?.node?.id !== selectedNode.id
            ) {
              const scale =
                1 + Math.sin(animationTime * 3 + index * 0.7) * 0.02;
              nodeObj.scale.setScalar(scale);
            } else {
              // Selected node gets a slight scale boost
              nodeObj.scale.setScalar(1.1);
            }
          }
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate(0);
  }, [selectedNode]);

  // Mouse controls
  useEffect(() => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;

    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let cameraX = 0;
    let cameraY = 0;
    let zoom = 1;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getMousePosition = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;

      // Check for node selection
      getMousePosition(event);
      raycaster.setFromCamera(mouse, camera);

      const nodesGroup = scene.getObjectByName("nodes");
      if (nodesGroup) {
        const intersects = raycaster.intersectObjects(
          nodesGroup.children,
          true
        );
        if (intersects.length > 0) {
          const clickedObject = intersects[0].object;
          const node = clickedObject.userData?.node;
          if (node) {
            setSelectedNode(node);
            return; // Don't start dragging if clicking a node
          }
        }
      }

      setSelectedNode(null);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;

      cameraX -= deltaX / zoom; // Pan with zoom compensation
      cameraY += deltaY / zoom; // Flip Y for natural feel

      camera.position.set(cameraX, cameraY, camera.position.z);

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const zoomSpeed = 0.001;
      const minZoom = 0.2;
      const maxZoom = 4;

      zoom *= 1 - event.deltaY * zoomSpeed;
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom));

      // Update orthographic camera zoom
      const width = viewportSize.width || 800;
      const height = viewportSize.height || 600;

      camera.left = -width / 2 / zoom;
      camera.right = width / 2 / zoom;
      camera.top = height / 2 / zoom;
      camera.bottom = -height / 2 / zoom;
      camera.updateProjectionMatrix();

      setCameraState({ x: cameraX, y: cameraY, zoom });
    };

    // Add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [viewportSize]);

  const relationships = run.relationships || { nodes: [], edges: [] };
  const width = viewportSize.width || 800;
  const height = viewportSize.height || 600;

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
              <div className="relative w-full h-full min-h-[500px]">
                <canvas
                  ref={canvasRef}
                  width={width}
                  height={height}
                  className="absolute inset-0 w-full h-full"
                  style={{ display: "block" }}
                />
                {/* Label renderer will be attached here */}
              </div>
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

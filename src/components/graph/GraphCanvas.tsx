import { useRef, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Sparkles } from "@react-three/drei";
import R3fForceGraph from "r3f-forcegraph";
import type { GraphMethods } from "r3f-forcegraph";
import { useGraphStore } from "@/stores/useGraphStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { NODE_COLORS } from "@/lib/constants";
import * as THREE from "three";

/* ────────── Node factory with always-visible label ────────── */
function createLabelledNode(node: any, isDark: boolean = true) {
  const group = new THREE.Group();
  const color = new THREE.Color(node.color || NODE_COLORS.user);
  const size = Math.max(1, Math.cbrt(node.val || 1)) * 2.8;

  // ── Core sphere ──
  const coreGeo = new THREE.SphereGeometry(size, 32, 32);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: isDark ? 0.85 : 0.35,
    roughness: isDark ? 0.08 : 0.2,
    metalness: isDark ? 0.15 : 0.05,
    transparent: true,
    opacity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  group.add(new THREE.Mesh(coreGeo, coreMat));

  // ── Outer glow aura ──
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(size * 2.2, 20, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isDark ? 0.12 : 0.06, side: THREE.BackSide })
  ));

  // ── Ring ──
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(size * 1.15, size * 1.5, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isDark ? 0.18 : 0.1, side: THREE.DoubleSide })
  );
  ring.lookAt(0, 0, 1);
  group.add(ring);

  // ── Per-node point light ──
  group.add(new THREE.PointLight(color, isDark ? 0.4 : 0.15, size * 12, 2));

  // ── Label sprite via canvas ──
  const label = (node.name || "Untitled").substring(0, 28);
  const cvs = document.createElement("canvas");
  const ctx = cvs.getContext("2d")!;
  const fs = 42;
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
  const tw = ctx.measureText(label).width + 32;
  const th = fs + 22;
  cvs.width = tw; cvs.height = th;

  // pill background
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.roundRect(0, 0, tw, th, th / 2);
  ctx.fill();

  // subtle border
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0.75, 0.75, tw - 1.5, th - 1.5, th / 2);
  ctx.stroke();

  // text
  ctx.font = `500 ${fs}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = isDark ? "#ffffff" : "#1a1625";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(label, tw / 2, th / 2 + 1);

  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, sizeAttenuation: true }));
  const aspect = tw / th;
  const ss = size * 1.8;
  sprite.scale.set(ss * aspect, ss, 1);
  sprite.position.y = size + ss * 0.6;
  group.add(sprite);

  return group;
}

/* ────────── Cosmic Background ────────── */
function CosmicBackground() {
  const nebulaRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = t * 0.004;
      nebulaRef.current.rotation.x = Math.sin(t * 0.002) * 0.04;
    }
  });

  const nebulaGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color("#a78bfa");
    const c2 = new THREE.Color("#22d3ee");
    const c3 = new THREE.Color("#f0abfc");
    const palette = [c1, c2, c3];

    for (let i = 0; i < count; i++) {
      const r = 180 + Math.random() * 450;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  return (
    <>
      <Stars radius={450} depth={80} count={7000} factor={3} saturation={0.15} fade speed={0.2} />
      <points ref={nebulaRef} geometry={nebulaGeo}>
        <pointsMaterial size={1.2} vertexColors transparent opacity={0.12} sizeAttenuation />
      </points>
      <Sparkles count={80} scale={350} size={2.5} speed={0.15} opacity={0.12} color="#a78bfa" />
    </>
  );
}

/* ────────── Lighting (theme-aware) ────────── */
function Lighting({ isDark = true }: { isDark?: boolean }) {
  const movingLight = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (movingLight.current) {
      const t = clock.getElapsedTime();
      movingLight.current.position.set(Math.sin(t * 0.15) * 130, 70, Math.cos(t * 0.15) * 130);
      movingLight.current.intensity = (isDark ? 0.7 : 0.4) + Math.sin(t * 0.4) * 0.1;
    }
  });

  if (!isDark) {
    return (
      <>
        <ambientLight intensity={0.8} color="#f5f3ff" />
        <directionalLight position={[100, 100, 80]} intensity={0.6} color="#e9d5ff" />
        <pointLight ref={movingLight} position={[100, 70, 100]} intensity={0.4} color="#a78bfa" distance={500} decay={1.5} />
        <hemisphereLight intensity={0.4} color="#ede9fe" groundColor="#e0f2fe" />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.35} color="#e0d5ff" />
      <pointLight ref={movingLight} position={[100, 70, 100]} intensity={0.8} color="#c4b5fd" distance={550} decay={1.3} />
      <pointLight position={[-90, -50, -90]} intensity={0.35} color="#67e8f9" distance={400} decay={1.5} />
      <pointLight position={[0, 130, 0]} intensity={0.2} color="#f0abfc" distance={300} decay={2} />
      <hemisphereLight intensity={0.2} color="#a78bfa" groundColor="#0e7490" />
    </>
  );
}

/* ────────── Empty Logo ────────── */
function EmptyStateLogo() {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh>
        <icosahedronGeometry args={[8, 1]} />
        <meshPhysicalMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.4} wireframe transparent opacity={0.35} roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[13, 0]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.05} />
      </mesh>
    </Float>
  );
}

/* ────────── Main Scene ────────── */
function GraphScene() {
  const fgRef = useRef<GraphMethods>(undefined);
  const selectNode = useGraphStore((s) => s.selectNode);
  const setHoveredNode = useGraphStore((s) => s.setHoveredNode);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const hoveredNode = useGraphStore((s) => s.hoveredNode);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const getGraphData = useGraphStore((s) => s.getGraphData);
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === "dark";

  const graphData = useMemo(() => getGraphData(), [nodes, edges]); // eslint-disable-line

  useFrame(() => { fgRef.current?.tickFrame(); });

  const handleNodeClick = useCallback((n: any) => { if (n?.data) selectNode(n.data); }, [selectNode]);
  const handleNodeHover = useCallback((n: any) => {
    if (n?.data) { setHoveredNode(n.data); document.body.style.cursor = "pointer"; }
    else { setHoveredNode(null); document.body.style.cursor = "default"; }
  }, [setHoveredNode]);

  const flashNodeId = useGraphStore((s) => s.flashNodeId);

  const nodeColor = useCallback((n: any) => {
    if (selectedNode && n.id === selectedNode.id) return NODE_COLORS.selected;
    // Flash effect from timeline hover
    if (flashNodeId && n.id === flashNodeId) return "#ffffff";
    if (hoveredNode && n.id === hoveredNode.id) return isDark ? "#ddd6fe" : "#7c3aed";
    return n.color || NODE_COLORS.user;
  }, [selectedNode, hoveredNode, flashNodeId, isDark]);

  // nodeThreeObject is memoized per isDark - force graph caches these
  const nodeThreeObject = useCallback((n: any) => createLabelledNode(n, isDark), [isDark]);

  // nodeVal dynamically changes to make flashed node bigger
  const nodeVal = useCallback((n: any) => {
    if (flashNodeId && n.id === flashNodeId) return (n.val || 1) * 3;
    return n.val || 1;
  }, [flashNodeId]);

  if (!activeWorld) {
    return (
      <>
        {isDark && <CosmicBackground />}
        <Lighting isDark={isDark} />
        <EmptyStateLogo />
        <OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.25} />
      </>
    );
  }

  return (
    <>
      {isDark && <CosmicBackground />}
      <Lighting isDark={isDark} />

      <R3fForceGraph
        ref={fgRef}
        graphData={graphData}
        nodeId="id"
        nodeColor={nodeColor}
        nodeVal={nodeVal}
        nodeRelSize={4}
        nodeOpacity={1}
        nodeResolution={32}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor="color"
        linkWidth={1}
        linkOpacity={0.3}
        linkCurvature={0.12}
        linkDirectionalParticles={3}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleColor="color"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={0.85}
        linkDirectionalArrowColor="color"
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        cooldownTime={5000}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        warmupTicks={30}
      />

      <OrbitControls enableDamping dampingFactor={0.05} rotateSpeed={0.5} zoomSpeed={1} panSpeed={0.5} minDistance={15} maxDistance={800} />
    </>
  );
}

/* ────────── Canvas wrapper ────────── */
export default function GraphCanvas() {
  const theme = useSettingsStore((s) => s.theme);
  const bgDark = "linear-gradient(180deg, #030014 0%, #080025 50%, #050510 100%)";
  const bgLight = "linear-gradient(180deg, #f0edff 0%, #e8e4f8 50%, #f5f3ff 100%)";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 0, 180], fov: 65, near: 0.1, far: 6000 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: theme === "dark" ? bgDark : bgLight }}
        dpr={[1, 2]}
        resize={{ scroll: false, debounce: { scroll: 50, resize: 50 } }}
      >
        <fog attach="fog" args={[theme === "dark" ? "#030014" : "#f0edff", 300, 900]} />
        <GraphScene />
      </Canvas>
      <GraphOverlay />
    </div>
  );
}

/* ────────── Overlay HUD ────────── */
function GraphOverlay() {
  const nodeCount = useGraphStore((s) => s.nodes.length);
  const edgeCount = useGraphStore((s) => s.edges.length);
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const hoveredNode = useGraphStore((s) => s.hoveredNode);

  if (!activeWorld) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-fade-in">
        <div className="text-center">
          <h2 className="text-3xl font-extralight tracking-[.25em] text-foreground/25 mb-3 animate-breathe">MINDFUCK</h2>
          <p className="text-[13px] text-muted-foreground/20 tracking-wide">Select or create a world to begin</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-3 left-3 pointer-events-none animate-fade-in">
        <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono text-foreground/50">{nodeCount} nodes</span>
          </div>
          <div className="w-px h-3 bg-border/20" />
          <span className="text-[10px] font-mono text-foreground/40">{edgeCount} edges</span>
        </div>
      </div>

      {hoveredNode && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none animate-fade-in-down z-20">
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredNode.color, boxShadow: `0 0 10px ${hoveredNode.color}60` }} />
            <span className="text-[12px] font-medium text-foreground/85">{hoveredNode.title || "Untitled"}</span>
            <span className="text-[9px] text-muted-foreground/40 font-mono">{hoveredNode.node_type}</span>
          </div>
        </div>
      )}
    </>
  );
}

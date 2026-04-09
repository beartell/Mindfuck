import { useGraphStore } from "@/stores/useGraphStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { TIMELINE_PALETTE } from "@/lib/constants";
import { Plus } from "lucide-react";

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

export default function AddNodeButton() {
  const { createNode, selectNode, nodes, isBusy } = useGraphStore();
  const activeWorld = useWorldStore((s) => s.activeWorld);

  if (!activeWorld) return null;

  const handleAddNode = async () => {
    if (isBusy) return;
    const spread = Math.max(40, nodes.length * 4);
    const px = (Math.random() - 0.5) * spread;
    const py = (Math.random() - 0.5) * spread;
    const pz = (Math.random() - 0.5) * spread;
    // Give each new node a unique color
    const color = TIMELINE_PALETTE[nodes.length % TIMELINE_PALETTE.length];

    try {
      const node = await createNode({
        id: generateId(),
        world_id: activeWorld.id,
        title: "",
        position_x: px,
        position_y: py,
        position_z: pz,
        color,
      });
      selectNode(node);
    } catch (error) {
      console.error("Failed to create node:", error);
    }
  };

  return (
    <button
      onClick={handleAddNode}
      disabled={isBusy}
      className="absolute bottom-20 right-4 z-30 w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40 active:scale-95 animate-fade-in-up group disabled:opacity-40 disabled:cursor-not-allowed"
      title="Add new node"
    >
      <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
    </button>
  );
}

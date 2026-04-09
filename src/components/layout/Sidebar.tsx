import { useEffect, useState, useRef } from "react";
import { useWorldStore } from "@/stores/useWorldStore";
import { useGraphStore } from "@/stores/useGraphStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useChatStore } from "@/stores/useChatStore";
import { WORLD_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Plus, Globe, Trash2, PanelLeftClose, PanelLeftOpen, Orbit } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { World } from "@/types/world";

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

/* ── Inline rename sub-component ── */
function WorldItem({
  world,
  isActive,
  onSelect,
  onDelete,
}: {
  world: World;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(world.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { loadWorlds } = useWorldStore();

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commitRename = async () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== world.name) {
      try {
        await invoke("update_world", { id: world.id, name: trimmed, description: world.description, color: world.color });
        await loadWorlds();
      } catch (e) {
        console.error("Rename failed:", e);
      }
    } else {
      setEditName(world.name);
    }
    setIsEditing(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!isEditing) onSelect(); }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditName(world.name); setIsEditing(true); }}
      onKeyDown={(e) => { if (e.key === "Enter" && !isEditing) onSelect(); }}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all group cursor-pointer",
        isActive
          ? "bg-primary/10 text-foreground border border-primary/20 shadow-sm shadow-primary/5"
          : "text-muted-foreground hover:bg-accent/15 hover:text-foreground border border-transparent"
      )}
    >
      <div className="relative shrink-0">
        <Globe className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color: world.color }} />
        {isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: world.color }} />
        )}
      </div>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditName(world.name); setIsEditing(false); }
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-card/50 border border-primary/30 rounded-md px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        />
      ) : (
        <span className="truncate flex-1 text-xs" title="Double-click to rename">{world.name}</span>
      )}

      {!isEditing && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-destructive/15 text-muted-foreground/50 hover:text-destructive transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { worlds, activeWorld, loadWorlds, createWorld, setActiveWorld, deleteWorld } = useWorldStore();
  const { loadGraphData, clearGraph, isBusy, cancelBusy } = useGraphStore();
  const { clearMessages } = useChatStore();
  const { isSidebarOpen, toggleSidebar } = useSettingsStore();

  useEffect(() => { loadWorlds(); }, [loadWorlds]);

  const handleCreateWorld = async () => {
    if (isBusy) {
      if (!confirm("An AI operation is running. Switching will cancel it. Continue?")) return;
      cancelBusy();
    }
    const worldNum = worlds.length + 1;
    const color = WORLD_COLORS[worldNum % WORLD_COLORS.length];
    const world = await createWorld({ id: generateId(), name: `World ${worldNum}`, color });
    setActiveWorld(world);
    loadGraphData(world.id);
    clearMessages();
  };

  const handleSelectWorld = (world: typeof activeWorld) => {
    if (!world || world.id === activeWorld?.id) return;
    if (isBusy) {
      if (!confirm("An AI operation is running. Switching will cancel it. Continue?")) return;
      cancelBusy();
    }
    setActiveWorld(world);
    loadGraphData(world.id);
    clearMessages();
  };

  const handleDeleteWorld = async (e: React.MouseEvent, worldId: string) => {
    e.stopPropagation();
    if (isBusy) {
      if (!confirm("An AI operation is running. Deleting will cancel it. Continue?")) return;
      cancelBusy();
    }
    if (confirm("Delete this world and all its data?")) {
      await deleteWorld(worldId);
      clearGraph();
      clearMessages();
    }
  };

  if (!isSidebarOpen) {
    return (
      <button onClick={toggleSidebar} className="absolute top-3 left-3 z-50 p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-all hover:scale-105">
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="w-56 h-full glass-strong flex flex-col z-40 animate-slide-in-left">
      <div className="flex items-center justify-between p-3.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Orbit className="w-4 h-4 text-primary animate-spin-slow" />
          <span className="text-sm font-semibold text-foreground/90 tracking-wider">Worlds</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleCreateWorld} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all" title="New World">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-all">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {worlds.map((world) => (
          <WorldItem
            key={world.id}
            world={world}
            isActive={activeWorld?.id === world.id}
            onSelect={() => handleSelectWorld(world)}
            onDelete={(e) => handleDeleteWorld(e, world.id)}
          />
        ))}

        {worlds.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="relative w-10 h-10 mx-auto mb-3">
              <Globe className="w-10 h-10 text-muted-foreground/15" />
              <Plus className="w-4 h-4 text-primary/40 absolute -top-0.5 -right-0.5 animate-float" />
            </div>
            <p className="text-[11px] text-muted-foreground/40 mb-2">No worlds yet</p>
            <button onClick={handleCreateWorld} className="text-[11px] text-primary/70 hover:text-primary transition-colors">
              Create your first world
            </button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/20">
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-primary/30 animate-breathe" />
          <p className="text-[10px] text-muted-foreground/25 font-mono">MindFuck v0.1.0</p>
        </div>
      </div>
    </div>
  );
}

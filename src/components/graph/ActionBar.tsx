import { useState, useCallback } from "react";
import { useGraphStore } from "@/stores/useGraphStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { discoverAndExpand } from "@/services/llm";
import { TIMELINE_PALETTE } from "@/lib/constants";
import { Wand2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

export default function ActionBar() {
  const nodes = useGraphStore((s) => s.nodes);
  const isBusy = useGraphStore((s) => s.isBusy);
  const busyMessage = useGraphStore((s) => s.busyMessage);
  const setBusy = useGraphStore((s) => s.setBusy);
  const cancelBusy = useGraphStore((s) => s.cancelBusy);
  const updateNode = useGraphStore((s) => s.updateNode);
  const createNode = useGraphStore((s) => s.createNode);
  const createEdge = useGraphStore((s) => s.createEdge);
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const { llmConfig } = useSettingsStore();

  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [newNodesCreated, setNewNodesCreated] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const LOCAL_PROVIDERS = ["ollama", "lmstudio", "llamacpp"];
  const isLLMReady =
    LOCAL_PROVIDERS.includes(llmConfig.provider) ||
    (llmConfig.api_key && llmConfig.api_key.length > 0);

  const handleFindRelated = useCallback(async () => {
    if (!isLLMReady || !activeWorld || isBusy) return;

    // Lock to current world - this ID won't change even if user switches
    const lockedWorldId = activeWorld.id;

    const snapshot = useGraphStore.getState().nodes;
    const nodesToProcess = snapshot.filter((n) => n.content && n.content.length > 10);
    if (nodesToProcess.length === 0) return;

    setBusy(true, "Discovering related topics & expanding knowledge...", lockedWorldId);
    setProcessedCount(0);
    setTotalCount(nodesToProcess.length);
    setNewNodesCreated(0);
    setIsDone(false);

    const processedIds = new Set(nodesToProcess.map((n) => n.id));
    let colorIndex = snapshot.length;

    for (let i = 0; i < nodesToProcess.length; i++) {
      // === ABORT CHECK: was operation cancelled or world changed? ===
      const currentState = useGraphStore.getState();
      if (currentState.busyCancelled) {
        console.log("[ActionBar] Operation cancelled by user");
        break;
      }
      const currentWorld = useWorldStore.getState().activeWorld;
      if (!currentWorld || currentWorld.id !== lockedWorldId) {
        console.log("[ActionBar] World changed, aborting operation");
        break;
      }

      const node = nodesToProcess[i];
      setProcessedCount(i + 1);
      setBusy(true, `Expanding ${i + 1}/${nodesToProcess.length}: ${node.title.substring(0, 30)}...`, lockedWorldId);

      try {
        const freshState = useGraphStore.getState();
        const allTitles = freshState.nodes
          .filter((n) => n.world_id === lockedWorldId) // Only titles from this world
          .map((n) => n.title);

        const result = await discoverAndExpand(
          llmConfig,
          node.title,
          node.content,
          allTitles.filter((t) => t !== node.title)
        );

        // Double-check after async call
        if (useGraphStore.getState().busyCancelled) break;
        const worldCheck = useWorldStore.getState().activeWorld;
        if (!worldCheck || worldCheck.id !== lockedWorldId) break;

        // 1. Enrich existing node content
        if (result.enrichedContent && result.enrichedContent !== node.content) {
          await updateNode(node.id, {
            content: result.enrichedContent,
            content_plain: result.enrichedContent.replace(/[#*_~`>\[\]()!]/g, ""),
          });
        }

        // 2. Create NEW nodes (using locked worldId, not activeWorld)
        for (const newTopic of result.newTopics) {
          if (useGraphStore.getState().busyCancelled) break;

          const newColor = TIMELINE_PALETTE[colorIndex % TIMELINE_PALETTE.length];
          colorIndex++;

          const newNode = await createNode({
            id: generateId(),
            world_id: lockedWorldId, // Always use locked world ID
            title: newTopic.title,
            content: newTopic.content,
            content_plain: newTopic.content.replace(/[#*_~`>\[\]()!]/g, ""),
            node_type: "expanded",
            color: newColor,
            position_x: node.position_x + (Math.random() - 0.5) * 70,
            position_y: node.position_y + (Math.random() - 0.5) * 70,
            position_z: node.position_z + (Math.random() - 0.5) * 70,
            size: 1.0,
          });

          setNewNodesCreated((c) => c + 1);

          await createEdge({
            id: generateId(),
            world_id: lockedWorldId,
            source_id: node.id,
            target_id: newNode.id,
            label: "discovered",
            edge_type: "ai_expansion",
          });

          for (const relTitle of newTopic.relatedExisting) {
            const target = freshState.nodes.find(
              (n) => n.id !== node.id && n.world_id === lockedWorldId &&
                (n.title === relTitle || n.title.includes(relTitle))
            );
            if (target) {
              await createEdge({
                id: generateId(),
                world_id: lockedWorldId,
                source_id: newNode.id,
                target_id: target.id,
                label: "related",
                edge_type: "ai_related",
              });
            }
          }
        }

        // 3. Connect existing nodes
        const freshEdges = useGraphStore.getState().edges;
        for (const relTitle of result.existingRelations) {
          const target = nodesToProcess.find(
            (n) => n.id !== node.id && (n.title === relTitle || n.title.includes(relTitle))
          );
          if (target && processedIds.has(target.id)) {
            const edgeExists = freshEdges.some(
              (e) =>
                (e.source_id === node.id && e.target_id === target.id) ||
                (e.source_id === target.id && e.target_id === node.id)
            );
            if (!edgeExists) {
              await createEdge({
                id: generateId(),
                world_id: lockedWorldId,
                source_id: node.id,
                target_id: target.id,
                label: "related",
                edge_type: "ai_related",
              });
            }
          }
        }
      } catch (e) {
        console.error(`Expand failed for ${node.title}:`, e);
      }
    }

    // If we're still on the same world, show completion
    const finalWorld = useWorldStore.getState().activeWorld;
    if (finalWorld && finalWorld.id === lockedWorldId) {
      setIsDone(true);
      setTimeout(() => { setIsDone(false); setNewNodesCreated(0); }, 5000);
    }
    setBusy(false, "");
  }, [isLLMReady, activeWorld, isBusy, setBusy, updateNode, createNode, createEdge, llmConfig]);

  const handleCancel = useCallback(() => {
    cancelBusy();
    setProcessedCount(0);
    setTotalCount(0);
    setNewNodesCreated(0);
  }, [cancelBusy]);

  if (!activeWorld || nodes.length < 1) return null;

  return (
    <>
      {/* Action buttons - right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 animate-fade-in">
        <button
          onClick={handleFindRelated}
          disabled={!isLLMReady || isBusy}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-2xl text-[12px] font-medium shadow-lg transition-all",
            isBusy
              ? "bg-violet-600/80 text-white cursor-wait shadow-violet-500/30"
              : isDone
                ? "bg-emerald-600 text-white shadow-emerald-500/30"
                : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95",
            !isLLMReady && "opacity-40 cursor-not-allowed"
          )}
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          <span>
            {isBusy
              ? `${processedCount}/${totalCount}`
              : isDone
                ? `+${newNodesCreated} nodes`
                : "Find Related"}
          </span>
        </button>

        {/* Cancel button - only when busy */}
        {isBusy && (
          <button
            onClick={handleCancel}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium bg-red-600/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all animate-fade-in"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Global busy overlay */}
      {isBusy && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 animate-fade-in-down">
          <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl max-w-lg">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-foreground/80 truncate">{busyMessage}</div>
              <div className="flex items-center gap-3 mt-1">
                {totalCount > 0 && (
                  <div className="flex-1 h-1.5 bg-border/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${(processedCount / totalCount) * 100}%` }}
                    />
                  </div>
                )}
                {newNodesCreated > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono shrink-0">+{newNodesCreated} new</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

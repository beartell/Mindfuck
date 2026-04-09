import { useState, useEffect, useCallback } from "react";
import { useGraphStore } from "@/stores/useGraphStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { generateSuggestions, expandTopic, summarizeContent, generateTimeCapsule, enrichWithMedia } from "@/services/llm";
import { TIMELINE_PALETTE } from "@/lib/constants";
import MarkdownRenderer from "./MarkdownRenderer";
import {
  X, Save, Trash2, Sparkles, ArrowDownRight, FileText,
  Loader2, Check, Zap, Eye, Pencil, Clock, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

export default function NodeModal() {
  const { selectedNode, selectNode, updateNode, deleteNode, createNode, createEdge } = useGraphStore();
  const isBusy = useGraphStore((s) => s.isBusy);
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const { llmConfig } = useSettingsStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isExpanding, setIsExpanding] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const LOCAL_PROVIDERS = ["ollama", "lmstudio", "llamacpp"];
  const isLLMReady =
    LOCAL_PROVIDERS.includes(llmConfig.provider) ||
    (llmConfig.api_key && llmConfig.api_key.length > 0);

  // Any LLM operation running?
  const anyWorking = isLoadingSuggestions || isExpanding !== null || isSummarizing || isTimeCapsule || isEnriching || isBusy;

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title);
      setContent(selectedNode.content);
      setSuggestions([]);
      setSaved(false);
      setViewMode(selectedNode.content.length > 0 ? "preview" : "edit");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedNode && content.length > 30 && viewMode === "edit") {
      const t = setTimeout(loadSuggestions, 2500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const loadSuggestions = useCallback(async () => {
    if (!isLLMReady || !content || content.length < 10 || anyWorking) return;
    setIsLoadingSuggestions(true);
    try { setSuggestions(await generateSuggestions(llmConfig, title || "Untitled", content)); }
    catch (e) { console.error("Suggestions error:", e); }
    setIsLoadingSuggestions(false);
  }, [llmConfig, title, content, isLLMReady, anyWorking]);

  if (!selectedNode || !activeWorld) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateNode(selectedNode.id, { title, content, content_plain: content.replace(/[#*_~`>\[\]()!]/g, "") });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error("Save error:", e); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (confirm("Delete this node and all its connections?")) await deleteNode(selectedNode.id);
  };

  const handleClose = () => {
    if (title !== selectedNode.title || content !== selectedNode.content) handleSave();
    selectNode(null);
  };

  const handleExpand = async (suggestion: string) => {
    if (!isLLMReady || anyWorking) return;
    setIsExpanding(suggestion);
    try {
      const result = await expandTopic(llmConfig, title, content, suggestion);
      // Pick a unique color based on current node count
      const nodeCount = useGraphStore.getState().nodes.length;
      const newColor = TIMELINE_PALETTE[nodeCount % TIMELINE_PALETTE.length];
      const newNode = await createNode({
        id: generateId(), world_id: activeWorld.id, title: result.title,
        content: result.content, content_plain: result.content.replace(/[#*_~`>\[\]()!]/g, ""),
        node_type: "ai_generated", color: newColor,
        position_x: selectedNode.position_x + (Math.random() - 0.5) * 60,
        position_y: selectedNode.position_y + (Math.random() - 0.5) * 60,
        position_z: selectedNode.position_z + (Math.random() - 0.5) * 60,
      });
      await createEdge({ id: generateId(), world_id: activeWorld.id, source_id: selectedNode.id, target_id: newNode.id, label: suggestion, edge_type: "ai_expansion" });
      setSuggestions((p) => p.filter((s) => s !== suggestion));
    } catch (e) { console.error("Expand error:", e); }
    setIsExpanding(null);
  };

  const handleSummarize = async () => {
    if (!isLLMReady || !content || anyWorking) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeContent(llmConfig, title, content);
      const nodeCount = useGraphStore.getState().nodes.length;
      const n = await createNode({
        id: generateId(), world_id: activeWorld.id, title: `Summary: ${title}`,
        content: summary, content_plain: summary, node_type: "ai_generated",
        color: TIMELINE_PALETTE[(nodeCount + 5) % TIMELINE_PALETTE.length],
        position_x: selectedNode.position_x + (Math.random() - 0.5) * 50,
        position_y: selectedNode.position_y + (Math.random() - 0.5) * 50,
        position_z: selectedNode.position_z + (Math.random() - 0.5) * 50,
      });
      await createEdge({ id: generateId(), world_id: activeWorld.id, source_id: selectedNode.id, target_id: n.id, label: "summary", edge_type: "ai_summary" });
    } catch (e) { console.error("Summarize error:", e); }
    setIsSummarizing(false);
  };

  const handleTimeCapsule = async () => {
    if (!isLLMReady || anyWorking) return;
    const topic = title || content.substring(0, 100);
    if (!topic.trim()) return;
    setIsTimeCapsule(true);
    try {
      const events = await generateTimeCapsule(llmConfig, topic);
      const nodeIds: string[] = [];
      const baseX = selectedNode.position_x;
      const baseY = selectedNode.position_y;
      const baseZ = selectedNode.position_z;

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const spacing = 35;
        const nodeColor = TIMELINE_PALETTE[i % TIMELINE_PALETTE.length];
        const n = await createNode({
          id: generateId(), world_id: activeWorld.id,
          title: `${ev.date} - ${ev.title}`,
          content: ev.content,
          content_plain: ev.content.replace(/[#*_~`>\[\]()!]/g, ""),
          node_type: "ai_generated",
          color: nodeColor,
          position_x: baseX + (i - events.length / 2) * spacing,
          position_y: baseY + (Math.random() - 0.5) * 30,
          position_z: baseZ + (Math.random() - 0.5) * 40,
          size: 1.2,
        });
        nodeIds.push(n.id);
      }

      await createEdge({ id: generateId(), world_id: activeWorld.id, source_id: selectedNode.id, target_id: nodeIds[0], label: "timeline start", edge_type: "ai_expansion" });
      for (let i = 0; i < nodeIds.length - 1; i++) {
        await createEdge({ id: generateId(), world_id: activeWorld.id, source_id: nodeIds[i], target_id: nodeIds[i + 1], label: "next", edge_type: "ai_expansion" });
      }
      for (let i = 0; i < events.length; i++) {
        for (const ci of events[i].connections) {
          if (ci !== i && ci >= 0 && ci < nodeIds.length) {
            await createEdge({ id: generateId(), world_id: activeWorld.id, source_id: nodeIds[i], target_id: nodeIds[ci], label: "related", edge_type: "ai_related" });
          }
        }
      }
    } catch (e) { console.error("Time Capsule error:", e); }
    setIsTimeCapsule(false);
  };

  const handleEnrichMedia = async () => {
    if (!isLLMReady || !content || anyWorking) return;
    setIsEnriching(true);
    try {
      const enriched = await enrichWithMedia(llmConfig, title, content);
      setContent(enriched);
      await updateNode(selectedNode.id, { title, content: enriched, content_plain: enriched.replace(/[#*_~`>\[\]()!]/g, "") });
      setViewMode("preview");
    } catch (e) { console.error("Enrich error:", e); }
    setIsEnriching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }} onKeyDown={handleKeyDown}>
      <div className="w-full max-w-2xl mx-4 glass-strong rounded-2xl shadow-2xl shadow-primary/5 flex flex-col max-h-[85vh] animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-3.5 h-3.5 rounded-full shadow-lg" style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 14px ${selectedNode.color}50` }} />
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Node title..."
              className="flex-1 bg-transparent text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/30 focus:outline-none tracking-tight" autoFocus />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-muted-foreground/30 font-mono mr-1">{selectedNode.node_type}</span>
            <button onClick={() => setViewMode(viewMode === "edit" ? "preview" : "edit")}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" title={viewMode === "edit" ? "Preview" : "Edit"}>
              {viewMode === "edit" ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className={cn("p-1.5 rounded-lg transition-all", saved ? "text-emerald-400 bg-emerald-400/10" : isSaving ? "text-primary/30" : "text-muted-foreground hover:text-primary hover:bg-primary/10")}
              title="Save (Ctrl+S)">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {viewMode === "edit" ? (
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts... (Markdown, links, images supported)"
              className="w-full min-h-[220px] bg-transparent text-[13px] text-foreground/90 placeholder:text-muted-foreground/20 focus:outline-none resize-none leading-[1.75] tracking-normal" />
          ) : (
            content ? <MarkdownRenderer content={content} /> : <p className="text-muted-foreground/30 text-sm italic">No content yet. Switch to edit mode to write.</p>
          )}
        </div>

        {/* AI Actions */}
        <div className="p-4 border-t border-border/20 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className={cn("w-3.5 h-3.5 shrink-0", isLLMReady ? "text-primary" : "text-muted-foreground/30")} />

            <button onClick={loadSuggestions} disabled={!isLLMReady || anyWorking || !content}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-xl border border-primary/20 text-primary/80 hover:bg-primary/10 hover:border-primary/30 disabled:opacity-30 transition-all">
              {isLoadingSuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowDownRight className="w-3 h-3" />} Deepen
            </button>

            <button onClick={handleSummarize} disabled={!isLLMReady || anyWorking || !content}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-xl border border-emerald-500/20 text-emerald-400/80 hover:bg-emerald-500/10 hover:border-emerald-500/30 disabled:opacity-30 transition-all">
              {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Summarize
            </button>

            <button onClick={handleTimeCapsule} disabled={!isLLMReady || anyWorking || (!title && !content)}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-xl border border-cyan-500/20 text-cyan-400/80 hover:bg-cyan-500/10 hover:border-cyan-500/30 disabled:opacity-30 transition-all">
              {isTimeCapsule ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />} Time Capsule
            </button>

            <button onClick={handleEnrichMedia} disabled={!isLLMReady || anyWorking || !content}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-xl border border-pink-500/20 text-pink-400/80 hover:bg-pink-500/10 hover:border-pink-500/30 disabled:opacity-30 transition-all">
              {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />} Media
            </button>

            {!isLLMReady && <span className="text-[10px] text-muted-foreground/30 ml-auto">Configure LLM in Settings</span>}
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleExpand(s)} disabled={anyWorking}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-xl border transition-all",
                    isExpanding === s ? "bg-primary/15 border-primary/30 text-primary" : "border-border/20 text-muted-foreground/70 hover:text-primary hover:border-primary/20 hover:bg-primary/5")}>
                  {isExpanding === s ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} {s}
                </button>
              ))}
            </div>
          )}

          {/* Progress */}
          {(isTimeCapsule || isEnriching) && (
            <div className={cn("flex items-center gap-2 p-2.5 rounded-xl border animate-fade-in",
              isTimeCapsule ? "bg-cyan-500/5 border-cyan-500/15" : "bg-pink-500/5 border-pink-500/15")}>
              <Loader2 className={cn("w-3.5 h-3.5 animate-spin", isTimeCapsule ? "text-cyan-400" : "text-pink-400")} />
              <span className={cn("text-[11px]", isTimeCapsule ? "text-cyan-400/80" : "text-pink-400/80")}>
                {isTimeCapsule ? "Generating timeline..." : "Finding media & resources..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

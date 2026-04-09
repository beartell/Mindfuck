import { useMemo, useState, useCallback } from "react";
import { useGraphStore } from "@/stores/useGraphStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function extractYear(dateStr: string): number | null {
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1], 10) : null;
}

interface TimelineNode {
  id: string;
  title: string;
  date: string;
  year: number;
  color: string;
}

export default function TimelineBar() {
  // Subscribe to nodes directly so timeline re-renders when nodes change
  const nodes = useGraphStore((s) => s.nodes);
  const selectNode = useGraphStore((s) => s.selectNode);
  const setFlashNodeId = useGraphStore((s) => s.setFlashNodeId);
  const hoveredNode = useGraphStore((s) => s.hoveredNode);
  const setHoveredNode = useGraphStore((s) => s.setHoveredNode);
  const activeWorld = useWorldStore((s) => s.activeWorld);

  const [localHover, setLocalHover] = useState<string | null>(null);

  // Recalculate timeline when nodes array reference changes
  const timelineNodes = useMemo((): TimelineNode[] => {
    const dated: TimelineNode[] = [];
    for (const n of nodes) {
      const year = extractYear(n.title);
      if (year && year > 100 && year < 2200) {
        const parts = n.title.split(" - ");
        dated.push({
          id: n.id,
          title: parts.length > 1 ? parts.slice(1).join(" - ") : n.title,
          date: parts[0] || n.title,
          year,
          color: n.color,
        });
      }
    }
    return dated.sort((a, b) => a.year - b.year);
  }, [nodes]);

  const handleDotClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) selectNode(node);
  }, [nodes, selectNode]);

  const handleDotEnter = useCallback((nodeId: string) => {
    setLocalHover(nodeId);
    setFlashNodeId(nodeId);
    const node = nodes.find((n) => n.id === nodeId);
    if (node) setHoveredNode(node);
  }, [nodes, setFlashNodeId, setHoveredNode]);

  const handleDotLeave = useCallback(() => {
    setLocalHover(null);
    setFlashNodeId(null);
    setHoveredNode(null);
  }, [setFlashNodeId, setHoveredNode]);

  if (!activeWorld || timelineNodes.length < 2) return null;

  const minYear = timelineNodes[0].year;
  const maxYear = timelineNodes[timelineNodes.length - 1].year;
  const range = Math.max(maxYear - minYear, 1);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto" style={{ bottom: 0 }}>
      <div className="mx-3 mb-2 glass rounded-xl px-4 py-2.5 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3 h-3 text-primary/60" />
          <span className="text-[10px] font-mono text-muted-foreground/50">
            Timeline {minYear} — {maxYear}
          </span>
          <span className="text-[9px] text-muted-foreground/30">
            ({timelineNodes.length} events)
          </span>
        </div>

        {/* Timeline track */}
        <div className="relative h-8 mx-1">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full bg-border/30" />

          {timelineNodes.map((tn) => {
            const pct = ((tn.year - minYear) / range) * 100;
            const isHovered = localHover === tn.id || hoveredNode?.id === tn.id;

            return (
              <div
                key={tn.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer"
                style={{ left: `${Math.max(1, Math.min(99, pct))}%` }}
                onClick={() => handleDotClick(tn.id)}
                onMouseEnter={() => handleDotEnter(tn.id)}
                onMouseLeave={handleDotLeave}
              >
                {isHovered && (
                  <div
                    className="absolute bottom-full mb-0.5 w-[1.5px] h-5 animate-fade-in"
                    style={{ background: `linear-gradient(to top, ${tn.color}80, transparent)` }}
                  />
                )}

                <div
                  className={cn("rounded-full transition-all duration-200 border-2", isHovered ? "w-4 h-4 scale-125" : "w-2.5 h-2.5")}
                  style={{
                    backgroundColor: tn.color,
                    borderColor: isHovered ? "white" : "transparent",
                    boxShadow: isHovered ? `0 0 14px ${tn.color}90, 0 0 30px ${tn.color}40` : `0 0 4px ${tn.color}40`,
                  }}
                />

                {isHovered && (
                  <div className="absolute top-full mt-1.5 whitespace-nowrap animate-fade-in z-30">
                    <div className="glass rounded-lg px-2.5 py-1.5 text-center shadow-lg">
                      <div className="text-[10px] font-mono font-medium text-primary/90">{tn.date}</div>
                      <div className="text-[10px] text-foreground/70 max-w-[180px] truncate">{tn.title}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <span className="absolute left-0 top-full mt-0.5 text-[9px] font-mono text-muted-foreground/30">{minYear}</span>
          <span className="absolute right-0 top-full mt-0.5 text-[9px] font-mono text-muted-foreground/30">{maxYear}</span>
        </div>
      </div>
    </div>
  );
}

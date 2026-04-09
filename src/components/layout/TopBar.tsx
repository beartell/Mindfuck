import { useWorldStore } from "@/stores/useWorldStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useGraphStore } from "@/stores/useGraphStore";
import { Search, MessageCircle, Settings, Brain, Sparkles, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const { toggleChatPanel, isChatPanelOpen, toggleSettings, toggleTheme, theme, llmConfig } =
    useSettingsStore();
  const nodeCount = useGraphStore((s) => s.nodes.length);

  const LOCAL_PROVIDERS = ["ollama", "lmstudio", "llamacpp"];
  const isLLMConfigured =
    LOCAL_PROVIDERS.includes(llmConfig.provider) ||
    (llmConfig.api_key && llmConfig.api_key.length > 0);

  return (
    <div className="h-11 glass-strong flex items-center justify-between px-4 z-30 animate-fade-in-down">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Brain className="w-4 h-4 text-primary" />
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-foreground/85 tracking-tight">
          {activeWorld?.name || "MindFuck"}
        </span>
        {activeWorld && (
          <span className="text-[10px] text-muted-foreground/45 font-mono">{nodeCount}n</span>
        )}
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
          <input
            type="text"
            placeholder="Search nodes..."
            disabled={!activeWorld}
            className="w-full bg-card/30 border border-border/20 rounded-xl pl-9 pr-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:bg-card/50 disabled:opacity-20 transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* LLM badge */}
        <div className="flex items-center gap-1.5 mr-1.5 px-2.5 py-1 rounded-lg bg-card/30">
          <Sparkles className="w-3 h-3 text-primary/50" />
          <span className="text-[10px] font-mono text-muted-foreground/45">{llmConfig.provider}</span>
          <div className={cn("w-1.5 h-1.5 rounded-full", isLLMConfigured ? "bg-emerald-400" : "bg-amber-400")} />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleChatPanel}
          className={cn(
            "p-2 rounded-xl transition-all",
            isChatPanelOpen
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
          )}
          title="Chat (RAG)"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        <button
          onClick={toggleSettings}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

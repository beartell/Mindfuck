import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { LLMConfig, LLMProvider } from "@/types/llm";
import { testConnection } from "@/services/llm";
import {
  X,
  Settings,
  Zap,
  Globe,
  Key,
  Cpu,
  Thermometer,
  Hash,
  Check,
  AlertCircle,
  Loader2,
  Server,
  Monitor,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderInfo {
  preset: Partial<LLMConfig>;
  label: string;
  description: string;
  needsApiKey: boolean;
  icon: typeof Server;
}

const PROVIDERS: Record<LLMProvider, ProviderInfo> = {
  ollama: {
    label: "Ollama",
    description: "Local models via Ollama",
    needsApiKey: false,
    icon: Server,
    preset: {
      base_url: "http://localhost:11434",
      model: "llama3.1:8b",
      embedding_model: "nomic-embed-text",
      embedding_dimensions: 1024,
      api_key: undefined,
    },
  },
  lmstudio: {
    label: "LM Studio",
    description: "Local models via LM Studio",
    needsApiKey: false,
    icon: Monitor,
    preset: {
      base_url: "http://localhost:1234",
      model: "loaded-model",
      embedding_model: "nomic-embed-text-v1.5",
      embedding_dimensions: 768,
      api_key: undefined,
    },
  },
  llamacpp: {
    label: "llama.cpp",
    description: "llama.cpp server endpoint",
    needsApiKey: false,
    icon: Terminal,
    preset: {
      base_url: "http://localhost:8080",
      model: "default",
      embedding_model: "default",
      embedding_dimensions: 4096,
      api_key: undefined,
    },
  },
  openai: {
    label: "OpenAI",
    description: "GPT-4o, GPT-4o-mini",
    needsApiKey: true,
    icon: Cpu,
    preset: {
      base_url: "https://api.openai.com",
      model: "gpt-4o-mini",
      embedding_model: "text-embedding-3-small",
      embedding_dimensions: 1536,
    },
  },
  gemini: {
    label: "Gemini",
    description: "Google Gemini API",
    needsApiKey: true,
    icon: Zap,
    preset: {
      base_url: "https://generativelanguage.googleapis.com",
      model: "gemini-2.0-flash",
      embedding_model: "text-embedding-004",
      embedding_dimensions: 768,
    },
  },
};

export default function SettingsPanel() {
  const { isSettingsOpen, setSettingsOpen, llmConfig, setLLMConfig } =
    useSettingsStore();
  const [localConfig, setLocalConfig] = useState<LLMConfig>(llmConfig);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setLocalConfig(llmConfig);
  }, [llmConfig, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleProviderChange = (provider: LLMProvider) => {
    const info = PROVIDERS[provider];
    setLocalConfig((prev) => ({
      ...prev,
      provider,
      ...info.preset,
      api_key: provider === prev.provider ? prev.api_key : info.preset.api_key || "",
    }));
    setTestResult(null);
  };

  const handleSave = () => {
    setLLMConfig(localConfig);
    setSettingsOpen(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testConnection(localConfig);
    setTestResult(result);
    setIsTesting(false);
  };

  const update = (key: keyof LLMConfig, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
    >
      <div className="w-full max-w-lg mx-4 glass-strong rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[85vh] animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Settings</h2>
              <p className="text-[11px] text-muted-foreground/60">Configure your LLM provider</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground/80 mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Provider
            </label>
            {/* Local providers */}
            <p className="text-[10px] text-muted-foreground/40 mb-1.5 mt-2">Local</p>
            <div className="grid grid-cols-3 gap-2">
              {(["ollama", "lmstudio", "llamacpp"] as LLMProvider[]).map((p) => {
                const info = PROVIDERS[p];
                const Icon = info.icon;
                return (
                  <button
                    key={p}
                    onClick={() => handleProviderChange(p)}
                    className={cn(
                      "px-2 py-2.5 rounded-xl text-[11px] font-medium transition-all border",
                      localConfig.provider === p
                        ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                        : "bg-card/50 text-muted-foreground border-border/20 hover:bg-accent/20 hover:border-border/40"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className="w-4 h-4" />
                      <span>{info.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Cloud providers */}
            <p className="text-[10px] text-muted-foreground/40 mb-1.5 mt-3">Cloud</p>
            <div className="grid grid-cols-2 gap-2">
              {(["openai", "gemini"] as LLMProvider[]).map((p) => {
                const info = PROVIDERS[p];
                const Icon = info.icon;
                return (
                  <button
                    key={p}
                    onClick={() => handleProviderChange(p)}
                    className={cn(
                      "px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all border",
                      localConfig.provider === p
                        ? "bg-primary/15 text-primary border-primary/30 shadow-sm shadow-primary/10"
                        : "bg-card/50 text-muted-foreground border-border/20 hover:bg-accent/20 hover:border-border/40"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className="w-4 h-4" />
                      <span>{info.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Selected provider description */}
            <p className="text-[10px] text-muted-foreground/40 mt-2">
              {PROVIDERS[localConfig.provider].description}
            </p>
          </div>

          {/* API Key (only for cloud providers that need it) */}
          {PROVIDERS[localConfig.provider].needsApiKey && (
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3 h-3" /> API Key
              </label>
              <input
                type="password"
                value={localConfig.api_key || ""}
                onChange={(e) => update("api_key", e.target.value)}
                placeholder={`Enter your ${PROVIDERS[localConfig.provider].label} API key...`}
                className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          {/* Base URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Base URL
            </label>
            <input
              type="text"
              value={localConfig.base_url}
              onChange={(e) => update("base_url", e.target.value)}
              placeholder="API endpoint URL..."
              className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          {/* Model */}
          <div>
            <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Model
            </label>
            <input
              type="text"
              value={localConfig.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="Model name..."
              className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          {/* Temperature + Max Tokens */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
                <Thermometer className="w-3 h-3" /> Temperature
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={localConfig.temperature}
                  onChange={(e) => update("temperature", parseFloat(e.target.value))}
                  className="flex-1 accent-primary h-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                  {localConfig.temperature}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Max Tokens
              </label>
              <input
                type="number"
                value={localConfig.max_tokens}
                onChange={(e) => update("max_tokens", parseInt(e.target.value) || 2048)}
                className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Embedding Model */}
          <div className="pt-2 border-t border-border/20">
            <label className="text-xs font-medium text-muted-foreground/80 mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3 h-3" /> Embedding Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={localConfig.embedding_model}
                onChange={(e) => update("embedding_model", e.target.value)}
                placeholder="Embedding model..."
                className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              />
              <input
                type="number"
                value={localConfig.embedding_dimensions}
                onChange={(e) => update("embedding_dimensions", parseInt(e.target.value) || 1024)}
                placeholder="Dimensions"
                className="w-full bg-card/50 border border-border/30 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={cn(
                "flex items-start gap-2 p-3 rounded-xl text-xs animate-fade-in",
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}
            >
              {testResult.success ? (
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border/20">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-border/30 text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Test Connection
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

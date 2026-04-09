import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useWorldStore } from "@/stores/useWorldStore";
import { useChatStore } from "@/stores/useChatStore";
import { MessageCircle, Send, X, Trash2, Brain, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPanel() {
  const { isChatPanelOpen, toggleChatPanel, llmConfig } = useSettingsStore();
  const activeWorld = useWorldStore((s) => s.activeWorld);
  const { messages, isLoading, sendMessage, clearMessages } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const LOCAL_PROVIDERS = ["ollama", "lmstudio", "llamacpp"];
  const isLLMReady =
    LOCAL_PROVIDERS.includes(llmConfig.provider) ||
    (llmConfig.api_key && llmConfig.api_key.length > 0);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isChatPanelOpen) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !isLLMReady) return;
    setInput("");
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 h-full glass-strong flex flex-col z-40 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageCircle className="w-4 h-4 text-primary" />
            {isLoading && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
            )}
          </div>
          <span className="text-sm font-semibold text-foreground/90">
            Chat
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/40">
            RAG
          </span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleChatPanel}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!activeWorld ? (
          <EmptyState message="Select a world to start chatting" />
        ) : !isLLMReady ? (
          <EmptyState message="Configure an LLM provider in Settings to chat" />
        ) : messages.length === 0 ? (
          <EmptyState message="Ask questions about your knowledge graph" subtitle="Powered by RAG - searches across all your nodes" />
        ) : (
          messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-3 h-3 text-primary" />
            </div>
            <div className="bg-card/50 rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/20">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !activeWorld
                ? "Select a world first..."
                : !isLLMReady
                  ? "Configure LLM in settings..."
                  : "Ask about your knowledge..."
            }
            disabled={!activeWorld || !isLLMReady || isLoading}
            rows={2}
            className="w-full bg-card/30 border border-border/20 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:bg-card/50 disabled:opacity-20 resize-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !activeWorld || !isLLMReady || isLoading}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-20 transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: { role: string; content: string } }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-2 animate-fade-in", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-accent/30" : "bg-primary/15"
        )}
      >
        {isUser ? (
          <User className="w-3 h-3 text-foreground/70" />
        ) : (
          <Sparkles className="w-3 h-3 text-primary" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
          isUser
            ? "bg-primary/15 text-foreground/90 rounded-tr-sm"
            : "bg-card/50 text-foreground/80 rounded-tl-sm border border-border/10"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function EmptyState({ message, subtitle }: { message: string; subtitle?: string }) {
  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="relative w-12 h-12 mx-auto mb-3">
        <MessageCircle className="w-12 h-12 text-muted-foreground/10" />
        <Sparkles className="w-4 h-4 text-primary/30 absolute -top-1 -right-1 animate-float" />
      </div>
      <p className="text-xs text-muted-foreground/40">{message}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground/25 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

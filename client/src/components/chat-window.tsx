import { useEffect, useRef } from "react";
import { Gem, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import type { Message } from "@shared/schema";

interface ChatWindowProps {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  conversationTitle?: string;
}

export function ChatWindow({
  messages,
  streamingContent,
  isStreaming,
  onSendMessage,
  conversationTitle,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const hasMessages = messages.length > 0 || streamingContent;

  return (
    <div className="flex flex-col h-full">
      {/* Header with status */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <div className="ruby-gradient p-2 rounded-lg shadow-sm transition-transform duration-300 hover:scale-105">
          <Gem className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">
            {conversationTitle || "Ruby AI"}
          </h2>
          <div className="flex items-center gap-2">
            <div className={isStreaming ? "status-thinking" : "status-online"} />
            <p className="text-xs text-muted-foreground">
              {isStreaming ? (
                <span className="thinking-dots">
                  Thinking<span>.</span><span>.</span><span>.</span>
                </span>
              ) : (
                "Online"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 custom-scrollbar" ref={scrollRef}>
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full py-12 fade-in">
            {/* Animated gem icon */}
            <div className="relative mb-8">
              <div className="absolute inset-0 ruby-gradient rounded-3xl blur-2xl opacity-30 animate-pulse-glow" />
              <div className="relative ruby-gradient-animated p-6 rounded-3xl shadow-xl animate-float">
                <Gem className="h-14 w-14 text-white drop-shadow-lg" />
              </div>
            </div>

            <h3 className="text-3xl font-bold mb-3 rainbow-text rainbow-glow">
              Welcome to Ruby AI
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-10 leading-relaxed">
              I'm your intelligent assistant, ready to help with questions, creative ideas, and thoughtful conversations.
            </p>

            {/* Suggestion cards with staggered animation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full">
              {[
                { text: "Explain quantum computing in simple terms", icon: "brain" },
                { text: "Write a poem about the ocean", icon: "pen" },
                { text: "Help me plan a weekend trip", icon: "map" },
                { text: "What are some healthy breakfast ideas?", icon: "leaf" },
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion.text)}
                  className={cn(
                    "suggestion-card flex items-start gap-3 p-4 text-left text-sm rounded-xl",
                    "border bg-card/50 backdrop-blur-sm",
                    "opacity-0 animate-scale-bounce",
                    i === 0 && "stagger-1",
                    i === 1 && "stagger-2",
                    i === 2 && "stagger-3",
                    i === 3 && "stagger-4"
                  )}
                  style={{ animationFillMode: "forwards" }}
                  data-testid={`button-suggestion-${i}`}
                >
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="leading-relaxed text-foreground/80">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {streamingContent && (
              <ChatMessage
                message={{
                  id: -1,
                  conversationId: -1,
                  role: "assistant",
                  content: streamingContent,
                  createdAt: new Date(),
                }}
                isStreaming={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input with subtle backdrop */}
      <div className="bg-background/80 backdrop-blur-sm">
        <ChatInput onSend={onSendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

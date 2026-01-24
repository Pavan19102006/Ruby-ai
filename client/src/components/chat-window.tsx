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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <div className="ruby-gradient p-1.5 rounded-md">
          <Gem className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-medium text-sm">
            {conversationTitle || "Ruby AI"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isStreaming ? "Thinking..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 custom-scrollbar" ref={scrollRef}>
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="ruby-gradient p-4 rounded-2xl mb-6">
              <Gem className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Welcome to Ruby AI</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              I'm your intelligent assistant, ready to help with questions, ideas, and conversations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              {[
                "Explain quantum computing in simple terms",
                "Write a poem about the ocean",
                "Help me plan a weekend trip",
                "What are some healthy breakfast ideas?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="flex items-center gap-2 p-3 text-left text-sm rounded-lg border bg-card hover-elevate transition-colors"
                  data-testid={`button-suggestion-${i}`}
                >
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="line-clamp-2">{suggestion}</span>
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

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}

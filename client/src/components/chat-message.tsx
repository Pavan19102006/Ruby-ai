import { Gem, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 message-animate",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
          isUser
            ? "bg-muted shadow-sm"
            : "ruby-gradient shadow-md"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Gem className={cn(
            "h-4 w-4 text-white",
            isStreaming && "animate-pulse"
          )} />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-[75%] gap-1.5",
          isUser ? "items-end" : "items-start"
        )}
      >
        <span className="text-xs text-muted-foreground font-medium px-1">
          {isUser ? "You" : "Ruby AI"}
        </span>
        <div
          className={cn(
            "message-bubble rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-md shadow-md"
              : "bg-card border border-card-border rounded-tl-md shadow-sm"
          )}
        >
          <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            isStreaming && !isUser && "typing-cursor"
          )}>
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-muted"
            : "ruby-gradient"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Gem className="h-4 w-4 text-white" />
        )}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-[75%] gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <span className="text-xs text-muted-foreground font-medium">
          {isUser ? "You" : "Ruby AI"}
        </span>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-card-border rounded-tl-sm"
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

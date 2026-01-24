import { useState } from "react";
import { Gem, User, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border/50 bg-[#282c34] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          data-testid="button-copy-code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || "python"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          background: "#282c34",
        }}
        showLineNumbers
        wrapLines
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
}

function parseMessageContent(content: string) {
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "code",
      language: match[1] || "python",
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, content }];
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const contentParts = parseMessageContent(message.content);

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
          {contentParts.map((part, index) => (
            part.type === "code" ? (
              <CodeBlock
                key={index}
                code={part.content}
                language={part.language || "python"}
              />
            ) : (
              <p
                key={index}
                className={cn(
                  "text-sm leading-relaxed whitespace-pre-wrap",
                  isStreaming && !isUser && index === contentParts.length - 1 && "typing-cursor"
                )}
              >
                {part.content}
              </p>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

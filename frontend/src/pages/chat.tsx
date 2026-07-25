import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatWindow } from "@/components/chat-window";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conversation, Message } from "@shared/schema";

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  // Fetch all conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  // Fetch active conversation with messages
  const { data: activeConversation } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  // Create new conversation
  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Chat" });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  // Delete conversation
  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  // Send message and stream response
  const sendMessage = useCallback(async (content: string, imageDataUrl?: string) => {
    let conversationId = activeConversationId;

    // Create conversation if none exists
    if (!conversationId) {
      try {
        const titleText = content || "Screenshot analysis";
        const res = await apiRequest("POST", "/api/conversations", {
          title: titleText.slice(0, 50) + (titleText.length > 50 ? "..." : ""),
        });
        const newConv: Conversation = await res.json();
        conversationId = newConv.id;
        setActiveConversationId(newConv.id);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      } catch {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Build the message content - include image description if present
      let messageContent = content;
      if (imageDataUrl) {
        const imagePrefix = "[Screenshot attached]\n";
        messageContent = imagePrefix + (content || "Please analyze this screenshot.");
      }

      // Optimistically add user message and blank AI message to UI instantly
      const tempUserId = Date.now();
      const tempAiId = Date.now() + 1;
      queryClient.setQueryData(["/api/conversations", conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages,
            {
              id: tempUserId,
              conversationId,
              role: "user",
              content: messageContent,
              createdAt: new Date().toISOString(),
            },
            {
              id: tempAiId,
              conversationId,
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
            }
          ]
        };
      });

      setIsStreaming(true);

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent, imageDataUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = ""; // accumulates raw bytes across chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines in the buffer
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const data = JSON.parse(payload);
            if (data.content) {
              fullContent += data.content;
              queryClient.setQueryData(["/api/conversations", conversationId], (old: any) => {
                if (!old) return old;
                return {
                  ...old,
                  messages: old.messages.map((m: any) => 
                    m.id === tempAiId ? { ...m, content: fullContent } : m
                  )
                };
              });
            }
            if (data.done) {
              await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
            }
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        }
      }

      // Flush any remaining data left in the buffer after stream ends
      if (buffer.trim().startsWith("data: ")) {
        const payload = buffer.trim().slice(6).trim();
        if (payload && payload !== "[DONE]") {
          try {
            const data = JSON.parse(payload);
            if (data.content) {
              fullContent += data.content;
              queryClient.setQueryData(["/api/conversations", conversationId], (old: any) => {
                if (!old) return old;
                return {
                  ...old,
                  messages: old.messages.map((m: any) => 
                    m.id === tempAiId ? { ...m, content: fullContent } : m
                  )
                };
              });
            }
            if (data.done) {
              await queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
            }
          } catch (_) { /* ignore final partial line */ }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
    }
  }, [activeConversationId, toast]);

  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "48px",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
          onCreate={() => createConversation.mutate()}
          onDelete={(id) => deleteConversation.mutate(id)}
          isLoading={conversationsLoading}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <ChatWindow
              messages={activeConversation?.messages || []}
              isStreaming={isStreaming}
              onSendMessage={sendMessage}
              conversationTitle={activeConversation?.title}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

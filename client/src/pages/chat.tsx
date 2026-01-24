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
  const [streamingContent, setStreamingContent] = useState("");
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

    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Build the message content - include image description if present
      let messageContent = content;
      if (imageDataUrl) {
        const imagePrefix = "[Screenshot attached]\n";
        messageContent = imagePrefix + (content || "Please analyze this screenshot.");
      }

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.done) {
                // Refresh messages
                queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
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
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
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
              streamingContent={streamingContent}
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

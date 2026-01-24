import { Plus, MessageSquare, Trash2, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import type { Conversation } from "@shared/schema";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isLoading,
}: ChatSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="ruby-gradient p-2 rounded-md">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">Ruby AI</h1>
            <p className="text-xs text-sidebar-foreground/70">Your AI Assistant</p>
          </div>
        </div>
      </SidebarHeader>

      <div className="px-3 pb-3">
        <Button
          onClick={onCreate}
          className="w-full justify-start gap-2"
          variant="default"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-200px)] custom-scrollbar">
              <SidebarMenu>
                {isLoading ? (
                  <div className="px-3 py-8 text-center text-sm text-sidebar-foreground/50">
                    Loading...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-sidebar-foreground/50">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        onClick={() => onSelect(conv.id)}
                        isActive={activeId === conv.id}
                        className="group justify-between gap-2"
                        data-testid={`button-conversation-${conv.id}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          className="h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 shrink-0 hover-elevate cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              onDelete(conv.id);
                            }
                          }}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

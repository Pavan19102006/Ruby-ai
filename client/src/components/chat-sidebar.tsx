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
          <div className="ruby-gradient-animated p-2.5 rounded-xl shadow-lg transition-transform duration-300 hover:scale-105">
            <Gem className="h-6 w-6 text-white drop-shadow" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">Ruby AI</h1>
            <p className="text-xs text-sidebar-foreground/60">Your AI Assistant</p>
          </div>
        </div>
      </SidebarHeader>

      <div className="px-3 pb-4">
        <Button
          onClick={onCreate}
          className="w-full justify-start gap-2 shadow-sm transition-all duration-300 hover:shadow-md"
          variant="default"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-medium uppercase tracking-wider px-3">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-220px)] custom-scrollbar">
              <SidebarMenu className="px-1">
                {isLoading ? (
                  <div className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 rounded-full border-2 border-sidebar-foreground/20 border-t-primary animate-spin" />
                      <span className="text-sm text-sidebar-foreground/50">Loading...</span>
                    </div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-3 py-12 text-center fade-in">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-xl bg-sidebar-accent/30">
                        <MessageSquare className="h-6 w-6 text-sidebar-foreground/40" />
                      </div>
                      <p className="text-sm text-sidebar-foreground/50">No conversations yet</p>
                      <p className="text-xs text-sidebar-foreground/30">Start a new chat above</p>
                    </div>
                  </div>
                ) : (
                  conversations.map((conv, index) => (
                    <SidebarMenuItem 
                      key={conv.id} 
                      className="opacity-0 animate-scale-bounce"
                      style={{ 
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: "forwards"
                      }}
                    >
                      <div className="flex items-center gap-1 w-full group">
                        <SidebarMenuButton
                          onClick={() => onSelect(conv.id)}
                          isActive={activeId === conv.id}
                          className="flex-1 gap-2 transition-all duration-200"
                          data-testid={`button-conversation-${conv.id}`}
                        >
                          <MessageSquare className={cn(
                            "h-4 w-4 shrink-0 transition-colors duration-200",
                            activeId === conv.id && "text-primary"
                          )} />
                          <span className="truncate font-medium">{conv.title}</span>
                        </SidebarMenuButton>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(conv.id);
                          }}
                          data-testid={`button-delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

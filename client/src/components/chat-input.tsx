import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Sparkles, X, Image, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { ScreenshotCapture } from "./screenshot-capture";
import { useToast } from "@/hooks/use-toast";

const messageSchema = z.object({
  content: z.string().max(10000, "Message too long"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface ChatInputProps {
  onSend: (message: string, imageDataUrl?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Message Ruby AI..." }: ChatInputProps) {
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  // Handle clipboard paste for screenshots (Cmd+V / Ctrl+V)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setAttachedImage(dataUrl);
            toast({
              title: "Screenshot attached",
              description: "Your screenshot has been added to the message",
            });
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, [toast]);

  const onSubmit = (data: MessageFormData) => {
    if (!disabled && (data.content.trim() || attachedImage)) {
      onSend(data.content.trim(), attachedImage || undefined);
      form.reset();
      setAttachedImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const content = form.watch("content");

  useEffect(() => {
    const textarea = document.querySelector('[data-testid="input-chat-message"]') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  const hasContent = content.trim().length > 0 || attachedImage;

  const handleScreenshot = (imageDataUrl: string) => {
    setAttachedImage(imageDataUrl);
  };

  const removeImage = () => {
    setAttachedImage(null);
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="flex flex-col gap-2 p-4 border-t"
      >
        {attachedImage && (
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg animate-scale-bounce">
            <div className="relative">
              <img 
                src={attachedImage} 
                alt="Attached screenshot" 
                className="h-20 w-auto max-w-[200px] rounded-lg object-cover border shadow-sm"
                data-testid="image-attached-preview"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={removeImage}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                data-testid="button-remove-image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Image className="h-3 w-3" />
              <span>Screenshot attached</span>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <ScreenshotCapture onCapture={handleScreenshot} disabled={disabled} />
          
          <div className="relative flex-1">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      {...field}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder={attachedImage ? "Add a message about the screenshot..." : placeholder}
                      disabled={disabled}
                      rows={1}
                      className="min-h-[48px] max-h-[200px] resize-none text-base pr-4 rounded-xl border-2 transition-all duration-300 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10"
                      data-testid="input-chat-message"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {!hasContent && !disabled && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Sparkles className="h-4 w-4 text-muted-foreground/30" />
              </div>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={disabled || !hasContent}
            size="icon"
            className={cn(
              "shrink-0 rounded-xl shadow-md transition-all duration-300",
              hasContent && !disabled 
                ? "scale-100 opacity-100" 
                : "scale-95 opacity-70"
            )}
            data-testid="button-send-message"
          >
            <Send className={cn(
              "h-4 w-4 transition-transform duration-300",
              hasContent ? "translate-x-0.5 -translate-y-0.5" : ""
            )} />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

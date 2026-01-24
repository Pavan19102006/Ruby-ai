import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

const messageSchema = z.object({
  content: z.string().min(1, "Message is required").max(10000, "Message too long"),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Message Ruby AI..." }: ChatInputProps) {
  const form = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  const onSubmit = (data: MessageFormData) => {
    if (!disabled) {
      onSend(data.content.trim());
      form.reset();
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

  const hasContent = content.trim().length > 0;

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="flex items-end gap-3 p-4 border-t"
      >
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
                    placeholder={placeholder}
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
            hasContent && "translate-x-0.5 -translate-y-0.5"
          )} />
        </Button>
      </form>
    </Form>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

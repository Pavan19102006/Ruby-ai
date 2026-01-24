import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2 p-4 border-t bg-background">
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
                  className="min-h-[44px] max-h-[200px] resize-none text-base"
                  data-testid="input-chat-message"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={disabled || !content.trim()}
          size="icon"
          className="shrink-0"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import OpenAI from "openai";
import { z } from "zod";

// Groq client for text/thinking (super fast)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// OpenRouter client for vision (many models, good rate limits)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Model configuration
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.VISION_MODEL || "google/gemini-2.0-flash-001";

// Validation schemas
const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional().default("New Chat"),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, "Message is required").max(10000, "Message too long"),
  imageDataUrl: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Get all conversations (scoped to logged-in user)
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages (verify ownership)
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      // Verify ownership
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation (attached to logged-in user)
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const result = createConversationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request", details: result.error.format() });
      }

      const userId = req.user!.id;
      const conversation = await storage.createConversation(result.data.title, userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation (verify ownership)
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      // Verify ownership
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming, verify ownership)
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      // Verify ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = sendMessageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request", details: result.error.format() });
      }

      const { content, imageDataUrl } = result.data;

      // Save user message
      await storage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const existingMessages = await storage.getMessagesByConversation(conversationId);

      // Build chat history with system prompt
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are Ruby AI, a helpful, friendly, and intelligent assistant. You provide clear, accurate, and thoughtful responses. You have a warm personality and enjoy helping users with their questions and tasks. Be concise but thorough in your answers. When users share screenshots or images, analyze them carefully and provide helpful insights.`
        },
      ];

      // Add existing messages
      for (const m of existingMessages.slice(0, -1)) {
        chatMessages.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      }

      // Add the current message with image if present
      if (imageDataUrl) {
        chatMessages.push({
          role: "user",
          content: [
            { type: "text", text: content },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        });
      } else {
        chatMessages.push({
          role: "user",
          content: content,
        });
      }

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        let fullResponse = "";

        // Check if conversation has any images (current or in history)
        const hasImageInConversation = imageDataUrl || existingMessages.some(m =>
          m.content?.includes("[Screenshot attached]") || m.content?.includes("data:image")
        );

        // Use Gemini for conversations with images, Groq for text-only
        if (hasImageInConversation) {
          console.log("Using OpenRouter for vision...");

          // Rebuild messages with proper image handling for vision
          const visionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
              role: "system",
              content: `You are Ruby AI, a helpful, friendly, and intelligent assistant with vision capabilities. You can see and analyze images/screenshots. Provide clear, accurate, and thoughtful responses about what you see. Be concise but thorough.`
            },
          ];

          // Add existing messages (keeping image references in context)
          for (const m of existingMessages.slice(0, -1)) {
            visionMessages.push({
              role: m.role as "user" | "assistant",
              content: m.content,
            });
          }

          // Add the current message with image if present
          if (imageDataUrl) {
            visionMessages.push({
              role: "user",
              content: [
                { type: "text", text: content },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            });
          } else {
            visionMessages.push({
              role: "user",
              content: content,
            });
          }

          const stream = await openrouter.chat.completions.create({
            model: VISION_MODEL,
            messages: visionMessages,
            stream: true,
            max_tokens: 4096,
          });

          for await (const chunk of stream) {
            const chunkContent = chunk.choices[0]?.delta?.content || "";
            if (chunkContent) {
              fullResponse += chunkContent;
              res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
            }
          }
        } else {
          // Use Groq for text-only conversations (fast thinking)
          console.log("Using Groq for text message...");

          // Convert messages for Groq (text only)
          const textMessages = chatMessages.map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: typeof m.content === 'string' ? m.content : m.content.map((c: any) => c.type === 'text' ? c.text : '').join('')
          }));

          const stream = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: textMessages,
            stream: true,
            max_tokens: 4096,
          });

          for await (const chunk of stream) {
            const chunkContent = chunk.choices[0]?.delta?.content || "";
            if (chunkContent) {
              fullResponse += chunkContent;
              res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
            }
          }
        }

        // Save assistant message
        await storage.createMessage(conversationId, "assistant", fullResponse);

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (aiError: any) {
        console.error("AI Error:", aiError?.message || aiError);
        res.write(`data: ${JSON.stringify({ error: "Failed to get AI response. Please check your API configuration." })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  return httpServer;
}

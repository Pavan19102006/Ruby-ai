import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { z } from "zod";

// Configure OpenAI client with user's API key
// Uses Replit AI Integrations if user's key isn't set
const openai = new OpenAI({
  apiKey: process.env.OLLAMA_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.OLLAMA_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
  
  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const result = createConversationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request", details: result.error.format() });
      }
      
      const conversation = await storage.createConversation(result.data.title);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
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
        // Log for debugging
        console.log("Sending to AI with image:", !!imageDataUrl);
        
        // Stream response from AI
        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: chatMessages,
          stream: true,
          max_tokens: 2048,
        });

        let fullResponse = "";

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }

        // Save assistant message
        await storage.createMessage(conversationId, "assistant", fullResponse);

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (aiError) {
        console.error("AI Error:", aiError);
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

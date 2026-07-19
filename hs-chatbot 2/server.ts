import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Prefer the user-provided working key AQ... over the system's denied key starting with AIza
const apiKey = (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("AIzaSyC2")) 
  ? process.env.GEMINI_API_KEY 
  : "AQ.Ab8RN6KkxNilZ4VN2MvkYW9BIa3AZaUAxqS7dF9n1SHiQ-eCAg";

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure OpenAI SDK with user's requested key as a secure fallback
const openAiApiKey = process.env.OPENAI_API_KEY || "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";
const openai = new OpenAI({
  apiKey: openAiApiKey
});


app.use(express.json({ limit: "50mb" }));

// Helper to fetch file from url and convert to base64
const fetchFileAsBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file from URL: ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
};

// API health check
app.get("/api/health", (req, res) => {
  const envKey = process.env.GEMINI_API_KEY;
  const usedKey = apiKey;
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    envKeyStatus: {
      exists: !!envKey,
      length: envKey ? envKey.length : 0,
      prefix: envKey ? envKey.substring(0, 8) + "..." : "none",
    },
    usedKeyStatus: {
      length: usedKey ? usedKey.length : 0,
      prefix: usedKey ? usedKey.substring(0, 8) + "..." : "none",
      isFallback: usedKey === "AQ.Ab8RN6KkxNilZ4VN2MvkYW9BIa3AZaUAxqS7dF9n1SHiQ-eCAg",
    }
  });
});

// AI Chat Generation Endpoint
app.post("/api/chat", async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { messages, model, stream = true } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    // Handle OpenAI Models
    if (model === "gpt-4o-mini" || model === "gpt-4o") {
      const clientOpenAiApiKey = req.body.clientOpenAiApiKey;
      const openaiClient = clientOpenAiApiKey ? new OpenAI({ apiKey: clientOpenAiApiKey }) : openai;
      const targetOpenAiModel = model; // "gpt-4o-mini" or "gpt-4o"

      const openAiMessages = await Promise.all(messages.map(async (msg: any) => {
        const role = (msg.role === "assistant" || msg.role === "model" || msg.role === "system") ? (msg.role === "system" ? "system" : "assistant") : "user";
        
        let base64Data = msg.file?.data;
        const mimeType = msg.file?.mimeType || msg.fileType;

        if (!base64Data && msg.fileUrl) {
          try {
            base64Data = await fetchFileAsBase64(msg.fileUrl);
          } catch (err) {
            console.error("Error fetching file URL for OpenAI:", err);
          }
        }

        if (base64Data && mimeType?.startsWith("image/")) {
          const contentParts: any[] = [];
          if (msg.content) {
            contentParts.push({ type: "text", text: msg.content });
          }
          let formattedBase64 = base64Data;
          if (!formattedBase64.startsWith("data:")) {
            formattedBase64 = `data:${mimeType};base64,${formattedBase64}`;
          }
          contentParts.push({
            type: "image_url",
            image_url: {
              url: formattedBase64
            }
          });
          return { role, content: contentParts };
        } else {
          return { role, content: msg.content || "" };
        }
      }));

      // Prepend system instruction
      openAiMessages.unshift({
        role: "system",
        content: "You are HS Chatbot, an elite, SaaS-level AI assistant designed by Hissan Sethi (HS) with an exceptionally professional, clean, and direct tone. Format all responses using highly polished markdown: make extensive use of tables, bold highlights, bullets, and properly syntax-highlighted code blocks. Ensure descriptions are sophisticated, logical, and clear."
      });

      if (stream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        });

        try {
          const responseStream = await openaiClient.chat.completions.create({
            model: targetOpenAiModel,
            messages: openAiMessages as any,
            stream: true,
          });

          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
            }
          }
          res.write("data: [DONE]\n\n");
          res.end();
        } catch (streamError: any) {
          console.error("OpenAI streaming error:", streamError);
          const msg = streamError.message || "OpenAI streaming error";
          res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
          res.end();
        }
      } else {
        const response = await openaiClient.chat.completions.create({
          model: targetOpenAiModel,
          messages: openAiMessages as any,
        });
        return res.json({ text: response.choices[0]?.message?.content || "" });
      }
      return;
    }

    // Determine the exact Gemini model to use
    let targetModel = "gemini-3.5-flash";
    let systemInstruction = "You are HS Chatbot, an elite, SaaS-level AI assistant designed by Hissan Sethi (HS) with an exceptionally professional, clean, and direct tone. Format all responses using highly polished markdown: make extensive use of tables, bold highlights, bullets, and properly syntax-highlighted code blocks. Ensure descriptions are sophisticated, logical, and clear.";

    if (model === "gemini-3.1-pro-preview") {
      targetModel = "gemini-3.1-pro-preview";
    } else if (model === "hs-deep-thinking") {
      targetModel = "gemini-3.1-pro-preview";
      systemInstruction = `You are HS Deep Thinking, an elite research-oriented AI specialist.
For every user prompt, you must perform deep, logical, and thorough reasoning:
1. First, outline your intellectual analysis and step-by-step reasoning behind your conclusions.
2. Structure your thinking before giving the final answer.
3. Be comprehensive, technical, and precise, addressing potential edge cases, trade-offs, and design patterns.
4. Format your entire answer in structured sections using elegant typography, tables, and highlighted code blocks.
5. Emphasize analytical depth, clarity, and precision.`;
    }

    // Map frontend messages to Gemini API contents structure
    const contentsPayload = await Promise.all(messages.map(async (msg: any) => {
      const parts: any[] = [];

      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Add base64 files if present (image/pdf/raw) or fetch them if only url is present
      let base64Data = msg.file?.data;
      const mimeType = msg.file?.mimeType || msg.fileType;

      if (!base64Data && msg.fileUrl) {
        try {
          base64Data = await fetchFileAsBase64(msg.fileUrl);
        } catch (err) {
          console.error("Error fetching file URL for Gemini:", err);
        }
      }

      if (base64Data && mimeType) {
        // Strip data:image/...;base64, prefix if present
        let cleanBase64 = base64Data;
        if (cleanBase64.includes(";base64,")) {
          cleanBase64 = cleanBase64.split(";base64,")[1];
        }

        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        });
      }

      return {
        role: (msg.role === "assistant" || msg.role === "model") ? "model" : "user",
        parts,
      };
    }));

    if (stream) {
      // Set headers for SSE streaming
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      try {
        const responseStream = await ai.models.generateContentStream({
          model: targetModel,
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: model === "hs-deep-thinking" ? 0.3 : 0.7,
          }
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamError: any) {
        console.error("Streaming error:", streamError);
        let msg = streamError.message || "Streaming error";
        if (msg.includes("denied access") || msg.includes("PERMISSION_DENIED")) {
          msg = "Your project has been denied access to the Gemini free tier by Google. To fix this and continue chatting, please click 'Preferences' (gear icon) in the bottom-left corner of the sidebar, and paste your own Gemini API Key in the 'Client API Key' field.";
        } else if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("Quota exceeded")) {
          msg = "The shared API key has temporarily exceeded its usage quota limit. To continue chatting, click 'Preferences' (gear icon) in the bottom-left corner and configure your own personal Gemini API Key in the 'Client API Key' field.";
        } else if (msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("503") || msg.includes("Service Unavailable")) {
          msg = "The requested model is currently experiencing extremely high demand (Google 503 Service Unavailable). Please try again in a few moments, select a different model from the selection dropdown (e.g., HS Chat Pro or Deep Thinking), or set your own API key in Preferences.";
        }
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature: model === "hs-deep-thinking" ? 0.3 : 0.7,
        }
      });

      return res.json({ text: response.text });
    }
  } catch (error: any) {
    console.error("API Chat Error:", error);
    let msg = error.message || "An error occurred with Gemini.";
    if (msg.includes("denied access") || msg.includes("PERMISSION_DENIED")) {
      msg = "Your project has been denied access to the Gemini free tier by Google. To fix this and continue chatting, please click 'Preferences' (gear icon) in the bottom-left corner of the sidebar, and paste your own Gemini API Key in the 'Client API Key' field.";
    } else if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("Quota exceeded")) {
      msg = "The shared API key has temporarily exceeded its usage quota limit. To continue chatting, click 'Preferences' (gear icon) in the bottom-left corner and configure your own personal Gemini API Key in the 'Client API Key' field.";
    } else if (msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("503") || msg.includes("Service Unavailable")) {
      msg = "The requested model is currently experiencing extremely high demand (Google 503 Service Unavailable). Please try again in a few moments, select a different model from the selection dropdown (e.g., HS Chat Pro or Deep Thinking), or set your own API key in Preferences.";
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: msg });
    }
    res.end();
  }
});

// Vite Server middleware integration for dev/prod serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HS Chatbot server running at http://localhost:${PORT}`);
  });
}

startServer();

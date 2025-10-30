// ====================================================================
// FILE: api/ai-proxy.js
// PURPOSE: Secure Cloud Proxy for SpeakPage AI Chrome Extension
// BACKEND: Node.js (Vercel Serverless Function)
// DEPENDENCIES: axios
// ====================================================================

import axios from "axios";

export default async function handler(req, res) {
  // --- 1. CORS (required for Chrome Extension requests) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  // --- 2. Quick health check ---
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "✅ SpeakPage AI Proxy (Node.js + Axios) is live.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    // --- 3. Parse request body ---
    const { action, text, prompt, targetLanguage } = req.body || {};

    if (!action || !text) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: 'action' or 'text'.",
      });
    }

    // --- 4. Setup model + API key ---
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const model = "gpt-3.5-turbo"; // You can switch to "gpt-4-turbo" if available

    // --- 5. Define system prompt dynamically based on action ---
    let userPrompt = "";

    switch (action) {
      case "summarize":
        userPrompt = `Summarize this webpage clearly and concisely:\n\n${text}`;
        break;
      case "translate":
        userPrompt = `Translate the following text to ${targetLanguage || "Hindi"}:\n\n${text}`;
        break;
      case "multimodal_prompt":
        userPrompt = `Use the following article as context and answer this question: ${prompt}\n\nArticle:\n${text}`;
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid action." });
    }

    // --- 6. Call OpenAI (or any LLM endpoint) securely via Axios ---
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: "You are SpeakPage AI Assistant." },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content.trim();

    // --- 7. Return the result to the extension ---
    return res.status(200).json({
      success: true,
      result: aiResponse,
      type: action,
    });
  } catch (error) {
    console.error("Proxy Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || "Server error during AI request",
    });
  }
}

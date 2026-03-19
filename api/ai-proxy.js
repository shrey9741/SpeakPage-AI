// =================================================================
// FILE: api/ai-proxy.js
// SpeakPage AI — Groq API Proxy (Vercel Serverless)
// Model: llama-3.1-8b-instant (free, fast, no billing)
// =================================================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "✅ SpeakPage AI Proxy (Groq) is live." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { action, text, prompt, targetLanguage } = req.body || {};

    if (!action || !text) {
      return res.status(400).json({ success: false, error: "Missing required fields: 'action' or 'text'." });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, error: "GROQ_API_KEY not configured on server." });
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "summarize":
        systemPrompt = "You are a summarization assistant. Extract key points from articles clearly and concisely. Format as a short bulleted list with maximum 5 points. Be direct.";
        userPrompt = `Summarize this article into key points:\n\n${text}`;
        break;
      case "translate":
        systemPrompt = `You are a professional translator. Translate text accurately to ${targetLanguage || "Hindi"}. Output only the translated text, nothing else.`;
        userPrompt = `Translate this to ${targetLanguage || "Hindi"}:\n\n${text}`;
        break;
      case "simplify":
        systemPrompt = "You are a language simplification assistant. Rewrite text using simple words and short sentences that a 10-year-old can understand. Keep all key facts. Output only the simplified text.";
        userPrompt = `Simplify this article:\n\n${text}`;
        break;
      case "multimodal_prompt":
        systemPrompt = "You are SpeakPage AI, a helpful reading assistant built into a Chrome extension. Answer questions about articles clearly and concisely. Keep answers under 150 words.";
        userPrompt = `Article:\n${text}\n\nQuestion: ${prompt}`;
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid action." });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ success: false, error: data.error?.message || "Groq API error" });
    }

    const aiResponse = data.choices[0].message.content.trim();
    return res.status(200).json({ success: true, result: aiResponse, type: action });

  } catch (error) {
    console.error("Proxy Error:", error.message);
    return res.status(500).json({ success: false, error: error.message || "Server error during AI request" });
  }
}
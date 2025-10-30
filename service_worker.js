// =================================================================
// FILE: service_worker.js (Fixed + Debug Logging)
// =================================================================

const PROXY_URL = 'https://speak-page-atxhcshy6-shreykr03-4807s-projects.vercel.app/api/ai-proxy'; 
const FALLBACK_LANG = 'en-IN';

// --- Core API Proxy Fetch Function ---
async function fetchFromAIProxy(action, text, options = {}) {
    try {
        console.log(`[AI-PROXY] Sending request to ${PROXY_URL}...`);

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({
                action,
                text,
                ...options
            })
        });

        if (!response.ok) {
            console.error(`[AI-PROXY] HTTP ${response.status}`);
            throw new Error(`AI Proxy Error (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[AI-PROXY] Raw response:', data);

        if (data?.success && data?.result) {
            return data.result;
        } else {
            throw new Error(data?.error || 'Invalid AI response format.');
        }

    } catch (error) {
        console.error('FETCH ERROR:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'SpeakPage AI Error',
            message: `Proxy request failed: ${error.message}`
        });
        return null;
    }
}

// --- Main Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const runAsync = async () => {
        try {
            const tabId = request.tabId;

            // --- TTS Controls ---
            if (request.action === "pause_reading") return chrome.tts.pause();
            if (request.action === "resume_reading") return chrome.tts.resume();
            if (request.action === "stop_reading") return chrome.tts.stop();

            // --- Inject extraction function ---
            const [result] = await chrome.scripting.executeScript({
                target: { tabId },
                func: extractArticleText,
            });

            const textToProcess = result?.result;
            if (!textToProcess || textToProcess.length < 100) {
                chrome.runtime.sendMessage({ action: "reading_failed", message: "Could not extract article text." });
                return;
            }

            // --- Handle each action ---
            if (request.action === "start_reading") {
                chrome.tts.speak(textToProcess, { lang: FALLBACK_LANG, rate: request.rate || 1.0 });
                chrome.runtime.sendMessage({ action: "reading_started" });

            } else if (request.action === "get_summary") {
                chrome.runtime.sendMessage({ action: "summary_result", summary: "⏳ Summarizing... (please wait)" });
                const summary = await fetchFromAIProxy('summarize', textToProcess);
                chrome.runtime.sendMessage({
                    action: "summary_result",
                    summary: summary || "❌ Failed to summarize. Please try again."
                });

            } else if (request.action === "multimodal_prompt") {
                const answer = await fetchFromAIProxy('multimodal_prompt', textToProcess, { prompt: request.prompt });
                chrome.runtime.sendMessage({
                    action: "prompt_result",
                    answer: answer || "❌ AI prompt failed. Try again."
                });
            }

        } catch (err) {
            console.error('SERVICE WORKER ERROR:', err);
            chrome.runtime.sendMessage({
                action: "reading_failed",
                message: `Internal error: ${err.message}`
            });
        }
    };

    runAsync();
    return true;
});

// --- Text Extraction Logic ---
function extractArticleText() {
    const MAX_SAFE_LENGTH = 4000;
    let finalContent = "";

    const headline = document.querySelector("h1, h2");
    if (headline) finalContent += "HEADLINE: " + headline.innerText.trim() + ". ";

    const blocks = ["article", ".entry-content", ".story-body", "main", "body"];
    for (const selector of blocks) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 500) {
            let text = el.innerText
                .replace(/ADVERTISEMENT|Read More|Next|Previous|Subscribe|Sign In/gi, "")
                .replace(/\s{2,}/g, " ")
                .replace(/[\r\n]+/g, " ");
            finalContent += text.trim();
            break;
        }
    }

    if (!finalContent) finalContent = document.body.innerText;
    return finalContent.trim().substring(0, MAX_SAFE_LENGTH);
}

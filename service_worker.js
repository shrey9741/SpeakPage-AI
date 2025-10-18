// =================================================================
// FILE: service_worker.js
// Purpose: Orchestrates content script and Firebase API calls.
// =================================================================

// IMPORTANT: REPLACE THIS URL WITH YOUR ACTUAL DEPLOYED FUNCTION URL 
// (e.g., the URL Firebase prints after a successful deployment)
const PROXY_URL = 'https://speak-page-atxhcshy6-shreykr03-4807s-projects.vercel.app/api/ai-proxy';
const FALLBACK_LANG = 'en-US';


// --- Core API Proxy Fetch Function ---
async function fetchFromAIProxy(action, text, options = {}) {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action,
                text: text,
                ...options 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`AI Proxy Error: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
            return data.result;
        } else {
            throw new Error(data.error || 'Unknown proxy error.');
        }
    } catch (error) {
        console.error('FETCH ERROR:', error);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png', 
            title: 'SpeakPage AI Error',
            message: `Failed to process AI request: ${error.message.substring(0, 80)}...`
        });
        return null;
    }
}


// --- Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // We execute the function asynchronously, so return true to keep the port open.
    const runAsync = async () => {
        const tabId = request.tabId || sender.tab.id;
        
        // 1. Get Text from the active tab using the Content Script
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: extractArticleText, // Calls the function *below* in the tab context
        });

        const textToProcess = injectionResults[0]?.result;

        if (!textToProcess) {
            chrome.runtime.sendMessage({ action: "reading_failed", message: "Could not find text." });
            return;
        }
        
        // --- ROUTE ACTIONS ---
        if (request.action === "start_reading") {
            // TTS: Use built-in Chrome TTS for instant playback
            chrome.tts.speak(textToProcess, { lang: FALLBACK_LANG });
            chrome.runtime.sendMessage({ action: "reading_started" });

        } else if (request.action === "get_summary") {
            // SUMMARIZATION: Call the secure proxy
            const summary = await fetchFromAIProxy('summarize', textToProcess);
            if (summary) {
                chrome.runtime.sendMessage({ action: "summary_result", summary: summary });
            }
        }
    };
    
    runAsync();
    return true; // Keep the message port open for the asynchronous response.
});

// --- Function to be injected (Must be copied from content.js) ---
function extractArticleText() {
    // This is the code that will run inside the webpage
    const selectors = ['article', '.post-content', 'main', '#content', 'body'];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.length > 500) { 
            let text = element.innerText;
            text = text.replace(/[\r\n]+/g, ' '); 
            text = text.replace(/\s{2,}/g, ' '); 
            return text.trim();
        }
    }
    return document.body.innerText.substring(0, 5000).trim();
}
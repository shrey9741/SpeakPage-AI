// =================================================================
// FILE: service_worker.js (Final, Functional Version)
// Purpose: Orchestrates content scraping, TTS, and secure Vercel API calls.
// Solves: TTS not starting immediately (by adding chrome.tts.stop()).
// =================================================================

const PROXY_URL = 'https://speak-page-atxhcshy6-shreykr03-4807s-projects.vercel.app/api/ai-proxy'; 
const FALLBACK_LANG = 'en-IN';


// --- Core API Proxy Fetch Function (No Change) ---
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
            throw new Error(`AI Proxy Error (${response.status}): ${errorData.error || response.statusText}`);
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
            iconUrl: 'icon128.png', 
            title: 'SpeakPage AI Error',
            message: `Failed to process AI request: ${error.message.substring(0, 80)}...`
        });
        return null;
    }
}


// --- Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    const runAsync = async () => {
        const tabId = request.tabId;

        // --- TTS Playback Controls (Handle BEFORE scraping) ---
        if (request.action === "pause_reading") {
            chrome.tts.pause();
            return;
        }
        if (request.action === "resume_reading") {
            chrome.tts.resume();
            return;
        }
        if (request.action === "stop_reading") {
            chrome.tts.stop();
            return; 
        }

        // --- Proceed only if text scraping is needed ---
        
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: extractArticleText, 
        });

        const textToProcess = injectionResults[0]?.result;

        if (!textToProcess || textToProcess.length < 100) { 
            chrome.runtime.sendMessage({ action: "reading_failed", message: "Could not find sufficient article text on the page." });
            return;
        }
        
        // --- ROUTE ACTIONS (API/TTS) ---
        if (request.action === "start_reading") {
            const rate = request.rate || 1.0; 
            
            // CRITICAL FIX: Stop any existing speech queue before starting new one
            chrome.tts.stop(); 
            
            chrome.tts.speak(textToProcess, { 
                lang: FALLBACK_LANG,
                rate: rate // Pass the speed rate
            }); 
            chrome.runtime.sendMessage({ action: "reading_started" });

        } else if (request.action === "get_summary") {
            const summary = await fetchFromAIProxy('summarize', textToProcess);
            if (summary) {
                chrome.runtime.sendMessage({ action: "summary_result", summary: summary });
            }
        } else if (request.action === "multimodal_prompt") {
            const answer = await fetchFromAIProxy('multimodal_prompt', textToProcess, {
                prompt: request.prompt 
            });
            if (answer) {
                chrome.runtime.sendMessage({ action: "prompt_result", answer: answer });
            }
        }
    };
    
    runAsync();
    return true; // Keep the message port open for the asynchronous response.
});

// --- Function to be injected (Clean Scraper Logic - SYNCHRONIZED COPY) ---
function extractArticleText() {
    const MAX_SAFE_LENGTH = 4000; 
    let finalContent = "";

    // 1. Extract Headline
    const headlineElement = document.querySelector('h1') || document.querySelector('h2');
    if (headlineElement) {
        finalContent += "HEADLINE: " + headlineElement.innerText.trim() + ". \n\n";
    }

    // 2. Extract Main Article Body using structural selectors
    const selectors = ['article', '.entry-content', '.story-body', 'main', 'body'];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        
        if (element && element.innerText.length > 500) { 
            let text = element.innerText;
            
            // AGGRESSIVE FILTERING: Remove navigation, ads, and common irrelevant text
            text = text.replace(/Download Lens Studio for Free|Powerful Accounting Software|Zoho Books|Get e-invoice compliant/gi, ''); 
            text = text.replace(/ADVERTISEMENT|Advertisement|Share|Read More|Related News|Next|Previous|Topics|Partners|Subscribe|Sign In/gi, ''); 
            text = text.replace(/Home|ePaper|India|UPSC|Premium|Entertainment|Politics|Sports|World|Explained|Opinion|Business|Kolkata|Lifestyle|Tech|Sections|Today's Paper|Newsletters/gi, ''); 
            text = text.replace(/ENGLISH|தமிழ்|বাংলা|മലയാളം|ગુજરાતી|हिंदी|मराठी|BUSINESS|JOURNALISM OF COURAGE|Tues|Wed|Thu|Oct|2025|opens in new window|window|Skip to content|Copyright|All Rights Reserved/gi, ''); 

            // Clean up formatting
            text = text.replace(/[\r\n]+/g, ' '); 
            text = text.replace(/\s{2,}/g, ' '); 
            
            finalContent += text.trim();
            break; 
        }
    }
    
    let fallbackText = finalContent.trim();
    
    // Fallback to body content if primary elements failed
    if (fallbackText.length === 0) {
        fallbackText = document.body.innerText;
        fallbackText = fallbackText.replace(/ADVERTISEMENT|Skip to content|Home|ePaper|Subscribe|Sign In/gi, '');
        fallbackText = fallbackText.replace(/[\r\n]+/g, ' '); 
        fallbackText = fallbackText.replace(/\s{2,}/g, ' '); 
    }

    // Apply final TTS safety limit
    return fallbackText.trim().substring(0, MAX_SAFE_LENGTH);
}
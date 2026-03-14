// =================================================================
// FILE: service_worker.js
// SpeakPage AI v3.0 — Groq API backend
// FIX: All sidePanel.open() removed — handled by popup.js instead
// =================================================================

const PROXY_URL = 'https://speak-page-6j20ep6kw-shreykr03-4807s-projects.vercel.app';
const FALLBACK_LANG = 'en-IN';

let keepAliveInterval = null;

function startKeepAlive() {
    if (keepAliveInterval) return;
    keepAliveInterval = setInterval(() => {
        chrome.tts.isSpeaking((speaking) => {
            if (!speaking) stopKeepAlive();
        });
    }, 20000);
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

function sendToPopup(data) {
    chrome.storage.local.set({ speakpage_event: data });
    chrome.runtime.sendMessage(data).catch(() => {});
}

function sendToSidebar(data) {
    chrome.storage.local.set({ speakpage_sidebar: data });
    chrome.runtime.sendMessage({ target: 'sidebar', ...data }).catch(() => {});
}

// =================================================================
// Groq API via Vercel proxy
// =================================================================
async function callGroq(action, text, options = {}) {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ action, text, ...options })
    });

    if (!response.ok) {
        throw new Error(`Proxy error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    if (data?.success && data?.result) return data.result;
    throw new Error(data?.error || 'Invalid response from proxy.');
}

// =================================================================
// MAIN MESSAGE LISTENER
// =================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const runAsync = async () => {
        try {
            const tabId = request.tabId;

            // --- TTS Controls ---
            if (request.action === "pause_reading")  { chrome.tts.pause(); return; }
            if (request.action === "resume_reading") { chrome.tts.resume(); return; }
            if (request.action === "stop_reading") {
                chrome.tts.stop();
                stopKeepAlive();
                chrome.tabs.sendMessage(tabId, { action: 'clear_highlight' }).catch(() => {});
                return;
            }

            // --- Extract article text ---
            const [result] = await chrome.scripting.executeScript({
                target: { tabId },
                func: extractArticleText,
            });

            const textToProcess = result?.result;
            if (!textToProcess || textToProcess.length < 50) {
                sendToPopup({ action: "reading_failed", message: "Could not extract article text. Try on a news/article page." });
                return;
            }

            // --- Read Aloud ---
            if (request.action === "start_reading") {
                const textForTTS = (request.simplified && request.simplifiedText)
                    ? request.simplifiedText : textToProcess;
                startKeepAlive();

                chrome.tabs.sendMessage(tabId, { action: 'prepare_highlight', text: textForTTS }).catch(() => {});

                chrome.tts.speak(textForTTS, {
                    lang: FALLBACK_LANG,
                    rate: request.rate || 1.0,
                    onEvent: (event) => {
                        if (event.type === 'word' && event.charIndex !== undefined) {
                            chrome.tabs.sendMessage(tabId, {
                                action: 'highlight_word',
                                charIndex: event.charIndex,
                                length: event.charLength || 0
                            }).catch(() => {});
                        }
                        if (['end', 'interrupted', 'cancelled'].includes(event.type)) {
                            stopKeepAlive();
                            chrome.tabs.sendMessage(tabId, { action: 'clear_highlight' }).catch(() => {});
                            sendToPopup({ action: "reading_finished" });
                        }
                        if (event.type === 'error') {
                            stopKeepAlive();
                            sendToPopup({ action: "reading_failed", message: "TTS error occurred." });
                        }
                    }
                });
                sendToPopup({ action: "reading_started" });

            // --- Summarize ---
            } else if (request.action === "get_summary") {
                sendToSidebar({ action: 'sidebar_update', feature: 'summary', status: 'loading', text: '⏳ Summarizing...' });
                try {
                    const summary = await callGroq('summarize', textToProcess);
                    sendToSidebar({ action: 'sidebar_update', feature: 'summary', status: 'done', text: summary });
                } catch (e) {
                    sendToSidebar({ action: 'sidebar_update', feature: 'summary', status: 'error', text: `❌ ${e.message}` });
                }
                sendToPopup({ action: "task_done" });

            // --- Translate ---
            } else if (request.action === "translate_page") {
                sendToSidebar({ action: 'sidebar_update', feature: 'translate', status: 'loading', text: `⏳ Translating...` });
                try {
                    const translated = await callGroq('translate', textToProcess, { targetLanguage: request.targetLang });
                    sendToSidebar({ action: 'sidebar_update', feature: 'translate', status: 'done', text: translated });
                } catch (e) {
                    sendToSidebar({ action: 'sidebar_update', feature: 'translate', status: 'error', text: `❌ ${e.message}` });
                }
                sendToPopup({ action: "task_done" });

            // --- Simplify ---
            } else if (request.action === "simplify_page") {
                sendToSidebar({ action: 'sidebar_update', feature: 'simplify', status: 'loading', text: '⏳ Simplifying language...' });
                try {
                    const simplified = await callGroq('simplify', textToProcess);
                    sendToSidebar({ action: 'sidebar_update', feature: 'simplify', status: 'done', text: simplified });
                    chrome.storage.local.set({ simplified_text: simplified });
                    sendToPopup({ action: "simplify_ready", text: simplified });
                } catch (e) {
                    sendToSidebar({ action: 'sidebar_update', feature: 'simplify', status: 'error', text: `❌ ${e.message}` });
                    sendToPopup({ action: "task_done" });
                }

            // --- Ask AI ---
            } else if (request.action === "multimodal_prompt") {
                sendToSidebar({ action: 'sidebar_update', feature: 'prompt', status: 'loading', text: '💭 Thinking...', prompt: request.prompt });
                try {
                    const answer = await callGroq('multimodal_prompt', textToProcess, { prompt: request.prompt });
                    sendToSidebar({ action: 'sidebar_update', feature: 'prompt', status: 'done', text: answer, prompt: request.prompt });
                } catch (e) {
                    sendToSidebar({ action: 'sidebar_update', feature: 'prompt', status: 'error', text: `❌ ${e.message}` });
                }
                sendToPopup({ action: "task_done" });
            }

        } catch (err) {
            console.error('SERVICE WORKER ERROR:', err);
            stopKeepAlive();
            sendToPopup({ action: "reading_failed", message: `Internal error: ${err.message}` });
        }
    };

    runAsync();
    return true;
});

// =================================================================
// extractArticleText — two-layer ad removal
// =================================================================
function extractArticleText() {
    const MAX_SAFE_LENGTH = 4000;
    const hostname = window.location.hostname;

    const JUNK_SELECTORS = [
        '[class*="ad-"]', '[class*="-ad"]', '[class*="ads-"]',
        '[id*="ad-"]', '[id*="-ad"]', '[id*="ads"]',
        '[class*="advert"]', '[id*="advert"]',
        '[class*="sponsored"]', '[id*="sponsored"]',
        '[class*="promo"]', '[id*="promo"]',
        '[class*="taboola"]', '[id*="taboola"]',
        '[class*="outbrain"]', '[id*="outbrain"]',
        '[class*="dfp"]', '[id*="dfp"]',
        'ins.adsbygoogle', '[data-ad]', '[data-adunit]',
        '[class*="share"]', '[class*="social"]',
        '[class*="follow"]', '[class*="newsletter"]',
        '[class*="related"]', '[class*="recommended"]',
        '[class*="more-stories"]', '[class*="read-more"]',
        '[class*="also-read"]',
        'nav', '[role="navigation"]', '[class*="breadcrumb"]',
        '[class*="author-bio"]', '[class*="author-info"]',
        '[class*="tags"]', '[class*="topics"]',
        '[class*="comment"]', '[id*="comment"]',
        '[class*="subscribe"]', '[class*="paywall"]',
        '[class*="signup"]', '[class*="register"]',
        'figcaption', 'aside', 'footer', 'header',
        'script', 'style', 'noscript', 'iframe',
        '[aria-hidden="true"]',
    ];

    let articleSelector = '';
    if (hostname.includes('indianexpress.com'))       articleSelector = '.full-details, .story-body';
    else if (hostname.includes('bbc.com'))            articleSelector = '[data-component="text-block"]';
    else if (hostname.includes('timesofindia'))       articleSelector = '.main-article-content, ._s30J';
    else if (hostname.includes('ndtv.com'))           articleSelector = '.ins_storybody, .article__content';
    else if (hostname.includes('thehindu.com'))       articleSelector = '.article-text, .storyline';
    else if (hostname.includes('hindustantimes.com')) articleSelector = '.storyDetails, .story-details';
    else if (hostname.includes('reuters.com'))        articleSelector = '[class*="article-body"]';
    else if (hostname.includes('theguardian.com'))    articleSelector = '.article-body-commercial-selector, [data-gu-name="body"]';
    else articleSelector = 'article .entry-content, article .post-content, .article-body, .story-content, article, [role="main"] p, main';

    const parts = [];

    const headlineEl = document.querySelector('h1') || document.querySelector('h2');
    if (headlineEl) {
        const ht = headlineEl.innerText.trim();
        if (ht.length > 5) parts.push("Headline: " + ht + ".");
    }

    const articleEl = document.querySelector(articleSelector);
    if (articleEl && articleEl.innerText.length > 200) {
        const clone = articleEl.cloneNode(true);
        JUNK_SELECTORS.forEach(sel => {
            try { clone.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
        });

        let text = clone.innerText || "";
        const JUNK_PHRASES = [
            /ADVERTISEMENT/gi, /Advertisement/gi,
            /Sponsored(?: Content| Post| by)?/gi, /Promoted(?: Content| Story)?/gi,
            /Partner Content/gi, /Paid Post/gi, /Presented by .{3,40}/gi,
            /Subscribe(?: Now| Today| for free)?/gi,
            /Sign [Uu]p(?: for| to| now)?[^.]{0,40}/gi,
            /Sign [Ii]n/gi, /Log [Ii]n/gi, /Register [Nn]ow/gi,
            /Get [Uu]nlimited [Aa]ccess/gi, /Already a subscriber\?/gi,
            /\b(Home|ePaper|Sections|Topics|Menu|More|Skip to)\b/gi,
            /\b(Next|Previous|Page \d+ of \d+)\b/gi,
            /\bAll Rights Reserved\b/gi, /Copyright © [\d\w ,]+/gi,
            /Share(?: on| via)? (Facebook|Twitter|WhatsApp|LinkedIn|Email)/gi,
            /Follow us on .{3,40}/gi,
            /Read [Aa]lso[:\-]?.{0,80}/gi, /Also [Rr]ead[:\-]?.{0,80}/gi,
            /READ MORE[:\-]?.{0,80}/gi,
        ];
        JUNK_PHRASES.forEach(p => { text = text.replace(p, ''); });
        text = text.replace(/[\r\n]{3,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
        if (text.length > 100) parts.push(text);
    }

    if (parts.length <= 1) {
        parts.push(document.body.innerText.replace(/\s{2,}/g, ' ').trim());
    }

    return parts.join(" ").trim().substring(0, MAX_SAFE_LENGTH);
}

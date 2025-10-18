// =================================================================
// FILE: popup.js (Final Version)
// Purpose: Handles UI interaction and message passing to service worker.
// Includes asynchronous error handling to suppress console warnings.
// =================================================================

const summarizeBtn = document.getElementById('summarizeBtn');
const readBtn = document.getElementById('readBtn');
const promptBtn = document.getElementById('promptBtn');
const outputDiv = document.getElementById('output');
const promptInput = document.getElementById('promptInput');

// Utility function to gracefully handle the promise closure error (The Fix)
function sendMessageWithCallback(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Use the callback argument to catch and ignore the expected error
        chrome.runtime.sendMessage({ ...message, tabId: tabs[0].id }, () => {
            if (chrome.runtime.lastError) {
                // Ignore the expected error when the popup closes too quickly
                console.log("Ignoring expected popup closure error:", chrome.runtime.lastError.message);
            }
            if (callback) {
                callback();
            }
        });
    });
}

// --- Message Listener from Service Worker (To receive results from Vercel) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summary_result") {
        outputDiv.textContent = `SUMMARY:\n${request.summary}`;
        summarizeBtn.textContent = 'Summarize Page';
        summarizeBtn.disabled = false;
        promptBtn.disabled = false;

    } else if (request.action === "reading_failed") {
        outputDiv.textContent = `Error: ${request.message}`;
        readBtn.disabled = false;
        
    } else if (request.action === "reading_started") {
        outputDiv.textContent = 'Reading aloud the full text...';
        readBtn.disabled = false;
        
    } else if (request.action === "prompt_result") {
        outputDiv.textContent = `AI RESPONSE:\n${request.answer}`;
        promptBtn.textContent = 'Get Answer';
        promptBtn.disabled = false;
    }
});


// --- Button Event Handlers ---

// 1. Summarize Button Click
summarizeBtn.addEventListener('click', () => {
    outputDiv.textContent = 'Analyzing and Summarizing...';
    summarizeBtn.textContent = 'Working...';
    summarizeBtn.disabled = true;
    promptBtn.disabled = true;

    // Send the message using the safe handler
    sendMessageWithCallback({ action: "get_summary" });
});

// 2. Read Button Click (Triggers TTS)
readBtn.addEventListener('click', () => {
    readBtn.disabled = true; // Disable until reading starts/fails
    outputDiv.textContent = 'Starting Text-to-Speech...';

    // Send the message using the safe handler
    sendMessageWithCallback({ action: "start_reading" });
});

// 3. Multimodal Prompt Button Click
promptBtn.addEventListener('click', () => {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
        outputDiv.textContent = "Please enter a question for the AI.";
        return;
    }

    outputDiv.textContent = 'Sending prompt to AI...';
    promptBtn.textContent = 'Working...';
    promptBtn.disabled = true;
    summarizeBtn.disabled = true;

    // Send the message using the safe handler
    sendMessageWithCallback({
        action: "multimodal_prompt",
        prompt: userPrompt
    });
});
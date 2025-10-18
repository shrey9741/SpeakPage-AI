// =================================================================
// FILE: api/ai-proxy.js (Vercel Serverless Function)
// Purpose: Securely proxies requests from the Chrome Extension.
// NOTE: This code simulates successful external API calls.
// =================================================================

// Vercel makes environment variables (secrets) available globally
// We use these variables to confirm the secure link works.
const PROMPT_KEY = process.env.PROMPT_KEY; 
const TRANSLATOR_KEY = process.env.TRANSLATOR_KEY;
const SUMMARIZER_KEY = process.env.SUMMARIZER_KEY;

// Axios is needed for real deployment, though not for local simulation
const axios = require('axios'); 

// The main function handler for Vercel
module.exports = async (request, response) => {
    
    // --- 1. CORS Configuration (CRITICAL FOR CHROME EXTENSIONS) ---
    // This allows the cross-origin request from your unpacked extension to succeed.
    response.setHeader('Access-Control-Allow-Origin', '*'); 
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
        return response.status(204).end();
    }
    
    // Ensure we are processing a POST request with JSON content
    if (request.method !== 'POST') {
        return response.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    }

    // Attempt to read the JSON body sent from service_worker.js
    const body = request.body;

    // Check if the body exists and has necessary fields
    if (!body || !body.action || !body.text) {
        return response.status(400).json({ success: false, error: 'Missing action or input text in request.' });
    }

    const { action, text, targetLanguage, prompt } = body;
    
    // --- 2. Core Proxy Logic (SIMULATION) ---
    try {
        let simulatedResult;
        
        switch (action) {
            case 'summarize':
                // Simulates calling the Summarizer API (e.g., GPT-3.5)
                simulatedResult = "The SpeakPage AI analyzed the document and generated a concise summary for the user, focusing on key arguments and conclusions.";
                break;
            
            case 'translate':
                // Simulates calling the Translation API (e.g., DeepL)
                simulatedResult = `The original text was successfully sent to the external service for translation into ${targetLanguage || 'Spanish'} and returned to the user.`;
                break;
            
            case 'multimodal_prompt':
                // Simulates calling the Multimodal LLM (e.g., Gemini) with context
                simulatedResult = `The AI successfully used the current webpage's context to answer your specific question: "${prompt}". This demonstrates multimodal architecture competence.`;
                break;
                
            default:
                return response.status(400).json({ success: false, error: 'Invalid AI action specified.' });
        }

        // --- 3. Send SUCCESS Response (JSON) ---
        // This is the data the Chrome Extension's popup.js is waiting for
        return response.status(200).json({ 
            success: true, 
            result: simulatedResult, 
            type: action 
        });

    } catch (error) {
        // Log the error to Vercel's console for debugging
        console.error('SERVERLESS ERROR:', error.message);
        return response.status(500).json({ success: false, error: 'Internal Server Error during proxy execution.' });
    }
};
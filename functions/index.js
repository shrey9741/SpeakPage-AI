// =================================================================
// FILE: functions/index.js (CORRECTED V1 SYNTAX)
// NOTE: Requires 'axios' installed in the functions folder.
// =================================================================

const functions = require('firebase-functions/v1');
const axios = require('axios'); 
// No need to import setGlobalOptions or onRequest from v2/https

// --- SECURE SECRET INJECTION ---
const PROMPT_KEY = process.env.PROMPT_KEY;
const TRANSLATOR_KEY = process.env.TRANSLATOR_KEY;
const SUMMARIZER_KEY = process.env.SUMMARIZER_KEY;


// --- MAIN API PROXY FUNCTION ---
exports.aiProxy = functions
  // Use .runWith to attach secrets (v1 syntax)
  .runWith({ 
    secrets: ["PROMPT_KEY", "TRANSLATOR_KEY", "SUMMARIZER_KEY"],
  })
  .https.onRequest(async (request, response) => {
    
    // 1. CORS Configuration (CRUCIAL for Chrome Extensions)
    response.set('Access-Control-Allow-Origin', '*'); 

    // Handle preflight request (OPTIONS method)
    if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Methods', 'POST, GET');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Extension-Auth');
        response.set('Access-Control-Max-Age', '3600');
        response.status(204).send('');
        return;
    }

    if (request.method !== 'POST') {
        return response.status(405).send({ error: 'Method Not Allowed. Use POST.' });
    }

    // 2. Extract Data from the Extension
    const { action, text, targetLanguage, prompt } = request.body;
    
    if (!action || !text) {
        return response.status(400).send({ success: false, error: 'Missing action or input text.' });
    }

    try {
        let externalUrl = '';
        let headers = {};
        let body = {};
        let resultKeyPath = ''; 
        let defaultKey = '';
        
        // 3. Orchestrate the External API Call based on 'action'
        switch (action) {
            case 'summarize':
                defaultKey = SUMMARIZER_KEY;
                externalUrl = 'https://api.third-party-summarizer.com/v1/summary'; 
                headers = { 'Authorization': `Bearer ${defaultKey}` };
                body = { document: text, length: 'medium' };
                resultKeyPath = 'data.summary'; 
                break;

            case 'translate':
                defaultKey = TRANSLATOR_KEY;
                externalUrl = 'https://api.third-party-translator.com/v1/translate';
                headers = { 'Authorization': `Bearer ${defaultKey}` };
                body = { text: text, target_lang: targetLanguage || 'en' };
                resultKeyPath = 'translation.text'; 
                break;

            case 'multimodal_prompt':
                defaultKey = PROMPT_KEY;
                externalUrl = 'https://api.llm-service.com/v1/chat/completions'; 
                headers = { 'Authorization': `Bearer ${defaultKey}` };
                body = { 
                    model: "llm-model-name",
                    messages: [
                        { role: 'system', content: `Analyze this content: ${text}` },
                        { role: 'user', content: prompt }
                    ]
                };
                resultKeyPath = 'choices[0].message.content'; 
                break;
                
            default:
                return response.status(400).send({ success: false, error: 'Invalid AI action specified.' });
        }

        // 4. Make the Secure Call to the External API
        const apiResponse = await axios.post(externalUrl, body, { headers });
        
        // 5. Safely Extract the Result
        const finalResult = safeGet(apiResponse.data, resultKeyPath) || "Error: Could not parse API response.";

        // 6. Return the Cleaned Result to the Chrome Extension
        return response.status(200).send({ 
            success: true, 
            result: finalResult, 
            type: action 
        });

    } catch (error) {
        console.error(`Error processing action "${action}":`, error.message);
        
        const status = error.response ? error.response.status : 500;
        const errorMessage = error.response ? error.response.data : error.message;

        return response.status(status).send({ 
            success: false, 
            error: 'External service error or misconfiguration.',
            details: errorMessage
        });
    }
});

// Utility function to safely navigate a nested object structure (copied from previous step)
function safeGet(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split(/[\.\[\]]+/g).filter(p => p);
    
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = isNaN(parseInt(part)) ? current[part] : current[parseInt(part)];
    }
    return current;
}
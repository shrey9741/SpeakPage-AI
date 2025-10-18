// =================================================================
// FILE: content.js 
// Purpose: Extracts the clean article text for processing.
// NOTE: This function is executed via chrome.scripting.executeScript
// =================================================================

function extractArticleText() {
    // Attempt to find the main article container using common selectors
    const selectors = [
        'article', 
        '.post-content', 
        'main', 
        '#content'
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.innerText.length > 500) { // Found significant content
            let text = element.innerText;
            // Clean up text: replace new lines with spaces and normalize whitespace
            text = text.replace(/[\r\n]+/g, ' '); 
            text = text.replace(/\s{2,}/g, ' '); 
            return text.trim();
        }
    }
    // Fallback to a large chunk of the body (limited to 5000 chars for API safety)
    return document.body.innerText.substring(0, 5000).trim();
}

// NOTE: We don't call the function here. The service worker calls it via scripting API.
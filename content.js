// --- Function to be injected (Must be synchronized in both files) ---
function extractArticleText() {
    const MAX_SAFE_LENGTH = 4000; 
    let finalContent = "";

    // Get the domain from the window object (accessible in content script)
    const hostname = window.location.hostname;
    
    // ----------------------------------------------------
    // --- 1. SITE-SPECIFIC SELECTOR MAPPING ---
    // ----------------------------------------------------
    let articleSelector = '';
    
    if (hostname.includes('indianexpress.com')) {
        // Specific selector for the main article content on IE
        articleSelector = '.full-details, .story-body'; 
    } else if (hostname.includes('bbc.com')) {
        // BBC articles often use a main content wrapper
        articleSelector = '[data-component="text-block"], .ssrcss-180b0v9-Stack'; 
    } else if (hostname.includes('timesofindia.indiatimes.com')) {
        // TOI articles often use specific classes for the article body
        articleSelector = '.main-article-content'; 
    } else {
        // Default fallback for generic sites/blogs
        articleSelector = 'article, .entry-content, main';
    }

    // --- 2. Extract Headline (Always try to get the headline first) ---
    const headlineElement = document.querySelector('h1') || document.querySelector('h2');
    if (headlineElement) {
        finalContent += "HEADLINE: " + headlineElement.innerText.trim() + ". \n\n";
    }

    // 3. --- Extract Main Article Body ---
    const element = document.querySelector(articleSelector);
    
    if (element && element.innerText.length > 500) { 
        let text = element.innerText;
        
        // --- AGGRESSIVE CLEANUP FILTERS (FINAL LAYER) ---
        // These cleanup functions run regardless of the site, but after targeting.
        text = text.replace(/ADVERTISEMENT|Advertisement|Share|Subscribe|Sign In/gi, ''); 
        text = text.replace(/Home|ePaper|Menu|Next|Previous|Topics|Copyright|All Rights Reserved/gi, ''); 
        
        // Clean up formatting
        text = text.replace(/[\r\n]+/g, ' '); 
        text = text.replace(/\s{2,}/g, ' '); 
        
        finalContent += text.trim();
    }
    
    // 4. Apply final TTS safety limit
    return finalContent.trim().substring(0, MAX_SAFE_LENGTH);
}
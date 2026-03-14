// =================================================================
// FILE: content.js
// SpeakPage AI v3.0 — Word highlight tracking during TTS
// Injected into every page via manifest content_scripts
// =================================================================

let articleText = '';
let highlightOverlay = null;
let articleElement = null;

// --- Listen for messages from service worker ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'prepare_highlight') {
        articleText = request.text;
        setupHighlightOverlay();
    }

    if (request.action === 'highlight_word') {
        highlightWord(request.charIndex, request.length);
    }

    if (request.action === 'clear_highlight') {
        clearHighlight();
    }
});

// --- Create a floating highlight bar that follows reading position ---
function setupHighlightOverlay() {
    clearHighlight();

    // Find the article element on the page
    const selectors = [
        'article', '.entry-content', '.post-content',
        '.article-body', '.story-content', '.story-body',
        '.full-details', 'main', '[role="main"]'
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 200) {
            articleElement = el;
            break;
        }
    }

    // Create reading progress bar at top of page
    const bar = document.createElement('div');
    bar.id = 'speakpage-progress-bar';
    bar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        width: 0%;
        background: linear-gradient(90deg, #6c63ff, #a78bfa);
        z-index: 999999;
        transition: width 0.3s ease;
        pointer-events: none;
    `;
    document.body.appendChild(bar);
    highlightOverlay = bar;
}

// --- Highlight current word / update progress bar ---
function highlightWord(charIndex, length) {
    if (!articleText || !highlightOverlay) return;

    // Update progress bar
    const progress = Math.min((charIndex / articleText.length) * 100, 100);
    highlightOverlay.style.width = progress + '%';

    // Scroll to keep reading position in view
    if (articleElement) {
        // Find paragraph elements and scroll to the one being read
        const paragraphs = articleElement.querySelectorAll('p');
        let charCount = 0;
        for (const para of paragraphs) {
            const paraLen = para.innerText.length;
            if (charCount + paraLen >= charIndex) {
                para.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight the current paragraph subtly
                document.querySelectorAll('.speakpage-active-para').forEach(el => {
                    el.classList.remove('speakpage-active-para');
                    el.style.backgroundColor = '';
                    el.style.borderLeft = '';
                    el.style.paddingLeft = '';
                    el.style.transition = '';
                });

                para.classList.add('speakpage-active-para');
                para.style.backgroundColor = 'rgba(108, 99, 255, 0.08)';
                para.style.borderLeft = '3px solid #6c63ff';
                para.style.paddingLeft = '8px';
                para.style.transition = 'all 0.3s ease';
                break;
            }
            charCount += paraLen;
        }
    }
}

// --- Clear all highlights ---
function clearHighlight() {
    // Remove progress bar
    const bar = document.getElementById('speakpage-progress-bar');
    if (bar) bar.remove();
    highlightOverlay = null;

    // Remove paragraph highlights
    document.querySelectorAll('.speakpage-active-para').forEach(el => {
        el.classList.remove('speakpage-active-para');
        el.style.backgroundColor = '';
        el.style.borderLeft = '';
        el.style.paddingLeft = '';
        el.style.transition = '';
    });

    articleElement = null;
    articleText = '';
}

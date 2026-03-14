// =================================================================
// FILE: sidebar.js — SpeakPage AI v3.0
// FIX: No duplicate cards — one card per feature, updated in place
// =================================================================

const content    = document.getElementById('content');
const emptyState = document.getElementById('emptyState');
const clearBtn   = document.getElementById('clearBtn');

// One card per feature — tracked by feature name
const featureCards = {};

const FEATURE_CONFIG = {
  summary:   { title: 'Summary',     cls: 'summary',   icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  simplify:  { title: 'Simplified',  cls: 'simplify',  icon: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>' },
  translate: { title: 'Translation', cls: 'translate', icon: '<path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>' },
  prompt:    { title: 'AI Answer',   cls: 'prompt',    icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
};

function hideEmpty() {
  emptyState.style.display = 'none';
  clearBtn.classList.add('visible');
}

// Get or create card for a feature — ensures only ONE card per feature
function getOrCreateCard(feature, promptText) {
  // If card already exists for this feature, return it
  if (featureCards[feature] && document.getElementById(featureCards[feature])) {
    return featureCards[feature];
  }

  const cfg = FEATURE_CONFIG[feature] || { title: feature, cls: 'summary', icon: '' };
  const cardId = `card-${feature}`;

  const card = document.createElement('div');
  card.className = 'result-card';
  card.id = cardId;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-icon ${cfg.cls}">
        <svg viewBox="0 0 24 24">${cfg.icon}</svg>
      </div>
      <span class="card-title ${cfg.cls}">${cfg.title}</span>
    </div>
    <div class="card-body">
      ${promptText ? `<div class="card-prompt">"${promptText}"</div>` : ''}
      <div class="card-text loading" id="text-${cardId}">
        <span class="wave"><span></span><span></span><span></span><span></span></span>Processing...
      </div>
    </div>
  `;

  content.appendChild(card);
  featureCards[feature] = cardId;
  hideEmpty();
  return cardId;
}

function updateCard(cardId, status, text) {
  const textEl = document.getElementById(`text-${cardId}`);
  if (!textEl) return;

  if (status === 'loading') {
    textEl.className = 'card-text loading';
    textEl.innerHTML = `<span class="wave"><span></span><span></span><span></span><span></span></span>${text}`;
  } else {
    textEl.className = 'card-text' + (status === 'error' ? ' error' : '');
    textEl.textContent = text;
    document.getElementById(cardId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function handleEvent(data) {
  if (!data || data.action !== 'sidebar_update') return;

  const { feature, status, text, prompt: promptText } = data;
  if (!feature) return;

  const cardId = getOrCreateCard(feature, promptText);
  updateCard(cardId, status, text);
}

// Direct message listener
chrome.runtime.onMessage.addListener((request) => {
  if (request && (request.target === 'sidebar' || request.action === 'sidebar_update')) {
    handleEvent(request);
  }
});

// Storage listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.speakpage_sidebar) {
    const val = changes.speakpage_sidebar.newValue;
    if (val) handleEvent(val);
  }
});

// On sidebar open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('speakpage_sidebar', (data) => {
    if (data.speakpage_sidebar) handleEvent(data.speakpage_sidebar);
  });
});

// Clear all
clearBtn.addEventListener('click', () => {
  // Remove all result cards
  Object.values(featureCards).forEach(id => {
    document.getElementById(id)?.remove();
  });
  Object.keys(featureCards).forEach(k => delete featureCards[k]);

  emptyState.style.display = 'flex';
  clearBtn.classList.remove('visible');
  chrome.storage.local.remove(['speakpage_sidebar', 'simplified_text']);
});

// =================================================================
// FILE: popup.js — SpeakPage AI v3.0
// =================================================================

const summarizeBtn      = document.getElementById('summarizeBtn');
const simplifyBtn       = document.getElementById('simplifyBtn');
const translateBtn      = document.getElementById('translateBtn');
const promptToggleBtn   = document.getElementById('promptToggleBtn');
const promptSection     = document.getElementById('promptSection');
const langSection       = document.getElementById('langSection');
const langSelect        = document.getElementById('langSelect');
const selectedLangLabel = document.getElementById('selectedLangLabel');
const promptInput       = document.getElementById('promptInput');
const promptBtn         = document.getElementById('promptBtn');
const readBtn           = document.getElementById('readBtn');
const pauseResumeBtn    = document.getElementById('pauseResumeBtn');
const stopBtn           = document.getElementById('stopBtn');
const speedSelect       = document.getElementById('speedSelect');
const statusText        = document.getElementById('statusText');
const statusIcon        = document.getElementById('statusIcon');
const readSimplifiedBtn = document.getElementById('readSimplifiedBtn');

let simplifiedText = null;
let isPromptVisible = false;
let isLangVisible = false;

function setStatus(msg, type = 'idle') {
  statusText.innerHTML = msg;
  statusIcon.className = 'status-icon' + (type !== 'idle' ? ' ' + type : '');
}

function setLoading(msg) {
  setStatus(`<span class="wave"><span></span><span></span><span></span><span></span></span>${msg}`, 'active');
}

function lockAI(locked) {
  [summarizeBtn, simplifyBtn, translateBtn, promptBtn].forEach(b => b.disabled = locked);
}

function resetTTS(msg = 'Ready.') {
  readBtn.disabled = false;
  pauseResumeBtn.disabled = true;
  stopBtn.disabled = true;
  pauseResumeBtn.textContent = 'Pause';
  setStatus(msg, 'done');
}

function openSidebar() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) { resolve(); return; }
      chrome.sidePanel.open({ tabId: tabs[0].id }, () => {
        if (chrome.runtime.lastError) console.log('Sidebar:', chrome.runtime.lastError.message);
        resolve();
      });
    });
  });
}

function sendMsg(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    chrome.runtime.sendMessage({ ...message, tabId: tabs[0].id }, () => {
      if (chrome.runtime.lastError) console.log('SW msg (ok):', chrome.runtime.lastError.message);
    });
  });
}

// =================================================================
// Central event handler
// =================================================================
function handleSWEvent(request) {
  // ✅ FIX: null check — storage listener can fire with undefined
  if (!request || !request.action) return;

  switch (request.action) {
    case "reading_started":
      setStatus('<span class="wave"><span></span><span></span><span></span><span></span></span>Reading aloud...', 'active');
      readBtn.disabled = true;
      pauseResumeBtn.disabled = false;
      stopBtn.disabled = false;
      break;
    case "reading_finished":
      resetTTS('✅ Reading completed.');
      break;
    case "reading_failed":
      resetTTS(`❌ ${request.message}`);
      lockAI(false);
      break;
    case "task_done":
      lockAI(false);
      setStatus('✅ Done — check the sidebar.', 'done');
      summarizeBtn.textContent = 'Summarize';
      simplifyBtn.textContent = 'Simplify';
      translateBtn.textContent = 'Translate';
      break;
    case "simplify_ready":
      simplifiedText = request.text;
      readSimplifiedBtn.classList.add('visible');
      lockAI(false);
      setStatus('✅ Simplified — check the sidebar.', 'done');
      simplifyBtn.textContent = 'Simplify';
      break;
    default:
      break;
  }
}

// Direct message listener
chrome.runtime.onMessage.addListener((request) => {
  handleSWEvent(request);
});

// Storage listener
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.speakpage_event) {
    // ✅ FIX: check newValue exists before handling
    const val = changes.speakpage_event.newValue;
    if (val) {
      handleSWEvent(val);
      chrome.storage.local.remove('speakpage_event');
    }
  }
});

// On popup open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['speakpage_event', 'simplified_text'], (data) => {
    if (data.speakpage_event) {
      handleSWEvent(data.speakpage_event);
      chrome.storage.local.remove('speakpage_event');
    }
    if (data.simplified_text) {
      simplifiedText = data.simplified_text;
      readSimplifiedBtn.classList.add('visible');
    }
  });
});

// =================================================================
// BUTTON HANDLERS
// =================================================================

summarizeBtn.addEventListener('click', async () => {
  setLoading('Summarizing...');
  lockAI(true);
  await openSidebar();
  sendMsg({ action: "get_summary" });
});

simplifyBtn.addEventListener('click', async () => {
  setLoading('Simplifying language...');
  lockAI(true);
  readSimplifiedBtn.classList.remove('visible');
  simplifiedText = null;
  chrome.storage.local.remove('simplified_text');
  await openSidebar();
  sendMsg({ action: "simplify_page" });
});

translateBtn.addEventListener('click', async () => {
  if (!isLangVisible) {
    langSection.style.display = 'block';
    isLangVisible = true;
    promptSection.style.display = 'none';
    isPromptVisible = false;
    translateBtn.querySelector('.label').textContent = 'Go →';
  } else {
    const lang = langSelect.value;
    const langName = langSelect.options[langSelect.selectedIndex].text;
    setLoading(`Translating to ${langName}...`);
    lockAI(true);
    langSection.style.display = 'none';
    isLangVisible = false;
    translateBtn.querySelector('.label').textContent = 'Translate';
    await openSidebar();
    sendMsg({ action: "translate_page", targetLang: lang });
  }
});

langSelect.addEventListener('change', () => {
  selectedLangLabel.textContent = langSelect.options[langSelect.selectedIndex].text;
});

promptToggleBtn.addEventListener('click', () => {
  isPromptVisible = !isPromptVisible;
  promptSection.style.display = isPromptVisible ? 'block' : 'none';
  if (isLangVisible) { langSection.style.display = 'none'; isLangVisible = false; }
  if (isPromptVisible) promptInput.focus();
});

promptBtn.addEventListener('click', async () => {
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) { setStatus('Please enter a question first.', 'error'); return; }
  setLoading('Thinking...');
  lockAI(true);
  promptSection.style.display = 'none';
  isPromptVisible = false;
  await openSidebar();
  sendMsg({ action: "multimodal_prompt", prompt: userPrompt });
});

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); promptBtn.click(); }
});

readBtn.addEventListener('click', () => {
  const rate = parseFloat(speedSelect.value);
  setLoading(`Preparing to read at ${rate}x...`);
  readBtn.disabled = true;
  sendMsg({ action: "start_reading", rate });
});

readSimplifiedBtn.addEventListener('click', () => {
  if (!simplifiedText) return;
  const rate = parseFloat(speedSelect.value);
  setLoading(`Reading simplified at ${rate}x...`);
  readBtn.disabled = true;
  pauseResumeBtn.disabled = false;
  stopBtn.disabled = false;
  sendMsg({ action: "start_reading", rate, simplified: true, simplifiedText });
});

pauseResumeBtn.addEventListener('click', () => {
  const isPaused = pauseResumeBtn.textContent.trim() === 'Pause';
  pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
  setStatus(isPaused ? '⏸ Paused.' : '▶️ Resumed.', 'active');
  sendMsg({ action: isPaused ? 'pause_reading' : 'resume_reading' });
});

stopBtn.addEventListener('click', () => {
  resetTTS('⏹️ Reading stopped.');
  sendMsg({ action: "stop_reading" });
});

// =================================================================
// FILE: popup.js (Final – Synced with TTS + Smart Controls)
// =================================================================

// --- DOM Elements ---
const summarizeBtn = document.getElementById('summarizeBtn');
const readBtn = document.getElementById('readBtn');
const pauseResumeBtn = document.getElementById('pauseResumeBtn');
const stopBtn = document.getElementById('stopBtn');
const promptBtn = document.getElementById('promptBtn');
const outputDiv = document.getElementById('output');
const promptInput = document.getElementById('promptInput');
const speedSelect = document.getElementById('speedSelect');

// --- Utility: Safe Chrome Message Sender ---
function sendMessageWithCallback(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    chrome.runtime.sendMessage({ ...message, tabId: tabs[0].id }, () => {
      if (chrome.runtime.lastError) {
        console.log("Ignoring popup closure error:", chrome.runtime.lastError.message);
      }
      if (callback) callback();
    });
  });
}

// --- Helper: Reset UI after reading/stop ---
function resetReadControls(message = 'Ready.') {
  readBtn.disabled = false;
  pauseResumeBtn.disabled = true;
  stopBtn.disabled = true;
  pauseResumeBtn.textContent = 'Pause';
  outputDiv.textContent = message;
}

// --- Helper: Lock UI during tasks ---
function lockUI(isLocked) {
  summarizeBtn.disabled = isLocked;
  promptBtn.disabled = isLocked;
  readBtn.disabled = isLocked;
}

// =================================================================
// 🔔 Message Listener — Responds to Service Worker
// =================================================================
chrome.runtime.onMessage.addListener((request) => {
  switch (request.action) {
    case "summary_result":
      outputDiv.textContent = `🧠 SUMMARY:\n${request.summary}`;
      lockUI(false);
      summarizeBtn.textContent = 'Summarize Page';
      break;

    case "prompt_result":
      outputDiv.textContent = `💬 AI RESPONSE:\n${request.answer}`;
      lockUI(false);
      promptBtn.textContent = 'Get Answer';
      break;

    case "reading_started":
      outputDiv.textContent = '🔊 Reading aloud...';
      readBtn.disabled = true;
      pauseResumeBtn.disabled = false;
      stopBtn.disabled = false;
      break;

    case "reading_finished":
      resetReadControls('✅ Reading completed.');
      break;

    case "reading_failed":
      resetReadControls(`❌ ${request.message}`);
      break;

    default:
      break;
  }
});

// =================================================================
// 🎛 BUTTON HANDLERS
// =================================================================

// 1️⃣ Summarize Button
summarizeBtn.addEventListener('click', () => {
  outputDiv.textContent = '🧠 Summarizing page...';
  summarizeBtn.textContent = 'Working...';
  lockUI(true);

  sendMessageWithCallback({ action: "get_summary" });
});

// 2️⃣ Read Aloud Button
readBtn.addEventListener('click', () => {
  const rate = parseFloat(speedSelect.value);

  outputDiv.textContent = `🔊 Reading aloud at ${rate}x speed...`;
  readBtn.disabled = true;
  pauseResumeBtn.disabled = false;
  stopBtn.disabled = false;
  pauseResumeBtn.textContent = 'Pause';

  sendMessageWithCallback({ action: "start_reading", rate });
});

// 3️⃣ Pause / Resume Button
pauseResumeBtn.addEventListener('click', () => {
  const isPaused = pauseResumeBtn.textContent === 'Pause';
  pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
  outputDiv.textContent = isPaused ? '⏸ Paused.' : '▶️ Resumed.';

  sendMessageWithCallback({ action: isPaused ? 'pause_reading' : 'resume_reading' });
});

// 4️⃣ Stop Button
stopBtn.addEventListener('click', () => {
  resetReadControls('⏹️ Reading stopped.');
  sendMessageWithCallback({ action: "stop_reading" });
});

// 5️⃣ Multimodal Prompt Button
promptBtn.addEventListener('click', () => {
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) {
    outputDiv.textContent = "Please enter a question for the AI.";
    return;
  }

  outputDiv.textContent = '💭 Thinking...';
  promptBtn.textContent = 'Working...';
  lockUI(true);

  sendMessageWithCallback({
    action: "multimodal_prompt",
    prompt: userPrompt
  });
});

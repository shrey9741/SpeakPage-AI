# SpeakPage AI

A Chrome Extension that uses AI to read, summarize, translate, and simplify any webpage — with full text-to-speech and a persistent sidebar for results.

## Features

- **Read Aloud** - Reads the article aloud using Chrome TTS, skipping all ads and clutter
- **Summarize** - Generate concise key-point summaries of any article
- **Translate** - Translate page content into 11 languages including Hindi, Bengali, Tamil, and more
- **Simplify** - Rewrite the article in plain, easy-to-understand language
- **Ask AI** - Ask any question about the article and get a direct answer
- **Read Simplified** - Listen to the simplified version aloud after simplifying
- **Ad-free extraction** - Two-layer DOM surgery + regex cleanup removes ads before reading or processing
- **Reading progress bar** - Tracks reading position and highlights the current paragraph on the page
- **Sidebar panel** - All AI results appear in a persistent sidebar as stacked cards

## Tech Stack

- **Vanilla JS** - Lightweight, no build step required
- **Chrome Manifest V3** - Latest extension format
- **Chrome Built-in AI APIs** - Gemini Nano integration (Prompt API + Rewriter API)
- **Groq API** - `llama-3.1-8b-instant` fallback via Vercel serverless proxy
- **Chrome TTS** - Built-in text-to-speech with rate control
- **Chrome SidePanel API** - Persistent results panel

## Project Structure

```
SpeakPage-AI/
├── manifest.json          # MV3 manifest — permissions, sidebar, content scripts
├── service_worker.js      # Background SW — AI calls, TTS, message routing
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic — button handlers, sidebar open
├── sidebar.html           # Results sidebar panel
├── sidebar.js             # Sidebar logic — renders AI result cards
├── content.js             # Injected into pages — TTS highlight + progress bar
├── api/
│   └── ai-proxy.js        # Vercel serverless proxy — calls Groq API securely
├── icon16.png
├── icon32.png
├── icon48.png
└── icon128.png
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Chrome (version 114+)
- [Vercel CLI](https://vercel.com/docs/cli) — `npm i -g vercel`
- [Groq API key](https://console.groq.com) (free)

### Installation

1. Clone the repository:

```
git clone https://github.com/shrey9741/SpeakPage-AI.git
cd SpeakPage-AI
```

2. Deploy the backend proxy:

```
vercel login
vercel env add GROQ_API_KEY
vercel --prod
```

3. Update the proxy URL in `service_worker.js` line 8:

```
const PROXY_URL = 'https://your-deployment.vercel.app/api/ai-proxy';
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `SpeakPage-AI/` folder

## Usage

1. **Open any article** — navigate to any news or blog page
2. **Click the extension icon** — the SpeakPage AI popup opens
3. **Choose an action:**
   - 🧠 Summarize
   - ✨ Simplify
   - 🌐 Translate
   - 💬 Ask AI
   - 🔊 Read Aloud
4. **View results** — the sidebar opens automatically with AI results

## Chrome Built-in AI Setup

Chrome's built-in AI features are currently experimental. To enable them:

1. Navigate to `chrome://flags/#optimization-guide-on-device-model` → Enable **BypassPerfRequirement**
2. Navigate to `chrome://flags/#prompt-api-for-gemini-nano` → Enable
3. Navigate to `chrome://flags/#rewriter-api-for-gemini-nano` → Enable
4. Restart Chrome
5. Visit `chrome://components/`
6. Find "Optimization Guide On Device Model" and click "Check for update"

## API Overview

### Prompt API

```js
const session = await ai.languageModel.create({ systemPrompt: '...' });
const result = await session.prompt(`Article:\n${text}\n\nQuestion: ${userPrompt}`);
session.destroy();
```

### Rewriter API

```js
const rewriter = await ai.rewriter.create({
  tone: 'as-is',
  format: 'plain-text',
  sharedContext: 'Simplify for a 10-year-old'
});
const result = await rewriter.rewrite(text);
rewriter.destroy();
```

### Groq Fallback (via Vercel Proxy)

```js
const response = await fetch(PROXY_URL, {
  method: 'POST',
  body: JSON.stringify({ action: 'summarize', text })
});
const { result } = await response.json();
```

## Chrome Built-in AI Integration

SpeakPage AI is integrated with Chrome's Built-in AI (Gemini Nano) APIs with intelligent fallbacks.

### Real AI Processing

- ✅ **Prompt API** — Ask AI, summarize fallback, translate fallback
- ✅ **Rewriter API** — Simplify language
- ✅ **Smart Fallbacks** — Groq API when Gemini Nano is unavailable

### Intelligent Fallbacks

Each module checks AI availability and provides:

- Real Gemini Nano results when available
- Automatic fallback to Groq API (`llama-3.1-8b-instant`) when unavailable
- Helpful error messages with setup instructions
- No broken experience — works on all hardware

## Supported Languages (Translation)

| Language | Code |
|---|---|
| Hindi | `hi` |
| Bengali | `bn` |
| Telugu | `te` |
| Tamil | `ta` |
| Marathi | `mr` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Chinese (Simplified) | `zh` |
| Arabic | `ar` |
| Japanese | `ja` |

## Architecture

```
User Click → popup.js → openSidebar() [user gesture]
                  ↓
           service_worker.js
                  ↓
        extractArticleText()
        (injected into tab)
                  ↓
         Two-layer ad removal
                  ↓
      ┌───────────┴───────────┐
      ↓                       ↓
Chrome Built-in AI         Groq API
(Gemini Nano)           (Vercel Proxy)
      ↓                       ↓
      └───────────┬───────────┘
                  ↓
            sidebar.js
          (result cards)
                  ↓
            content.js
      (highlight + progress bar)
```

## Performance

With Groq API:

- **Summarize**: 500–1500ms
- **Translate**: 600–2000ms
- **Simplify**: 800–2500ms
- **Ask AI**: 500–1500ms
- **Read Aloud**: Instant (on-device TTS)

## Requirements

- Chrome version 114+
- For Gemini Nano: Chrome 127+, ~4GB free RAM, ~5GB disk space, flags enabled
- For Groq fallback: Internet connection + Vercel deployment

## Testing

The extension works in two modes:

### 1. With Gemini Nano (Recommended)

- On-device processing
- Private — no data leaves the browser
- Works offline

### 2. With Groq API (Fallback)

- Cloud-based via secure Vercel proxy
- Works on any hardware
- API key never exposed to the extension

## 🏆 Built For

**Google Chrome Built-in AI Challenge 2025**

SpeakPage AI was designed around Chrome's Built-in AI APIs (Gemini Nano) for on-device, private, offline AI. It uses Groq API as a high-performance fallback for devices where Gemini Nano is unavailable, ensuring the extension works for all users regardless of hardware.

## Privacy & Security

- No data stored — article text is processed in real time and never persisted
- API key secured — Groq key lives only in Vercel environment variables, never in extension code
- All processing scoped to the active tab only
- No tracking, no analytics
- Gemini Nano mode: fully on-device, zero network requests

## Notes

- Chrome's Built-in AI APIs are experimental and subject to change
- The extension works without Gemini Nano via Groq fallback
- Requires Chrome 127+ for full Gemini Nano functionality
- Model download required on first Gemini Nano use (~2GB, one-time)
- All Gemini Nano processing happens on-device (privacy-friendly)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits

Built with Chrome's Built-in AI (Gemini Nano) • Groq API • Vercel • Chrome MV3

## About

SpeakPage AI is a Chrome Extension that reads, summarizes, translates, and simplifies any webpage using AI — with text-to-speech, paragraph highlighting, and a persistent sidebar panel. Built for the Google Chrome Built-in AI Challenge 2025 using Gemini Nano APIs with Groq fallback for maximum compatibility.

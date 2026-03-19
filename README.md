# SpeakPage AI 🔊

A Chrome Extension that uses AI to read, summarize, translate, and simplify any webpage — with full text-to-speech and a persistent sidebar for results.

---

## Features

- **Read Aloud** — Reads the article aloud using Chrome TTS, skipping all ads and clutter
- **Summarize** — Generate concise key-point summaries of any article
- **Translate** — Translate page content into 11 languages including Hindi, Bengali, Tamil, and more
- **Simplify** — Rewrite the article in plain, easy-to-understand language
- **Ask AI** — Ask any question about the article and get a direct answer
- **Read Simplified** — Listen to the simplified version aloud after simplifying
- **Ad-free extraction** — Two-layer DOM surgery + regex cleanup removes ads before reading or processing
- **Sidebar panel** — All AI results appear in a persistent sidebar as stacked cards
- **TTS state persistence** — Pause/Stop buttons stay active even when popup is closed and reopened

---

## Tech Stack

| Component | Technology |
|---|---|
| Extension format | Chrome Manifest V3 |
| Frontend | Vanilla JS — no build step |
| On-device AI | Chrome Built-in AI (Gemini Nano) |
| Cloud AI fallback | Groq API — `llama-3.1-8b-instant` |
| Proxy | Vercel Serverless Function |
| Text-to-speech | Chrome TTS API |
| Results panel | Chrome SidePanel API |

---

## Project Structure

```
SpeakPage-AI/
├── manifest.json          # MV3 manifest — permissions, sidebar, content scripts
├── service_worker.js      # Background SW — AI calls, TTS, message routing
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic — button handlers, TTS state, sidebar open
├── sidebar.html           # Results sidebar panel
├── sidebar.js             # Sidebar logic — renders AI result cards
├── content.js             # Injected into pages — TTS highlight
├── api/
│   └── ai-proxy.js        # Vercel serverless proxy — calls Groq API securely
├── package.json           # Minimal — no dependencies (uses native fetch)
├── icon16.png
├── icon32.png
├── icon48.png
└── icon128.png
```

---

## Getting Started

### Prerequisites

- Google Chrome (version 114+)
- [Groq API key](https://console.groq.com) (free)
- [Vercel account](https://vercel.com) (free)

### 1. Clone the repository

```bash
git clone https://github.com/shrey9741/SpeakPage-AI.git
cd SpeakPage-AI
```

### 2. Deploy the backend proxy

```bash
npm i -g vercel
vercel login
vercel --prod
```

When prompted, add your Groq API key as an environment variable named `GROQ_API_KEY` in the Vercel dashboard under **Settings → Environment Variables**.

### 3. Update the proxy URL

In `service_worker.js` line 6, replace the URL with your deployment:

```js
const PROXY_URL = 'https://your-project.vercel.app/api/ai-proxy';
```

### 4. Load in Chrome

1. Open Chrome → navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `SpeakPage-AI/` folder

---

## Usage

1. **Open any article** — navigate to any news or blog page
2. **Click the extension icon** — the SpeakPage AI popup opens
3. **Choose an action:**
   - 🧠 **Summarize** — key points in a bulleted list
   - ✨ **Simplify** — easy language rewrite
   - 🌐 **Translate** — click Translate → select language → click **Go →**
   - 💬 **Ask AI** — type a question → press Enter or click Get Answer
   - 🔊 **Read Aloud** — reads the full article with Pause/Stop controls
4. **View results** — the sidebar opens automatically with AI result cards

---

## Chrome Built-in AI Setup (Optional)

Chrome's built-in Gemini Nano features are experimental. To enable them:

1. Go to `chrome://flags/#optimization-guide-on-device-model` → **BypassPerfRequirement**
2. Go to `chrome://flags/#prompt-api-for-gemini-nano` → **Enable**
3. Go to `chrome://flags/#rewriter-api-for-gemini-nano` → **Enable**
4. Restart Chrome
5. Visit `chrome://components/` → find **Optimization Guide On Device Model** → **Check for update**

> The extension works fully without Gemini Nano via the Groq API fallback.

---

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
```

---

## API Overview

### Groq via Vercel Proxy

```js
const response = await fetch(PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'summarize', text })
});
const { result } = await response.json();
```

### Chrome Prompt API (Gemini Nano)

```js
const session = await ai.languageModel.create({ systemPrompt: '...' });
const result = await session.prompt(`Article:\n${text}\n\nQuestion: ${userPrompt}`);
session.destroy();
```

### Chrome Rewriter API (Gemini Nano)

```js
const rewriter = await ai.rewriter.create({
  tone: 'as-is',
  format: 'plain-text',
  sharedContext: 'Simplify for a 10-year-old'
});
const result = await rewriter.rewrite(text);
rewriter.destroy();
```

---

## Supported Languages

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

---

## Performance (Groq API)

| Feature | Response Time |
|---|---|
| Summarize | 500–1500ms |
| Translate | 600–2000ms |
| Simplify | 800–2500ms |
| Ask AI | 500–1500ms |
| Read Aloud | Instant (on-device) |

---

## Privacy & Security

- **No data stored** — article text is processed in real time, never persisted
- **API key secured** — Groq key lives only in Vercel environment variables, never in extension code
- **Scoped to active tab** — no background data collection
- **No tracking, no analytics**
- **Gemini Nano mode** — fully on-device, zero network requests

---

## Requirements

- Chrome 114+ for core features
- Chrome 127+ for Gemini Nano (on-device AI)
- ~4GB free RAM + ~5GB disk space for Gemini Nano model download
- Internet connection for Groq API fallback

---

## Changelog

### v3.0 — Current
- **Fixed:** Proxy URL updated to correct Vercel domain — resolves 404 errors in extension
- **Fixed:** Vercel GitHub integration connected — pushes now auto-deploy correctly
- **Fixed:** Replaced `axios` with native `fetch` in proxy — eliminates `Cannot find module` crash
- **Fixed:** Translate now has a dedicated **Go →** button — no longer requires double-clicking
- **Fixed:** Pause/Stop buttons now persist state across popup close/reopen via `chrome.storage.local`
- **Fixed:** Sidebar result cards no longer overlap — fixed `overflow: visible` and `flex-shrink: 0`
- **Improved:** Groq API key recreated and relinked in Vercel environment variables

### v2.0
- Added Groq API fallback via Vercel serverless proxy
- Sidebar panel with stacked result cards
- Multi-language translation support

### v1.0
- Initial release for Google Chrome Built-in AI Challenge 2025
- Gemini Nano integration with Prompt API + Rewriter API
- Read Aloud with Chrome TTS

---

## Built For

**Google Chrome Built-in AI Challenge 2025**

SpeakPage AI was designed around Chrome's Built-in AI APIs (Gemini Nano) for on-device, private, offline AI processing. It uses Groq API as a high-performance fallback for devices where Gemini Nano is unavailable — ensuring the extension works for all users regardless of hardware.

---

## License

MIT

---

## Author

**Shrey Kumar**
- GitHub: [shrey9741](https://github.com/shrey9741)
- LinkedIn: [shrey-kumar](https://linkedin.com/in/shrey-kumar)

---

*Built with Chrome Built-in AI (Gemini Nano) • Groq API • Vercel • Chrome MV3*

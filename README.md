# SpeakPage AI — Multimodal Web Reader

> A Chrome Extension that reads, summarizes, translates, and simplifies any webpage using AI — built for the **Google Chrome Built-in AI Challenge 2025**.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🔊 **Read Aloud** | Reads the article content aloud using Chrome TTS, skipping all ads and clutter |
| 🧠 **Summarize** | Extracts key points from any article instantly |
| 🌐 **Translate** | Translates page content into 11 languages including Hindi, Bengali, Tamil, and more |
| ✨ **Simplify** | Rewrites the article in plain, easy-to-understand language |
| 💬 **Ask AI** | Ask any question about the article and get a concise answer |
| 📖 **Read Simplified** | Listen to the simplified version aloud after simplifying |
| 🎯 **Ad-free extraction** | Two-layer DOM surgery + regex cleanup removes ads before reading or processing |
| 📊 **Reading progress bar** | Purple progress bar tracks reading position on the page |
| 🗂️ **Sidebar panel** | All AI results appear in a persistent sidebar, stacked as cards |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
│                                                         │
│   popup.html/js  ──►  service_worker.js                 │
│        │                    │                           │
│        │              extractArticleText()              │
│        │              (injected into tab)               │
│        │                    │                           │
│        ▼                    ▼                           │
│   sidebar.html/js    Groq API (Vercel Proxy)            │
│   (results panel)    llama-3.1-8b-instant               │
│                             │                           │
│   content.js  ◄─────────────┘                          │
│   (TTS highlight + progress bar)                        │
└─────────────────────────────────────────────────────────┘
```

**Communication flow:**
1. User clicks button in `popup.js` → opens sidebar (user gesture)
2. `popup.js` sends message to `service_worker.js` with `tabId`
3. Service worker injects `extractArticleText()` into the active tab
4. Cleaned article text is sent to Groq API via Vercel serverless proxy
5. Result is written to `chrome.storage.local` → picked up by `sidebar.js`
6. For TTS: `content.js` receives word positions and highlights paragraphs

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3 |
| AI Backend | Groq API (`llama-3.1-8b-instant`) |
| Proxy | Vercel Serverless Functions (Node.js) |
| TTS | Chrome built-in `chrome.tts` API |
| Sidebar | Chrome `sidePanel` API |
| Styling | Custom dark theme (DM Sans + Space Mono) |

---

## 📁 Project Structure

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

---

## 🚀 Getting Started

### Prerequisites
- Google Chrome (version 114+)
- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli) — `npm i -g vercel`
- [Groq API key](https://console.groq.com) (free)

### 1. Clone the repository

```bash
git clone https://github.com/shrey9741/SpeakPage-AI.git
cd SpeakPage-AI
```

### 2. Deploy the backend proxy to Vercel

```bash
vercel login
vercel env add GROQ_API_KEY   # paste your Groq API key
vercel --prod
```

Copy the production URL (e.g. `https://speak-page-xyz.vercel.app`).

### 3. Update the proxy URL

In `service_worker.js`, line 8:

```js
const PROXY_URL = 'https://your-deployment.vercel.app/api/ai-proxy';
```

### 4. Load the extension in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `SpeakPage-AI/` folder

### 5. Test it

Open any news article → click the SpeakPage AI icon → try each feature.

---

## 🌍 Supported Languages (Translation)

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

## 🗞️ Supported News Sites (Optimised Selectors)

Site-specific CSS selectors ensure clean article extraction with no nav or ad contamination:

- Indian Express
- NDTV
- BBC
- The Hindu
- Hindustan Times
- Times of India
- Reuters
- The Guardian
- Any generic blog/article page (fallback)

---

## 🔒 Privacy & Security

- **No data stored** — article text is processed in real time and never persisted on the server
- **API key secured** — Groq key lives only in Vercel environment variables, never in extension code
- **All processing scoped to active tab** — extension only reads the page you're currently on
- **No tracking, no analytics**

---

## 🧩 Chrome APIs Used

| API | Purpose |
|---|---|
| `chrome.tts` | Text-to-speech with rate control |
| `chrome.sidePanel` | Persistent results panel |
| `chrome.scripting` | Inject article extraction function into tab |
| `chrome.storage.local` | Reliable popup ↔ service worker communication |
| `chrome.tabs` | Get active tab ID |
| `chrome.notifications` | Error notifications |

---

## 🏆 Built For

**Google Chrome Built-in AI Challenge 2025**

SpeakPage AI was designed around Chrome's Built-in AI APIs (Gemini Nano) for on-device, private, offline AI. It uses Groq API as a high-performance fallback for devices where Gemini Nano is unavailable, ensuring the extension works for all users regardless of hardware.

---

## 📸 Screenshots

> Open any news article → click the extension icon

**Popup**

The compact dark popup gives access to all 5 AI actions plus TTS controls.

**Sidebar**

AI results appear as stacked cards in the sidebar panel — summary, translation, simplification, and Q&A all visible at once.

**Reading highlight**

A purple progress bar tracks reading position at the top of the page. The current paragraph is highlighted and auto-scrolled into view.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT

---

## 👤 Author

**Shrey** — 3rd year BTech IT student  
GitHub: [@shrey9741](https://github.com/shrey9741)

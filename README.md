# Goal2Task — AI Goal Coaching App

Turn your ambitions into action. Goal2Task walks you through a structured coaching process powered by a local AI (or cloud provider), then generates a personalized, milestone-based action plan.

## Features

- **6-step coaching flow**: Focus area → Current state → Desired state → Constraints → AI coaching dialogue → Action plan
- **Interactive AI coaching**: 2 rounds of back-and-forth with an AI coach that asks sharp clarifying questions
- **Hyper-specific output**: Tasks with exact time commitments, days, and highest-leverage callouts
- **Obstacle anticipation**: Proactive mitigations for what might go wrong
- **Multi-provider support**: LM Studio, Ollama, Groq, or Anthropic

## Quick Start with LM Studio (Free, Local)

### 1. Set up LM Studio

1. Download [LM Studio](https://lmstudio.ai/) if you haven't already
2. Download a model — recommended:
   - **Llama 3.1 8B Instruct** (good balance of speed + quality)
   - **Mistral 7B Instruct** (fast, decent quality)
   - **Llama 3.3 70B** (best quality, needs 48GB+ RAM)
3. Load the model in LM Studio
4. Go to the **Local Server** tab (left sidebar, looks like `<->`)
5. Click **Start Server** — it will run on `http://localhost:1234`

### 2. Run Goal2Task

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app opens at `http://localhost:3000`.

### 3. Connect

Click the ⚙️ gear icon in the app header. LM Studio is the default provider. Click **Test Connection** to verify.

## Alternative Providers

### Ollama (Free, Local)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.1

# Ollama serves on port 11434 by default
```

In the app settings, select "Ollama" as the provider.

### Groq (Free Cloud Tier)

1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. In app settings, select "Groq", paste your API key
4. Uses Llama 3.3 70B by default — best free option for quality

### Anthropic (Paid Cloud)

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. In app settings, select "Anthropic", paste your API key

## Project Structure

```
goal2task/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
├── src/
│   ├── main.jsx        # React mount
│   ├── ai.js           # AI provider abstraction (swap providers here)
│   └── App.jsx         # Full app with settings panel
└── README.md
```

## Model Recommendations

| Model | RAM Needed | Quality | Speed | Best For |
|-------|-----------|---------|-------|----------|
| Llama 3.1 8B | 8GB | Good | Fast | Quick iterations |
| Mistral 7B | 8GB | Good | Fast | Lightweight setup |
| Llama 3.1 70B | 48GB+ | Excellent | Slow | Best local quality |
| Groq Llama 3.3 70B | Cloud | Excellent | Fast | Best free option |

## Tips for Best Results

- **Be specific in your inputs** — "I want to make more money" gives generic tasks. "I want to go from $5K to $10K/month in HRIS consulting" gives actionable ones.
- **Answer coaching questions honestly** — the AI coach calibrates your plan based on your answers.
- **Larger models = better plans** — if you have the RAM, 70B models produce noticeably better coaching and task specificity.

## Deploying for Others

To deploy this for other users, you'll need a thin backend to keep API keys secret:

```bash
# Build for production
npm run build

# Output is in /dist — deploy to Vercel, Netlify, etc.
```

For a public deployment, add a serverless function (Vercel Functions, Cloudflare Workers) that proxies AI calls so your API key isn't exposed in client-side code.

## License

MIT

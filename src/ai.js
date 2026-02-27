/**
 * AI Provider Abstraction for Goal2Task
 * 
 * Supports:
 *  - LM Studio  (local, http://localhost:1234)  ← DEFAULT
 *  - Ollama     (local, http://localhost:11434)
 *  - Groq       (cloud, free tier, needs API key)
 *  - Anthropic  (cloud, paid, needs API key)
 * 
 * LM Studio & Ollama use OpenAI-compatible endpoints.
 * No API key needed for local providers.
 */

const PROVIDERS = {
  lmstudio: {
    name: "LM Studio",
    baseUrl: "http://localhost:1234/v1/chat/completions",
    needsKey: false,
    defaultModel: "loaded-model",  // LM Studio uses whatever model is loaded
    format: "openai",
  },
  ollama: {
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1/chat/completions",
    needsKey: false,
    defaultModel: "llama3.1",
    format: "openai",
  },
  groq: {
    name: "Groq (Cloud)",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    needsKey: true,
    defaultModel: "llama-3.3-70b-versatile",
    format: "openai",
  },
  anthropic: {
    name: "Anthropic (Cloud)",
    baseUrl: "https://api.anthropic.com/v1/messages",
    needsKey: true,
    defaultModel: "claude-sonnet-4-20250514",
    format: "anthropic",
  },
};

/**
 * Call the AI with a system prompt and user message.
 * Config shape: { provider: string, apiKey?: string, model?: string, baseUrl?: string }
 */
export async function callAI(systemPrompt, userMessage, config = {}) {
  const providerKey = config.provider || "lmstudio";
  const provider = PROVIDERS[providerKey];
  
  if (!provider) throw new Error(`Unknown provider: ${providerKey}`);

  const model = config.model || provider.defaultModel;
  const baseUrl = config.baseUrl || provider.baseUrl;

  if (provider.format === "anthropic") {
    return callAnthropic(baseUrl, config.apiKey, model, systemPrompt, userMessage);
  } else {
    return callOpenAICompat(baseUrl, config.apiKey, model, systemPrompt, userMessage);
  }
}

/** OpenAI-compatible call (LM Studio, Ollama, Groq) */
async function callOpenAICompat(baseUrl, apiKey, model, systemPrompt, userMessage) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/** Anthropic-format call */
async function callAnthropic(baseUrl, apiKey, model, systemPrompt, userMessage) {
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey || "",
    "anthropic-version": "2023-06-01",
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.content?.map((c) => c.text || "").join("") || "";
}

export { PROVIDERS };

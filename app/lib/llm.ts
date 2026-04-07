/**
 * Shared LLM utility — routes to LM Studio, Ollama, or Gemini
 *
 * Provider selection (passed via opts.provider):
 *  "lmstudio" → OpenAI-compatible API at localhost:1234 (LM Studio)
 *  "ollama"   → Ollama native API at localhost:11434
 *  "gemini"   → Google Gemini cloud API (requires apiKey)
 */

export type LLMProvider = "lmstudio" | "ollama" | "gemini" | "groq";

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  provider?: LLMProvider;
  /** Model name — used by Ollama. LM Studio uses whichever model is loaded in the UI. */
  ollamaModel?: string;
}

function stripMarkdown(text: string): string {
  let out = text.trim();
  if (out.startsWith("```json")) out = out.substring(7);
  else if (out.startsWith("```")) out = out.substring(3);
  if (out.endsWith("```")) out = out.substring(0, out.length - 3);
  return out.trim();
}

// ── LM Studio (OpenAI-compatible) ─────────────────────────────────────────────
async function callLMStudio(opts: LLMOptions): Promise<string> {
  const baseUrl = process.env.LM_STUDIO_URL ?? "http://localhost:1234";

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // LM Studio uses whatever model is currently loaded — model field is ignored
      // but must be present for spec compliance
      model: "local-model",
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user",   content: opts.userPrompt }
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: 4096,
      stream: false,
      // LM Studio only supports "text" or "json_schema" — use text and rely on prompt
      response_format: { type: "text" },
    }),
    // 120s timeout — first generation on a local model can be slow
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LM Studio error ${res.status}: ${err}\n\nMake sure:\n1. LM Studio Developer server is running (port 1234)\n2. A model is loaded in LM Studio`);
  }

  const data = await res.json();
  // OpenAI format: choices[0].message.content
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  return stripMarkdown(raw);
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function callOllama(opts: LLMOptions): Promise<string> {
  const model = opts.ollamaModel ?? "gemma3:4b";
  const baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user",   content: opts.userPrompt }
      ],
      format: "json",
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.9,
        num_predict: 4096,
      }
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data?.message?.content ?? "";
  return stripMarkdown(raw);
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(apiKey: string, opts: LLMOptions): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
        generationConfig: { temperature: opts.temperature ?? 0.9 },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini API error ${res.status}`);
  }

  const raw: string = data.candidates[0].content.parts[0].text ?? "";
  return stripMarkdown(raw);
}

// ── Groq ─────────────────────────────────────────────────────────────────────
async function callGroq(apiKey: string, opts: LLMOptions): Promise<string> {
  const model = "llama-3.3-70b-versatile";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user",   content: opts.userPrompt }
      ],
      temperature: opts.temperature ?? 0.9,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  return stripMarkdown(raw);
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function generateText(
  apiKey: string | undefined | null,
  opts: LLMOptions
): Promise<string> {
  const provider = opts.provider ?? "gemini";

  if (provider === "lmstudio") {
    return callLMStudio(opts);
  }
  if (provider === "ollama") {
    return callOllama(opts);
  }
  if (provider === "groq") {
    const groqKey = process.env.GROQ_API_KEY || apiKey?.trim();
    if (!groqKey || groqKey.length < 10) {
      throw new Error("Groq API key is required. Set GROQ_API_KEY in .env.local or Vercel environment variables.");
    }
    return callGroq(groqKey, opts);
  }
  // Gemini
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error("Gemini API key is required. Go to Dashboard → Settings and add your key, or switch to LM Studio / Ollama.");
  }
  return callGemini(apiKey.trim(), opts);
}

/**
 * Convenience wrapper that auto-parses the result as JSON.
 * Includes a second-pass rescue attempt for minor formatting issues.
 */
export async function generateJSON<T = unknown>(
  apiKey: string | undefined | null,
  opts: LLMOptions
): Promise<T> {
  const text = await generateText(apiKey, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    // Rescue: trim everything before the first [ or { and after the last ] or }
    const secondPass = text.replace(/^[^[{]*/, "").replace(/[^}\]]*$/, "");
    try {
      return JSON.parse(secondPass) as T;
    } catch {
      throw new Error(
        `LLM returned non-parseable JSON. Check that your model is loaded and responding.\n\nRaw output (first 500 chars):\n${text.substring(0, 500)}`
      );
    }
  }
}

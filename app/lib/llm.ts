/**
 * Shared LLM utility — routes to LM Studio, Mistral, or Gemini
 *
 * Provider selection (passed via opts.provider):
 *  "lmstudio" → OpenAI-compatible API at localhost:1234 (LM Studio)
 *  "mistral"  → Mistral.ai cloud API (requires mistralKey)
 *  "gemini"   → Google Gemini cloud API (requires apiKey)
 */

export type LLMProvider = "lmstudio" | "mistral" | "gemini" | "groq";

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  provider?: LLMProvider;
  mistralModel?: string;
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
      model: "local-model",
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user",   content: opts.userPrompt }
      ],
      temperature: opts.temperature ?? 0.7,
      max_tokens: 4096,
      stream: false,
      response_format: { type: "text" },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LM Studio error ${res.status}: ${err}\n\nMake sure:\n1. LM Studio Developer server is running (port 1234)\n2. A model is loaded in LM Studio`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  return stripMarkdown(raw);
}

// ── Mistral ──────────────────────────────────────────────────────────────────
async function callMistral(apiKey: string, opts: LLMOptions): Promise<string> {
  const model = opts.mistralModel ?? "mistral-small-latest";

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
      temperature: opts.temperature ?? 0.7,
      max_tokens: 4096,
      // Mistral supports json_object for small/medium/large models
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
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
  if (provider === "mistral") {
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error("Mistral API key is required. Go to Dashboard → Settings and add your key.");
    }
    return callMistral(apiKey.trim(), opts);
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
    throw new Error("Gemini API key is required. Go to Dashboard → Settings and add your key, or switch to LM Studio / Mistral.");
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

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const secondPass = text.replace(/^[^[{]*/, "").replace(/[^}\]]*$/, "");
    try {
      parsed = JSON.parse(secondPass);
    } catch {
      throw new Error(
        "LLM returned non-parseable JSON. Raw (first 500): " + text.substring(0, 500)
      );
    }
  }

  // Groq json_object mode wraps arrays: {"questions":[...]} -> extract the array
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const keys = Object.keys(parsed);
    if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
      return parsed[keys[0]] as T;
    }
  }

  return parsed as T;
}

/**
 * Shared LLM utility — auto-routes to Ollama (local) or Gemini (cloud)
 *
 * Logic:
 *  - If apiKey is blank → use Ollama at localhost:11434
 *  - If apiKey is provided → use Gemini 2.5 Flash (existing behaviour)
 *
 * IMPORTANT: Ollama must be running locally for the local path to work.
 * Install: https://ollama.com  |  Pull: `ollama pull gemma3:4b`
 */

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  /** Ollama model name — defaults to gemma3:4b */
  ollamaModel?: string;
}

/**
 * @param apiKey      Gemini API key. Pass "" or null to use local Ollama.
 * @param opts        Prompt + model configuration
 * @returns           Raw text (markdown fences stripped)
 */

function stripMarkdown(text: string): string {
  let out = text.trim();
  if (out.startsWith("```json")) out = out.substring(7);
  else if (out.startsWith("```")) out = out.substring(3);
  if (out.endsWith("```")) out = out.substring(0, out.length - 3);
  return out.trim();
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function callOllama(opts: LLMOptions): Promise<string> {
  const model = opts.ollamaModel ?? "gemma3:4b";
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user",   content: opts.userPrompt }
      ],
      format: "json",          // enforces valid JSON output — no stripping needed
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.9,
        num_predict: 4096,
      }
    }),
    // Give Ollama up to 90s on slow hardware (first generation warms up the model)
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Ollama chat API returns: { message: { content: "..." } }
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

// ── Public entry point ────────────────────────────────────────────────────────
/**
 * @param apiKey  Gemini API key.  Pass "" or omit to use local Ollama instead.
 * @param opts    Prompt + model configuration
 * @returns       Raw text from the model (markdown fences already stripped)
 */
export async function generateText(
  apiKey: string | undefined | null,
  opts: LLMOptions
): Promise<string> {
  if (apiKey && apiKey.trim().length > 10) {
    return callGemini(apiKey.trim(), opts);
  }
  return callOllama(opts);
}

/**
 * Convenience wrapper that auto-parses the result as JSON.
 * Throws a descriptive error if the output cannot be parsed.
 */
export async function generateJSON<T = unknown>(
  apiKey: string | undefined | null,
  opts: LLMOptions
): Promise<T> {
  const text = await generateText(apiKey, opts);
  try {
    return JSON.parse(text) as T;
  } catch {
    // Attempt a second lighter strip pass in case of very minor formatting issues
    const secondPass = text.replace(/^[^[{]*/, "").replace(/[^}\]]*$/, "");
    try {
      return JSON.parse(secondPass) as T;
    } catch {
      throw new Error(`LLM returned non-parseable JSON. Raw output:\n${text.substring(0, 500)}`);
    }
  }
}

export function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit, timeoutMs = 2000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    ...options,
    signal: options?.signal || controller.signal,
  }).finally(() => clearTimeout(id));
}

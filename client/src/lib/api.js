// In production (Vercel), API routes are on the same origin
// In development, use the Express server on port 3001
const API_BASE = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function streamChat({ model, messages, thinking, max_tokens, temperature, onChunk, onThinking, onUsage, onDone, onError }) {
  try {
    const body = { model, messages, stream: true, thinking };
    if (max_tokens) body.max_tokens = max_tokens;
    if (temperature != null) body.temperature = temperature;

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errMsg;
      try {
        const errData = JSON.parse(await res.text());
        errMsg = errData.error || JSON.stringify(errData);
      } catch {
        errMsg = `Server error (${res.status})`;
      }
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));

          // Check for error responses in SSE data
          if (json.error && !json.choices) {
            const errMsg = typeof json.error === 'string' ? json.error : (json.error.message || JSON.stringify(json.error));
            onError?.(errMsg);
            return;
          }

          const delta = json.choices?.[0]?.delta;

          if (!delta) continue;

          // Reasoning/thinking content (DeepSeek, Qwen-thinking, Nemotron-reasoning)
          if (delta.reasoning_content) {
            onThinking?.(delta.reasoning_content);
          }
          // Arli AI uses "reasoning" instead of "reasoning_content"
          if (delta.reasoning) {
            onThinking?.(delta.reasoning);
          }

          // Regular content
          if (delta.content) {
            onChunk(delta.content);
          }

          // Tool calls content (some models return content inside tool_calls)
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.arguments) {
                onChunk(tc.function.arguments);
              }
            }
          }

          // Usage stats
          if (json.usage) {
            onUsage?.(json.usage);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err.message || 'Stream failed');
  }
}

const express = require('express');
const router = express.Router();

// Maps our internal model IDs to actual API model IDs
const MODEL_ID_MAP = {
  // Arli AI (API requires "(TRIAL) " prefix)
  'arliai/qwen-3.5-27b': '(TRIAL) Qwen3.5-27B-BlueStar-Derestricted',
  'arliai/glm-4.7': '(TRIAL) GLM-4.7',
  'arliai/gemma-4-31b': '(TRIAL) Gemma-4-31B-it',
  // FreeTheAi (API uses prefixed IDs — yng/ is most reliable)
  'freetheai/claude-opus-4.7': 'yng/claude-opus-4-7',
  'freetheai/gemini-3-flash': 'yng/gemini-3-flash',
  // OpenRouter (uses full model paths with :free suffix)
  'openrouter/deepseek-r1:free': 'deepseek/deepseek-r1:free',
  'openrouter/qwen3-coder:free': 'qwen/qwen3-coder:free',
  'openrouter/gemma-4-31b-it:free': 'google/gemma-4-31b-it:free',
  'openrouter/llama-3.3-70b-instruct:free': 'meta-llama/llama-3.3-70b-instruct:free',
  'openrouter/glm-4.5-air:free': 'z-ai/glm-4.5-air:free',
  // GitHub Models
  'github/gpt-4.1': 'gpt-4.1',
  'github/gpt-4.1-mini': 'gpt-4.1-mini',
  'github/o4-mini': 'o4-mini',
  'github/llama-4-scout-17b-16e-instruct': 'Llama-4-Scout-17B-16E-Instruct',
  'github/deepseek-r1': 'DeepSeek-R1',
};

function getProvider(model) {
  const providers = {
    zen: { baseUrl: process.env.ZEN_BASE_URL || 'https://opencode.ai/zen/v1', apiKey: process.env.ZEN_API_KEY },
    arliai: { baseUrl: process.env.ARLIAI_BASE_URL || 'https://api.arliai.com/v1', apiKey: process.env.ARLIAI_API_KEY },
    freetheai: { baseUrl: process.env.FREETHEAI_BASE_URL || 'https://api.freetheai.xyz/v1', apiKey: process.env.FREETHEAI_API_KEY },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY },
    sambanova: { baseUrl: 'https://api.sambanova.ai/v1', apiKey: process.env.SAMBANOVA_API_KEY },
    cerebras: { baseUrl: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY },
    google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey: process.env.GOOGLE_API_KEY },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY },
    github: { baseUrl: 'https://models.inference.ai.azure.com', apiKey: process.env.GITHUB_TOKEN },
    llm7: { baseUrl: 'https://api.llm7.io/v1', apiKey: process.env.LLM7_API_KEY },
  };

  const prefix = model.split('/')[0];
  const provider = providers[prefix];
  if (provider) {
    const actualModel = MODEL_ID_MAP[model] || model.split('/').slice(1).join('/');
    return {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      actualModel,
      name: prefix,
    };
  }

  // Default: NVIDIA NIM
  return {
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
    actualModel: model,
    name: 'nvidia',
  };
}

router.post('/', async (req, res) => {
  const { model, messages, max_tokens = 2048, temperature = 0.6, stream = true, thinking = false } = req.body;

  if (!model || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages are required' });
  }

  const provider = getProvider(model);

  if (!provider.apiKey) {
    return res.status(500).json({
      error: `API key not configured for ${provider.name}. Add it to your .env file.`,
      code: 'NO_API_KEY'
    });
  }

  const payload = {
    model: provider.actualModel,
    messages,
    max_tokens,
    temperature,
    stream: true,
  };

  if (thinking && provider.name === 'nvidia') {
    payload.thinking = { type: 'enabled', budget_tokens: 8192 };
  }

  // Google Gemini requires different max_tokens field name
  if (provider.name === 'google') {
    payload.max_output_tokens = payload.max_tokens;
    delete payload.max_tokens;
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMsg;
      try {
        const errData = JSON.parse(await response.text());
        errorMsg = errData.detail || (typeof errData.error === 'string' ? errData.error : errData.error?.message) || errData.message || JSON.stringify(errData);
      } catch {
        errorMsg = `HTTP ${response.status}`;
      }
      console.error(`${provider.name} API error for ${provider.actualModel}: ${response.status} - ${errorMsg}`);

      if (response.status === 404) return res.status(404).json({ error: 'This model is not available. Try another model.', code: 'MODEL_NOT_FOUND' });
      if (response.status === 429) return res.status(429).json({ error: 'Rate limit reached. Wait a moment and try again.', code: 'RATE_LIMIT' });
      if (response.status === 401 || response.status === 403) return res.status(response.status).json({ error: `Invalid API key for ${provider.name}. Check your .env file.`, code: 'AUTH_ERROR' });
      return res.status(response.status).json({ error: errorMsg, code: 'API_ERROR' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let hasContent = false;
    let firstChunk = true;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        if (firstChunk) {
          firstChunk = false;
          // Check for plain JSON error response
          const trimmed = chunk.trim();
          if (trimmed.startsWith('{')) {
            try {
              const errData = JSON.parse(trimmed);
              if (errData.error || errData.status >= 400) {
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n> Error: ${errData.detail || errData.error?.message || errData.error || 'Model unavailable'}` }, finish_reason: 'stop' }] })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            } catch {}
          }
          // Check for SSE-wrapped error (data: {error: ...})
          if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
            try {
              const errData = JSON.parse(trimmed.slice(6));
              if (errData.error) {
                const errMsg = typeof errData.error === 'string' ? errData.error : (errData.error.message || 'Model unavailable');
                res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n> Error: ${errMsg}` }, finish_reason: 'stop' }] })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            } catch {}
          }
        }

        hasContent = true;
        res.write(chunk);
      }
    } catch (streamErr) {
      if (streamErr.name !== 'AbortError') console.error('Stream error:', streamErr);
    }

    if (!hasContent) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `The model didn't respond after ${elapsed}s. Try again or pick a different model.` }, finish_reason: 'stop' }] })}\n\n`);
      res.write('data: [DONE]\n\n');
    }

    res.end();
  } catch (err) {
    console.error('Chat proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Failed to connect to ${provider.name} API. Please try again.`, code: 'CONNECTION_ERROR' });
    } else {
      res.end();
    }
  }
});

module.exports = router;

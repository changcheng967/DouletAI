import { NextResponse } from 'next/server';

export const maxDuration = 60;

const MODEL_ID_MAP = {
  'arliai/qwen-3.5-27b': '(TRIAL) Qwen3.5-27B-BlueStar-Derestricted',
  'arliai/glm-4.7': '(TRIAL) GLM-4.7',
  'arliai/gemma-4-31b': '(TRIAL) Gemma-4-31B-it',
  'arliai/mistral-medium-3.5': '(TRIAL) Mistral-Medium-3.5-128B',
  'freetheai/claude-opus-4.7': 'yng/claude-opus-4-7',
  'freetheai/claude-4.6-sonnet': 'yng/claude-4-6-sonnet',
  'freetheai/claude-4.5-haiku': 'yng/claude-4-5-haiku',
  'freetheai/gemini-3.1-pro': 'yng/gemini-3-1-pro',
  'freetheai/gemini-3-flash': 'yng/gemini-3-flash',
  'freetheai/gpt-5.5': 'yng/gpt-5.5',
  'freetheai/gpt-5.1': 'yng/gpt-5.1',
  'freetheai/grok-4.1-fast': 'bbl/grok-4.1-fast-non-reasoning',
  'modal/glm-5.1': 'zai-org/GLM-5.1-FP8',
  'openrouter/deepseek-r1:free': 'deepseek/deepseek-r1:free',
  'openrouter/qwen3-coder:free': 'qwen/qwen3-coder:free',
  'openrouter/gemma-4-31b-it:free': 'google/gemma-4-31b-it:free',
  'openrouter/llama-3.3-70b-instruct:free': 'meta-llama/llama-3.3-70b-instruct:free',
  'openrouter/glm-4.5-air:free': 'z-ai/glm-4.5-air:free',
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
    modal: { baseUrl: process.env.MODAL_BASE_URL || 'https://api.us-west-2.modal.direct/v1', apiKey: process.env.MODAL_API_KEY },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY },
    sambanova: { baseUrl: 'https://api.sambanova.ai/v1', apiKey: process.env.SAMBANOVA_API_KEY },
    cerebras: { baseUrl: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY },
    google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiKey: process.env.GOOGLE_API_KEY },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY },
    github: { baseUrl: 'https://models.inference.ai.azure.com', apiKey: process.env.GITHUB_TOKEN },
  };

  const prefix = model.split('/')[0];
  const provider = providers[prefix];
  if (provider) {
    const actualModel = MODEL_ID_MAP[model] || model.split('/').slice(1).join('/');
    return { baseUrl: provider.baseUrl, apiKey: provider.apiKey, actualModel, name: prefix };
  }

  return {
    baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
    actualModel: model,
    name: 'nvidia',
  };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error('Failed to parse request body:', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { model, messages, max_tokens = 2048, temperature = 0.6, thinking = false } = body;

  if (!model || !messages || !Array.isArray(messages)) {
    console.error('Missing required fields:', { model: !!model, messages: !!messages, isArray: Array.isArray(messages) });
    return NextResponse.json({ error: 'model and messages are required' }, { status: 400 });
  }

  const provider = getProvider(model);

  if (!provider.apiKey) {
    return NextResponse.json({
      error: `API key not configured for ${provider.name}. Add it to your Vercel environment variables.`,
      code: 'NO_API_KEY',
    }, { status: 500 });
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
        errorMsg = errData.detail || errData.error || errData.message || JSON.stringify(errData);
      } catch {
        errorMsg = `HTTP ${response.status}`;
      }
      console.error(`${provider.name} API error for ${provider.actualModel}: ${response.status} - ${errorMsg}`);

      if (response.status === 404) return NextResponse.json({ error: 'This model is not available. Try another model.', code: 'MODEL_NOT_FOUND' }, { status: 404 });
      if (response.status === 429) return NextResponse.json({ error: 'Rate limit reached. Wait a moment and try again.', code: 'RATE_LIMIT' }, { status: 429 });
      if (response.status === 401 || response.status === 403) return NextResponse.json({ error: `Invalid API key for ${provider.name}.`, code: 'AUTH_ERROR' }, { status: response.status });
      return NextResponse.json({ error: errorMsg, code: 'API_ERROR' }, { status: response.status });
    }

    const encoder = new TextEncoder();
    let hasContent = false;
    let firstChunk = true;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            if (firstChunk) {
              firstChunk = false;
              const trimmed = chunk.trim();
              if (trimmed.startsWith('{')) {
                try {
                  const errData = JSON.parse(trimmed);
                  if (errData.error || errData.status >= 400) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n> Error: ${errData.detail || errData.error?.message || errData.error || 'Model unavailable'}` }, finish_reason: 'stop' }] })}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    return;
                  }
                } catch {}
              }
              if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
                try {
                  const errData = JSON.parse(trimmed.slice(6));
                  if (errData.error) {
                    const errMsg = typeof errData.error === 'string' ? errData.error : (errData.error.message || 'Model unavailable');
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n> Error: ${errMsg}` }, finish_reason: 'stop' }] })}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                    return;
                  }
                } catch {}
              }
            }

            hasContent = true;
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (streamErr) {
          if (streamErr.name !== 'AbortError') console.error('Stream error:', streamErr);
        }

        if (!hasContent) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `The model didn't respond after ${elapsed}s. Try again or pick a different model.` }, finish_reason: 'stop' }] })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat proxy error:', err);
    return NextResponse.json({ error: `Failed to connect to ${provider.name} API.`, code: 'CONNECTION_ERROR' }, { status: 500 });
  }
}

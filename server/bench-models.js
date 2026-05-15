const express = require('express');
const router = express.Router();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
};

function getProvider(model) {
  const providers = {
    zen: { baseUrl: process.env.ZEN_BASE_URL || 'https://opencode.ai/zen/v1', apiKey: process.env.ZEN_API_KEY },
    arliai: { baseUrl: process.env.ARLIAI_BASE_URL || 'https://api.arliai.com/v1', apiKey: process.env.ARLIAI_API_KEY },
    freetheai: { baseUrl: process.env.FREETHEAI_BASE_URL || 'https://api.freetheai.xyz/v1', apiKey: process.env.FREETHEAI_API_KEY },
    modal: { baseUrl: process.env.MODAL_BASE_URL || 'https://api.us-west-2.modal.direct/v1', apiKey: process.env.MODAL_API_KEY },
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

const ALL_MODELS = [
  // NVIDIA NIM
  'google/gemma-2-2b-it','google/gemma-3-4b-it','google/gemma-3-12b-it',
  'google/gemma-3n-e2b-it','google/gemma-3n-e4b-it',
  'meta/llama-3.1-70b-instruct','meta/llama-3.2-1b-instruct','meta/llama-3.2-3b-instruct',
  'meta/llama-3.2-11b-vision-instruct','meta/llama-3.2-90b-vision-instruct',
  'meta/llama-3.3-70b-instruct','meta/llama-4-maverick-17b-128e-instruct',
  'microsoft/phi-4-mini-instruct',
  'mistralai/ministral-14b-instruct-2512','mistralai/mistral-medium-3.5-128b',
  'mistralai/mistral-nemotron','mistralai/mistral-small-4-119b-2603',
  'mistralai/mixtral-8x7b-instruct-v0.1','mistralai/mixtral-8x22b-instruct-v0.1',
  'nvidia/llama-3.1-nemotron-nano-8b-v1','nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
  'nvidia/llama-3.3-nemotron-super-49b-v1','nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/nemotron-3-nano-30b-a3b','nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-3-super-120b-a12b','nvidia/nemotron-mini-4b-instruct',
  'nvidia/nemotron-nano-12b-v2-vl','nvidia/nvidia-nemotron-nano-9b-v2',
  'openai/gpt-oss-120b','openai/gpt-oss-20b',
  'qwen/qwen3-coder-480b-a35b-instruct','qwen/qwen3-next-80b-a3b-instruct',
  'qwen/qwen3-next-80b-a3b-thinking','qwen/qwen3.5-122b-a10b','qwen/qwen3.5-397b-a17b',
  'sarvamai/sarvam-m','stepfun-ai/step-3.5-flash',
  'stockmark/stockmark-2-100b-instruct','upstage/solar-10.7b-instruct',
  'z-ai/glm-5.1','z-ai/glm5',
  'deepseek-ai/deepseek-v4-flash','deepseek-ai/deepseek-v4-pro',
  'google/gemma-4-31b-it','minimaxai/minimax-m2.7',
  'moonshotai/kimi-k2.6','meta/llama-3.1-8b-instruct',
  'mistralai/mistral-large-3-675b-instruct-2512',
  // External providers
  'zen/minimax-m2.5-free','zen/deepseek-v4-flash-free','zen/ring-2.6-1t-free','zen/nemotron-3-super-free',
  'arliai/qwen-3.5-27b','arliai/glm-4.7','arliai/gemma-4-31b','arliai/mistral-medium-3.5',
  'freetheai/claude-opus-4.7','freetheai/claude-4.6-sonnet','freetheai/claude-4.5-haiku',
  'freetheai/gemini-3.1-pro','freetheai/gemini-3-flash','freetheai/gpt-5.5',
  'freetheai/gpt-5.1','freetheai/grok-4.1-fast',
  'modal/glm-5.1',
];

async function testModel(model) {
  const provider = getProvider(model);
  if (!provider.apiKey) return { model, status: 'skip', reason: 'no_key' };

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.actualModel,
        messages: [{ role: 'user', content: 'Say hi in one word.' }],
        max_tokens: 32,
        temperature: 0.3,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let errMsg;
      try { const e = JSON.parse(await response.text()); errMsg = e.detail || e.error?.message || e.error || e.message || JSON.stringify(e); } catch { errMsg = `HTTP ${response.status}`; }
      return { model, status: 'fail', code: response.status, error: String(errMsg).slice(0, 120), provider: provider.name };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let ttk = null;
    let tokens = 0;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          if (json.error) return { model, status: 'fail', error: String(json.error).slice(0, 120), provider: provider.name };
          const delta = json.choices?.[0]?.delta;
          if (delta?.content || delta?.reasoning_content || delta?.reasoning) {
            if (!ttk) ttk = ((Date.now() - startTime) / 1000).toFixed(2);
            tokens++;
          }
        } catch {}
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    if (tokens === 0) return { model, status: 'fail', error: 'No tokens received', provider: provider.name };
    return { model, status: 'ok', ttk: parseFloat(ttk), totalTime: parseFloat(totalTime), tokens, provider: provider.name };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') return { model, status: 'fail', error: 'Timeout (30s)', provider: provider.name };
    return { model, status: 'fail', error: err.message?.slice(0, 80), provider: provider.name };
  }
}

async function runTests() {
  const results = [];
  const batchSize = 5;
  for (let i = 0; i < ALL_MODELS.length; i += batchSize) {
    const batch = ALL_MODELS.slice(i, i + batchSize);
    const promises = batch.map(m => testModel(m));
    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      results.push(r);
      const icon = r.status === 'ok' ? 'OK' : r.status === 'skip' ? '--' : 'XX';
      if (r.status === 'ok') {
        const speed = r.ttk < 2 ? 'fast' : r.ttk < 5 ? 'medium' : 'slow';
        console.log(`[${icon}] ${r.model.padEnd(50)} TTK:${String(r.ttk+'s').padStart(7)}  Total:${String(r.totalTime+'s').padStart(7)}  Tokens:${String(r.tokens).padStart(4)}  ${speed}`);
      } else if (r.status === 'fail') {
        console.log(`[${icon}] ${r.model.padEnd(50)} ERROR: ${r.error}`);
      } else {
        console.log(`[${icon}] ${r.model.padEnd(50)} SKIPPED (no key)`);
      }
    }
  }

  console.log('\n\n=== SUMMARY ===');
  const ok = results.filter(r => r.status === 'ok');
  const fail = results.filter(r => r.status === 'fail');
  const skip = results.filter(r => r.status === 'skip');
  console.log(`Working: ${ok.length}  Failed: ${fail.length}  Skipped: ${skip.length}`);

  console.log('\n=== SPEED RESULTS (sorted by TTK) ===');
  ok.sort((a, b) => a.ttk - b.ttk);
  for (const r of ok) {
    const speed = r.ttk < 1.5 ? 'fast' : r.ttk < 4 ? 'medium' : 'slow';
    console.log(`${r.model.padEnd(50)} TTK:${String(r.ttk+'s').padStart(7)}  Total:${String(r.totalTime+'s').padStart(7)}  ${speed}`);
  }

  if (fail.length > 0) {
    console.log('\n=== FAILED MODELS ===');
    for (const r of fail) {
      console.log(`${r.model.padEnd(50)} ${r.error}`);
    }
  }

  // Output JSON for use in models.js
  console.log('\n\n=== JSON SPEED DATA ===');
  const speedData = {};
  for (const r of ok) {
    const speed = r.ttk < 1.5 ? 'fast' : r.ttk < 4 ? 'medium' : 'slow';
    speedData[r.model] = { speed, ttk: r.ttk, totalTime: r.totalTime };
  }
  console.log(JSON.stringify(speedData, null, 2));
}

runTests().catch(console.error);

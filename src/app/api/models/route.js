import { NextResponse } from 'next/server';

const API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const ZEN_API_KEY = process.env.ZEN_API_KEY;
const ARLIAI_API_KEY = process.env.ARLIAI_API_KEY;
const FREETHEAI_API_KEY = process.env.FREETHEAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const LLM7_API_KEY = process.env.LLM7_API_KEY;

let modelsCache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

const EXTERNAL_MODELS = {
  ...(ZEN_API_KEY ? {
    'zen/minimax-m2.5-free': { name: 'MiniMax M2.5 Free', provider: 'minimax', tags: ['zen'], speed: 'fast', ttk: 1.13 },
    'zen/deepseek-v4-flash-free': { name: 'DeepSeek V4 Flash Free', provider: 'deepseek', tags: ['zen'], speed: 'fast', ttk: 0.91 },
    'zen/nemotron-3-super-free': { name: 'Nemotron 3 Super Free', provider: 'nvidia', tags: ['zen'], speed: 'medium', ttk: 4.7 },
  } : {}),
  ...(ARLIAI_API_KEY ? {
    'arliai/qwen-3.5-27b': { name: 'Qwen 3.5 27B Derestricted', provider: 'arli-ai', tags: ['arli'], speed: 'fast' },
    'arliai/glm-4.7': { name: 'GLM 4.7', provider: 'z-ai', tags: ['arli'], speed: 'medium', ttk: 4.75 },
    'arliai/gemma-4-31b': { name: 'Gemma 4 31B', provider: 'google', tags: ['arli'], speed: 'slow', ttk: 27.85 },
  } : {}),
  ...(FREETHEAI_API_KEY ? {
    'freetheai/claude-opus-4.7': { name: 'Claude Opus 4.7', provider: 'anthropic', tags: ['freetheai'], speed: 'slow', ttk: 15.63 },
    'freetheai/gemini-3-flash': { name: 'Gemini 3 Flash', provider: 'google', tags: ['freetheai'], speed: 'slow', ttk: 16.31 },
  } : {}),
  ...(GROQ_API_KEY ? {
    'groq/llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', provider: 'meta', tags: ['groq'], speed: 'fast' },
    'groq/llama-4-scout-17b-16e-instruct': { name: 'Llama 4 Scout 17B', provider: 'meta', tags: ['groq'], speed: 'fast' },
    'groq/qwen3-32b': { name: 'Qwen3 32B', provider: 'qwen', tags: ['groq'], speed: 'fast' },
    'groq/deepseek-r1-distill-llama-70b': { name: 'DeepSeek R1 70B', provider: 'deepseek', tags: ['groq', 'reasoning'], speed: 'fast' },
    'groq/gpt-oss-120b': { name: 'GPT-OSS 120B', provider: 'openai', tags: ['groq'], speed: 'fast' },
  } : {}),
  ...(SAMBANOVA_API_KEY ? {
    'sambanova/llama-4-maverick-17b-128e-instruct': { name: 'Llama 4 Maverick 17B', provider: 'meta', tags: ['sambanova'], speed: 'fast' },
    'sambanova/deepseek-v4-flash': { name: 'DeepSeek V4 Flash', provider: 'deepseek', tags: ['sambanova'], speed: 'fast' },
    'sambanova/qwen3.5-397b-a17b': { name: 'Qwen3.5 397B', provider: 'qwen', tags: ['sambanova'], speed: 'fast' },
  } : {}),
  ...(CEREBRAS_API_KEY ? {
    'cerebras/llama-3.3-70b': { name: 'Llama 3.3 70B', provider: 'meta', tags: ['cerebras'], speed: 'fast' },
    'cerebras/qwen-3-32b': { name: 'Qwen3 32B', provider: 'qwen', tags: ['cerebras'], speed: 'fast' },
  } : {}),
  ...(GOOGLE_API_KEY ? {
    'google/gemini-3-flash': { name: 'Gemini 3 Flash', provider: 'google', tags: ['google-ai'], speed: 'fast' },
    'google/gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'google', tags: ['google-ai', 'reasoning'], speed: 'medium' },
    'google/gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'google', tags: ['google-ai'], speed: 'fast' },
  } : {}),
  ...(OPENROUTER_API_KEY ? {
    'openrouter/deepseek-r1:free': { name: 'DeepSeek R1 Free', provider: 'deepseek', tags: ['openrouter', 'reasoning'], speed: 'fast' },
    'openrouter/qwen3-coder:free': { name: 'Qwen3 Coder Free', provider: 'qwen', tags: ['openrouter', 'coding'], speed: 'fast' },
    'openrouter/gemma-4-31b-it:free': { name: 'Gemma 4 31B Free', provider: 'google', tags: ['openrouter'], speed: 'fast' },
    'openrouter/llama-3.3-70b-instruct:free': { name: 'Llama 3.3 70B Free', provider: 'meta', tags: ['openrouter'], speed: 'fast' },
    'openrouter/glm-4.5-air:free': { name: 'GLM 4.5 Air Free', provider: 'z-ai', tags: ['openrouter'], speed: 'fast' },
  } : {}),
  ...(GITHUB_TOKEN ? {
    'github/gpt-4.1': { name: 'GPT-4.1', provider: 'openai', tags: ['github'], speed: 'fast' },
    'github/gpt-4.1-mini': { name: 'GPT-4.1 Mini', provider: 'openai', tags: ['github'], speed: 'fast' },
    'github/o4-mini': { name: 'O4 Mini', provider: 'openai', tags: ['github', 'reasoning'], speed: 'fast' },
    'github/llama-4-scout-17b-16e-instruct': { name: 'Llama 4 Scout 17B', provider: 'meta', tags: ['github'], speed: 'fast' },
    'github/deepseek-r1': { name: 'DeepSeek R1', provider: 'deepseek', tags: ['github', 'reasoning'], speed: 'fast' },
  } : {}),
  ...(LLM7_API_KEY ? {
    'llm7/gpt-oss-20b': { name: 'GPT-OSS 20B', provider: 'openai', tags: ['llm7'], speed: 'fast' },
    'llm7/codestral-latest': { name: 'Codestral', provider: 'mistralai', tags: ['llm7', 'coding'], speed: 'fast' },
    'llm7/glm-4.6v-flash': { name: 'GLM 4.6V Flash', provider: 'z-ai', tags: ['llm7', 'vision'], speed: 'fast' },
  } : {}),
};

// Tested and CONFIRMED WORKING on NVIDIA free tier (2026-05-15)
const WORKING_MODELS = {
  'google/gemma-2-2b-it': { name: 'Gemma 2 2B', tags: [], speed: 'fast', ttk: 0.45 },
  'google/gemma-3n-e2b-it': { name: 'Gemma 3n E2B', tags: [], speed: 'fast', ttk: 0.46 },
  'google/gemma-3n-e4b-it': { name: 'Gemma 3n E4B', tags: [], speed: 'fast', ttk: 0.47 },
  'meta/llama-3.1-70b-instruct': { name: 'Llama 3.1 70B', tags: [], speed: 'fast', ttk: 0.19 },
  'meta/llama-3.1-8b-instruct': { name: 'Llama 3.1 8B', tags: [], speed: 'fast', ttk: 0.3 },
  'meta/llama-3.2-11b-vision-instruct': { name: 'Llama 3.2 11B Vision', tags: ['vision'], speed: 'fast', ttk: 0.17 },
  'meta/llama-3.2-1b-instruct': { name: 'Llama 3.2 1B', tags: [], speed: 'fast', ttk: 0.15 },
  'meta/llama-3.2-3b-instruct': { name: 'Llama 3.2 3B', tags: [], speed: 'fast', ttk: 0.16 },
  'meta/llama-3.2-90b-vision-instruct': { name: 'Llama 3.2 90B Vision', tags: ['vision'], speed: 'fast', ttk: 0.54 },
  'meta/llama-3.3-70b-instruct': { name: 'Llama 3.3 70B', tags: [], speed: 'fast', ttk: 1.2 },
  'meta/llama-4-maverick-17b-128e-instruct': { name: 'Llama 4 Maverick 17B', tags: [], speed: 'fast', ttk: 0.24 },
  'mistralai/ministral-14b-instruct-2512': { name: 'Ministral 14B', tags: [], speed: 'fast', ttk: 0.18 },
  'mistralai/mistral-large-3-675b-instruct-2512': { name: 'Mistral Large 3 675B', tags: [], speed: 'medium', ttk: 2.41 },
  'mistralai/mistral-medium-3.5-128b': { name: 'Mistral Medium 3.5 128B', tags: [], speed: 'slow', ttk: 6.83 },
  'mistralai/mistral-nemotron': { name: 'Mistral Nemotron', tags: [], speed: 'fast', ttk: 0.29 },
  'mistralai/mistral-small-4-119b-2603': { name: 'Mistral Small 4 119B', tags: [], speed: 'fast', ttk: 1.23 },
  'mistralai/mixtral-8x22b-instruct-v0.1': { name: 'Mixtral 8x22B', tags: [], speed: 'fast', ttk: 0.3 },
  'mistralai/mixtral-8x7b-instruct-v0.1': { name: 'Mixtral 8x7B', tags: [], speed: 'fast', ttk: 0.5 },
  'nvidia/llama-3.1-nemotron-nano-8b-v1': { name: 'Nemotron Nano 8B', tags: [], speed: 'fast', ttk: 0.22 },
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': { name: 'Nemotron Nano VL 8B', tags: ['vision'], speed: 'fast', ttk: 0.22 },
  'nvidia/llama-3.3-nemotron-super-49b-v1': { name: 'Nemotron Super 49B', tags: [], speed: 'fast', ttk: 0.96 },
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': { name: 'Nemotron Super 49B v1.5', tags: [], speed: 'fast', ttk: 0.54 },
  'nvidia/nemotron-3-nano-30b-a3b': { name: 'Nemotron 3 Nano 30B', tags: [], speed: 'fast', ttk: 0.3 },
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning': { name: 'Nemotron 3 Nano Omni 30B', tags: ['vision', 'reasoning'], speed: 'medium', ttk: 4.64 },
  'nvidia/nemotron-3-super-120b-a12b': { name: 'Nemotron 3 Super 120B', tags: [], speed: 'medium', ttk: 2.25 },
  'nvidia/nemotron-mini-4b-instruct': { name: 'Nemotron Mini 4B', tags: [], speed: 'fast', ttk: 0.21 },
  'nvidia/nemotron-nano-12b-v2-vl': { name: 'Nemotron Nano 12B VL', tags: ['vision'], speed: 'fast', ttk: 0.24 },
  'nvidia/nvidia-nemotron-nano-9b-v2': { name: 'Nemotron Nano 9B', tags: [], speed: 'fast', ttk: 0.5 },
  'openai/gpt-oss-120b': { name: 'GPT-OSS 120B', tags: [], speed: 'fast', ttk: 0.33 },
  'openai/gpt-oss-20b': { name: 'GPT-OSS 20B', tags: [], speed: 'fast', ttk: 0.31 },
  'qwen/qwen3-coder-480b-a35b-instruct': { name: 'Qwen3 Coder 480B', tags: ['coding'], speed: 'fast' },
  'qwen/qwen3-next-80b-a3b-instruct': { name: 'Qwen3 Next 80B', tags: [], speed: 'medium', ttk: 4.32 },
  'qwen/qwen3-next-80b-a3b-thinking': { name: 'Qwen3 Next 80B Thinking', tags: ['reasoning'], speed: 'fast', ttk: 0.31 },
  'qwen/qwen3.5-122b-a10b': { name: 'Qwen3.5 122B', tags: [], speed: 'slow', ttk: 13.41 },
  'qwen/qwen3.5-397b-a17b': { name: 'Qwen3.5 397B', tags: [], speed: 'medium', ttk: 2.05 },
  'sarvamai/sarvam-m': { name: 'Sarvam-M', tags: [], speed: 'fast', ttk: 0.24 },
  'stepfun-ai/step-3.5-flash': { name: 'Step 3.5 Flash', tags: [], speed: 'fast', ttk: 0.35 },
  'stockmark/stockmark-2-100b-instruct': { name: 'Stockmark 2 100B', tags: [], speed: 'fast', ttk: 0.88 },
  'upstage/solar-10.7b-instruct': { name: 'Solar 10.7B', tags: [], speed: 'fast', ttk: 0.25 },
  'z-ai/glm-5.1': { name: 'GLM 5.1', tags: [], speed: 'slow', ttk: 18.63 },
  'z-ai/glm5': { name: 'GLM 5', tags: [], speed: 'slow', ttk: 13.71 },
  'arliai/gemma-4-31b': { name: 'Gemma 4 31B', tags: [], speed: 'slow', ttk: 27.85 },
};

function buildModelList() {
  const models = [];
  const seen = new Set();

  for (const [id, info] of Object.entries(WORKING_MODELS)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const parts = id.split('/');
    const entry = {
      id, provider: parts[0], name: info.name || parts.slice(1).join('/') || id,
      owned_by: parts[0], context_length: null,
      tags: info.tags || [], speed: info.speed || 'fast',
    };
    if (info.ttk != null) entry.ttk = info.ttk;
    models.push(entry);
  }

  for (const [id, info] of Object.entries(EXTERNAL_MODELS)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = {
      id, provider: info.provider, name: info.name,
      owned_by: id.split('/')[0], context_length: null,
      tags: info.tags || [], speed: info.speed || 'fast',
    };
    if (info.ttk != null) entry.ttk = info.ttk;
    models.push(entry);
  }

  const providerOrder = {
    anthropic: 0, google: 1, openai: 2, meta: 3, mistralai: 4,
    qwen: 5, 'z-ai': 6, 'deepseek-ai': 7, nvidia: 8, microsoft: 9,
    'x-ai': 10, deepseek: 11, minimax: 12, ring: 13, 'arli-ai': 14,
    moonshotai: 15, minimaxai: 16, 'stepfun-ai': 17, sarvamai: 18,
    stockmark: 19, upstage: 20,
  };
  models.sort((a, b) => {
    const ao = providerOrder[a.provider] ?? 99;
    const bo = providerOrder[b.provider] ?? 99;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  const grouped = {};
  for (const m of models) {
    if (!grouped[m.provider]) grouped[m.provider] = [];
    grouped[m.provider].push(m);
  }

  return { models, grouped, total: models.length };
}

export async function GET() {
  if (modelsCache && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(modelsCache);
  }

  modelsCache = buildModelList();
  cacheTime = Date.now();
  return NextResponse.json(modelsCache);
}

import { NextResponse } from 'next/server';

const API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const ZEN_API_KEY = process.env.ZEN_API_KEY;
const ARLIAI_API_KEY = process.env.ARLIAI_API_KEY;
const FREETHEAI_API_KEY = process.env.FREETHEAI_API_KEY;
const MODAL_API_KEY = process.env.MODAL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

let modelsCache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

const EXTERNAL_MODELS = {
  ...(ZEN_API_KEY ? {
    'zen/minimax-m2.5-free': { name: 'MiniMax M2.5 Free', provider: 'minimax', tags: ['zen'], speed: 'fast' },
    'zen/deepseek-v4-flash-free': { name: 'DeepSeek V4 Flash Free', provider: 'deepseek', tags: ['zen'], speed: 'fast' },
    'zen/ring-2.6-1t-free': { name: 'Ring 2.6 1T Free', provider: 'ring', tags: ['zen'], speed: 'fast' },
    'zen/nemotron-3-super-free': { name: 'Nemotron 3 Super Free', provider: 'nvidia', tags: ['zen'], speed: 'fast' },
  } : {}),
  ...(ARLIAI_API_KEY ? {
    'arliai/qwen-3.5-27b': { name: 'Qwen 3.5 27B Derestricted', provider: 'arli-ai', tags: ['arli'], speed: 'fast' },
    'arliai/glm-4.7': { name: 'GLM 4.7', provider: 'z-ai', tags: ['arli'], speed: 'fast' },
    'arliai/gemma-4-31b': { name: 'Gemma 4 31B', provider: 'google', tags: ['arli'], speed: 'fast' },
    'arliai/mistral-medium-3.5': { name: 'Mistral Medium 3.5 128B', provider: 'mistralai', tags: ['arli'], speed: 'fast' },
  } : {}),
  ...(FREETHEAI_API_KEY ? {
    'freetheai/claude-opus-4.7': { name: 'Claude Opus 4.7', provider: 'anthropic', tags: ['freetheai'], speed: 'fast' },
    'freetheai/claude-4.6-sonnet': { name: 'Claude 4.6 Sonnet', provider: 'anthropic', tags: ['freetheai'], speed: 'fast' },
    'freetheai/claude-4.5-haiku': { name: 'Claude 4.5 Haiku', provider: 'anthropic', tags: ['freetheai'], speed: 'fast' },
    'freetheai/gemini-3.1-pro': { name: 'Gemini 3.1 Pro', provider: 'google', tags: ['freetheai'], speed: 'fast' },
    'freetheai/gemini-3-flash': { name: 'Gemini 3 Flash', provider: 'google', tags: ['freetheai'], speed: 'fast' },
    'freetheai/gpt-5.5': { name: 'GPT-5.5', provider: 'openai', tags: ['freetheai'], speed: 'fast' },
    'freetheai/gpt-5.1': { name: 'GPT-5.1', provider: 'openai', tags: ['freetheai'], speed: 'fast' },
    'freetheai/grok-4.1-fast': { name: 'Grok 4.1 Fast', provider: 'x-ai', tags: ['freetheai'], speed: 'fast' },
  } : {}),
  ...(MODAL_API_KEY ? {
    'modal/glm-5.1': { name: 'GLM 5.1 FP8 (745B)', provider: 'z-ai', tags: ['modal'], speed: 'slow' },
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
};

const WORKING_MODELS = {
  'google/gemma-2-2b-it': { name: 'Gemma 2 2B', tags: [], speed: 'fast' },
  'google/gemma-3-12b-it': { name: 'Gemma 3 12B', tags: [], speed: 'medium' },
  'google/gemma-3-4b-it': { name: 'Gemma 3 4B', tags: [], speed: 'fast' },
  'google/gemma-3n-e2b-it': { name: 'Gemma 3n E2B', tags: [], speed: 'fast' },
  'google/gemma-3n-e4b-it': { name: 'Gemma 3n E4B', tags: [], speed: 'fast' },
  'meta/llama-3.1-70b-instruct': { name: 'Llama 3.1 70B', tags: [], speed: 'fast' },
  'meta/llama-3.2-11b-vision-instruct': { name: 'Llama 3.2 11B Vision', tags: ['vision'], speed: 'fast' },
  'meta/llama-3.2-1b-instruct': { name: 'Llama 3.2 1B', tags: [], speed: 'fast' },
  'meta/llama-3.2-3b-instruct': { name: 'Llama 3.2 3B', tags: [], speed: 'fast' },
  'meta/llama-3.2-90b-vision-instruct': { name: 'Llama 3.2 90B Vision', tags: ['vision'], speed: 'fast' },
  'meta/llama-3.3-70b-instruct': { name: 'Llama 3.3 70B', tags: [], speed: 'fast' },
  'meta/llama-4-maverick-17b-128e-instruct': { name: 'Llama 4 Maverick 17B', tags: [], speed: 'fast' },
  'microsoft/phi-4-mini-instruct': { name: 'Phi-4 Mini', tags: [], speed: 'fast' },
  'mistralai/ministral-14b-instruct-2512': { name: 'Ministral 14B', tags: [], speed: 'fast' },
  'mistralai/mistral-large-3-675b-instruct-2512': { name: 'Mistral Large 3 675B', tags: [], speed: 'slow' },
  'mistralai/mistral-medium-3.5-128b': { name: 'Mistral Medium 3.5 128B', tags: [], speed: 'fast' },
  'mistralai/mistral-nemotron': { name: 'Mistral Nemotron', tags: [], speed: 'fast' },
  'mistralai/mistral-small-4-119b-2603': { name: 'Mistral Small 4 119B', tags: [], speed: 'fast' },
  'mistralai/mixtral-8x22b-instruct-v0.1': { name: 'Mixtral 8x22B', tags: [], speed: 'fast' },
  'mistralai/mixtral-8x7b-instruct-v0.1': { name: 'Mixtral 8x7B', tags: [], speed: 'fast' },
  'nvidia/llama-3.1-nemotron-nano-8b-v1': { name: 'Nemotron Nano 8B', tags: [], speed: 'fast' },
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': { name: 'Nemotron Nano VL 8B', tags: ['vision'], speed: 'fast' },
  'nvidia/llama-3.3-nemotron-super-49b-v1': { name: 'Nemotron Super 49B', tags: [], speed: 'fast' },
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': { name: 'Nemotron Super 49B v1.5', tags: [], speed: 'fast' },
  'nvidia/nemotron-3-nano-30b-a3b': { name: 'Nemotron 3 Nano 30B', tags: [], speed: 'fast' },
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning': { name: 'Nemotron 3 Nano Omni 30B', tags: ['vision', 'reasoning'], speed: 'fast' },
  'nvidia/nemotron-3-super-120b-a12b': { name: 'Nemotron 3 Super 120B', tags: [], speed: 'medium' },
  'nvidia/nemotron-mini-4b-instruct': { name: 'Nemotron Mini 4B', tags: [], speed: 'fast' },
  'nvidia/nemotron-nano-12b-v2-vl': { name: 'Nemotron Nano 12B VL', tags: ['vision'], speed: 'fast' },
  'nvidia/nvidia-nemotron-nano-9b-v2': { name: 'Nemotron Nano 9B', tags: [], speed: 'fast' },
  'openai/gpt-oss-120b': { name: 'GPT-OSS 120B', tags: [], speed: 'fast' },
  'openai/gpt-oss-20b': { name: 'GPT-OSS 20B', tags: [], speed: 'fast' },
  'qwen/qwen3-coder-480b-a35b-instruct': { name: 'Qwen3 Coder 480B', tags: ['coding'], speed: 'fast' },
  'qwen/qwen3-next-80b-a3b-instruct': { name: 'Qwen3 Next 80B', tags: [], speed: 'fast' },
  'qwen/qwen3-next-80b-a3b-thinking': { name: 'Qwen3 Next 80B Thinking', tags: ['reasoning'], speed: 'fast' },
  'qwen/qwen3.5-122b-a10b': { name: 'Qwen3.5 122B', tags: [], speed: 'fast' },
  'qwen/qwen3.5-397b-a17b': { name: 'Qwen3.5 397B', tags: [], speed: 'medium' },
  'sarvamai/sarvam-m': { name: 'Sarvam-M', tags: [], speed: 'fast' },
  'stepfun-ai/step-3.5-flash': { name: 'Step 3.5 Flash', tags: [], speed: 'fast' },
  'stockmark/stockmark-2-100b-instruct': { name: 'Stockmark 2 100B', tags: [], speed: 'fast' },
  'upstage/solar-10.7b-instruct': { name: 'Solar 10.7B', tags: [], speed: 'fast' },
  'z-ai/glm-5.1': { name: 'GLM 5.1', tags: [], speed: 'slow' },
  'z-ai/glm5': { name: 'GLM 5', tags: [], speed: 'slow' },
  'deepseek-ai/deepseek-v4-flash': { name: 'DeepSeek V4 Flash', tags: [], speed: 'slow' },
  'deepseek-ai/deepseek-v4-pro': { name: 'DeepSeek V4 Pro', tags: [], speed: 'slow' },
  'google/gemma-4-31b-it': { name: 'Gemma 4 31B', tags: [], speed: 'slow' },
  'minimaxai/minimax-m2.7': { name: 'MiniMax M2.7', tags: [], speed: 'slow' },
  'moonshotai/kimi-k2.6': { name: 'Kimi K2.6', tags: [], speed: 'slow' },
  'meta/llama-3.1-8b-instruct': { name: 'Llama 3.1 8B', tags: [], speed: 'slow' },
};

function buildModelList() {
  const models = [];
  const seen = new Set();

  for (const [id, info] of Object.entries(WORKING_MODELS)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const parts = id.split('/');
    models.push({
      id, provider: parts[0], name: info.name || parts.slice(1).join('/') || id,
      owned_by: parts[0], context_length: null,
      tags: info.tags || [], speed: info.speed || 'fast',
    });
  }

  for (const [id, info] of Object.entries(EXTERNAL_MODELS)) {
    if (seen.has(id)) continue;
    seen.add(id);
    models.push({
      id, provider: info.provider, name: info.name,
      owned_by: id.split('/')[0], context_length: null,
      tags: info.tags || [], speed: info.speed || 'fast',
    });
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
